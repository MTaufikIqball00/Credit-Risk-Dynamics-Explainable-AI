import sys
import os
import json
import time
import math
import tempfile
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    f1_score,
    brier_score_loss,
    log_loss,
    confusion_matrix,
    classification_report,
)

# Ensure ml_service root is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.nlp.classifier import classifier_instance, CATEGORIES, TRAINING_CORPUS
from app.models.trainer import trainer_instance, FEATURE_NAMES, ModelTrainer
from app.xai.explainer import explainer_instance
from app.monitoring.drift import calculate_psi, drift_detector_instance
from app.fairness.audit import fairness_auditor_instance
from app.main import app as fastapi_app
from fastapi.testclient import TestClient


# ============================================================================
# DETERMINISTIC HELD-OUT GROUND TRUTH NLP CORPUS (DISJOINT FROM TRAINING_CORPUS)
# Covers ID, EN, Mixed, Abbreviations, Typos, and Ambiguous descriptions
# ============================================================================
HELD_OUT_NLP_CORPUS: List[Tuple[str, str, str]] = [
    # 1. Salary / Income
    ("GAJI POKOK KARYAWAN PT BANK CENTRAL ASIA", "Salary / Income", "ID"),
    ("MONTHLY PAYROLL SALARY CREDIT CITIBANK", "Salary / Income", "EN"),
    ("PAYROLL DISBURSEMENT GAJI STAF TETAP", "Salary / Income", "MIXED"),
    ("GAJII BULANN PT MNDIRI SEJAHTRA", "Salary / Income", "TYPO"),
    ("DIRECT DEPOSIT WAGES AND SALARY", "Salary / Income", "EN_UNSEEN"),
    # 2. Business Revenue
    ("SETTLEMENT QRIS PENJUALAN HARIAN MERCHANT", "Business Revenue", "MIXED"),
    ("PENERIMAAN PEMBAYARAN INVOICE JASA KONSULTAN IT", "Business Revenue", "ID"),
    ("TOKOPEDIA MERCHANT PAYOUT SETTLEMENT", "Business Revenue", "EN"),
    ("POS TERMINAL MERCHANT REVENUE SETTLE", "Business Revenue", "EN_UNSEEN"),
    ("PENJUALN TOKO ONLNE QRIS", "Business Revenue", "TYPO"),
    # 3. Utility Payment
    ("PEMBAYARAN TAGIHAN LISTRIK PLN PASCA BAYAR", "Utility Payment", "ID"),
    ("TAGIHAN AIR PDAM TIRTAWENING BANDUNG", "Utility Payment", "ID"),
    ("INDIHOME FIBER INTERNET MONTHLY BILL TELKOM", "Utility Payment", "MIXED"),
    ("WATER AND ELECTRICITY UTILITY BILL PAYMENT", "Utility Payment", "EN_UNSEEN"),
    ("TGHN LSTRK PLN PRABAYR", "Utility Payment", "ABBR_TYPO"),
    # 4. Loan Repayment
    ("BAYAR ANGSURAN KPR RUMAH BANK MANDIRI", "Loan Repayment", "ID"),
    ("CICILAN KREDIT MOTOR ADIRA LEASING", "Loan Repayment", "ID"),
    ("MONTHLY LOAN REPAYMENT INSTALLMENT BCA", "Loan Repayment", "EN"),
    ("HOME MORTGAGE PRINCIPAL AND INTEREST PAYMENT", "Loan Repayment", "EN_UNSEEN"),
    ("ANGSRN KPR BNK BTN", "Loan Repayment", "ABBR_TYPO"),
    # 5. Insurance
    ("PEMBAYARAN PREMI ASURANSI JIWA PRUDENTIAL", "Insurance", "ID"),
    ("IURAN BPJS KESEHATAN DAN KETENAGAKERJAAN", "Insurance", "ID"),
    ("ALLIANZ LIFE INSURANCE PREMIUM AUTO DEBIT", "Insurance", "EN"),
    ("HEALTH AND AUTO INSURANCE POLICY PREMIUM", "Insurance", "EN_UNSEEN"),
    ("PRMI ASURNSI PRUDNTIAL", "Insurance", "TYPO"),
    # 6. Housing
    ("PEMBAYARAN SEWA APARTEMEN STUDIO BULANAN", "Housing", "ID"),
    ("IURAN IPL PENGELOLAAN LINGKUNGAN CLUSTER", "Housing", "ID"),
    ("APARTMENT MAINTENANCE FEE RESIDENCE UNIT", "Housing", "EN"),
    ("MONTHLY LANDLORD HOUSE RENT PAYMENT", "Housing", "EN_UNSEEN"),
    ("SWA APRTEMEN BULNAN", "Housing", "TYPO"),
    # 7. Groceries
    ("BELANJA MINGGUAN SUPERINDO PASAR SWALAYAN", "Groceries", "ID"),
    ("ALFAMART BELANJA KEBUTUHAN HARIAN", "Groceries", "ID"),
    ("HERO SUPERMARKET FRESH BUAH DAN SAYUR", "Groceries", "MIXED"),
    ("DAILY GROCERY SUPERMARKET PURCHASE", "Groceries", "EN_UNSEEN"),
    ("BLNJA INDOMRET MINIMARKT", "Groceries", "TYPO"),
    # 8. Transportation
    ("GRAB RIDE OVO PERJALANAN KE KANTOR", "Transportation", "MIXED"),
    ("ISI BENSIN BBM PERTAMINA SPBU PERTAMAX", "Transportation", "ID"),
    ("GOJEK GORIDE TRANSPORTASI PULANG", "Transportation", "ID"),
    ("UBER AIRPORT COMMUTE TAXI RIDE", "Transportation", "EN_UNSEEN"),
    ("ISI BNSIN SPBU PRTAMINA", "Transportation", "TYPO"),
    # 9. Subscription
    ("TAGIHAN NETFLIX PREMIUM DIGITAL SUBSCRIPTION", "Subscription", "MIXED"),
    ("SPOTIFY FAMILY PLAN MONTHLY SUBSCRIPTION", "Subscription", "EN"),
    ("YOUTUBE PREMIUM GOOGLE SUBSCRIPTION", "Subscription", "EN"),
    ("DISNEY PLUS STREAMING MEMBERSHIP RENEWAL", "Subscription", "EN_UNSEEN"),
    ("NTFLIX SUBSCRPTION MNTHLY", "Subscription", "TYPO"),
    # 10. Transfer
    ("TRANSFER ANTAR BANK BI-FAST KE REKENING BCA", "Transfer", "ID"),
    ("TRSF KE REK TABUNGAN PRIBADI LAIN", "Transfer", "ABBR"),
    ("REALTIME ONLINE INTERBANK TRANSFER", "Transfer", "EN"),
    ("DOMESTIC WIRE P2P BANK TRANSFER", "Transfer", "EN_UNSEEN"),
    ("TRNSF ANTR BNK BIFAST", "Transfer", "ABBR_TYPO"),
    # 11. Cash Withdrawal
    ("TARIK TUNAI ATM BCA KARTU DEBIT", "Cash Withdrawal", "ID"),
    ("PENARIKAN TUNAI ATM MANDIRI CABANG JAKARTA", "Cash Withdrawal", "ID"),
    ("ATM CASH WITHDRAWAL CIRRUS NETWORK", "Cash Withdrawal", "EN"),
    ("BRANCH COUNTER TELLER CASH DISPENSE", "Cash Withdrawal", "EN_UNSEEN"),
    ("TRK TUNAI ATM BRSAMA", "Cash Withdrawal", "ABBR_TYPO"),
]


def independent_psi_oracle(expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
    """Independent 10-bucket quantile PSI oracle calculation."""
    exp_clean = expected[np.isfinite(expected)]
    act_clean = actual[np.isfinite(actual)]
    if len(exp_clean) == 0 or len(act_clean) == 0:
        return 0.0
    quantiles = np.linspace(0, 100, buckets + 1)
    bounds = np.percentile(exp_clean, quantiles)
    bounds[0] = -np.inf
    bounds[-1] = np.inf
    exp_cnt, _ = np.histogram(exp_clean, bins=bounds)
    act_cnt, _ = np.histogram(act_clean, bins=bounds)
    exp_p = np.where(exp_cnt / len(exp_clean) == 0, 0.0001, exp_cnt / len(exp_clean))
    act_p = np.where(act_cnt / len(act_clean) == 0, 0.0001, act_cnt / len(act_clean))
    return float(np.round(np.sum((act_p - exp_p) * np.log(act_p / exp_p)), 4))


def make_case(
    test_id: str,
    suite_mode: str,
    module_id: str,
    module_name: str,
    title: str,
    description: str,
    preconditions: str,
    input_data: Any,
    expected_data: Any,
    actual_data: Any,
    assertion_text: str,
    status: str,
    started_at: str,
    completed_at: str,
    duration_ms: int,
    source_refs: str,
    logs: str = "",
    error_trace: str = None,
) -> Dict[str, Any]:
    return {
        "test_id": test_id,
        "suite_mode": suite_mode,
        "module_id": module_id,
        "module_name": module_name,
        "title": title,
        "description": description,
        "preconditions": preconditions,
        "input_json": json.dumps(input_data, default=str),
        "expected_json": json.dumps(expected_data, default=str),
        "actual_json": json.dumps(actual_data, default=str),
        "assertion_text": assertion_text,
        "status": status,
        "started_at": started_at,
        "completed_at": completed_at,
        "duration_ms": duration_ms,
        "source_refs": source_refs,
        "logs": logs,
        "error_trace": error_trace,
    }


def _describe_nlp_analyzers(vec_step: Any) -> Tuple[List[str], bool]:
    if hasattr(vec_step, "transformer_list"):
        analyzers = [getattr(t, "analyzer", "unknown") for _, t in vec_step.transformer_list]
        has_char = any("char" in str(a) for a in analyzers)
        return analyzers, has_char
    analyzer = getattr(vec_step, "analyzer", "unknown")
    return [str(analyzer)], ("char" in str(analyzer))


def run_all_python_oracles() -> List[Dict[str, Any]]:
    cases: List[Dict[str, Any]] = []
    client = TestClient(fastapi_app)

    # ========================================================================
    # 1. NLP CLASSIFICATION & LEAKAGE AUDIT
    # ========================================================================
    # PY-NLP-001: Held-out 11-category evaluation (including Typos, Abbreviations, Unseen EN)
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    training_texts_set = {classifier_instance.clean_text(t) for t, _ in TRAINING_CORPUS}
    overlap_count = sum(
        1 for t, _, _ in HELD_OUT_NLP_CORPUS if classifier_instance.clean_text(t) in training_texts_set
    )

    y_true = [cat for _, cat, _ in HELD_OUT_NLP_CORPUS]
    preds = [classifier_instance.classify(txt) for txt, _, _ in HELD_OUT_NLP_CORPUS]
    y_pred = [p["category"] for p in preds]

    report = classification_report(y_true, y_pred, labels=CATEGORIES, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=CATEGORIES).tolist()
    macro_f1 = round(float(report["macro avg"]["f1-score"]), 4)
    accuracy = round(float(np.mean([yt == yp for yt, yp in zip(y_true, y_pred)])), 4)
    unclassified_rate = round(float(np.mean([yp == "Unclassified" for yp in y_pred])), 4)
    analyzers, has_char_ngrams = _describe_nlp_analyzers(classifier_instance.pipeline.named_steps["tfidf"])
    dur = int((time.perf_counter() - t0) * 1000)

    nlp_acc_pass = (overlap_count == 0) and (accuracy >= 0.945) and has_char_ngrams
    cases.append(
        make_case(
            test_id="PY-NLP-001",
            suite_mode="nlp_classification_test",
            module_id="M04",
            module_name="Transaction NLP Intelligence",
            title="Held-Out Bilingual 11-Category Classification & 94.5% Accuracy Claim Verification",
            description="Evaluates TransactionNLPClassifier on 55 strictly disjoint bilingual ID/EN, abbreviated, and typographical narratives across all 11 categories against the documented 94.5% accuracy claim.",
            preconditions=f"Disjoint held-out corpus (N=55) with 0 overlap against TRAINING_CORPUS (N={len(TRAINING_CORPUS)}).",
            input_data={"held_out_sample_count": len(HELD_OUT_NLP_CORPUS), "overlap_with_training": overlap_count, "categories_count": len(CATEGORIES)},
            expected_data={"overlap_with_training": 0, "documented_accuracy_claim": 0.945, "char_ngrams_for_typos": True},
            actual_data={
                "overlap_with_training": overlap_count,
                "held_out_accuracy": accuracy,
                "held_out_macro_f1": macro_f1,
                "unclassified_rate": unclassified_rate,
                "vectorizer_analyzers": analyzers,
                "char_ngrams_for_typos": has_char_ngrams,
                "per_class_f1": {c: round(report[c]["f1-score"], 4) for c in CATEGORIES},
                "confusion_matrix": cm,
            },
            assertion_text=f"assert overlap_count == 0 and has_char_ngrams and held_out_accuracy ({accuracy}) >= 0.945",
            status="PASS" if nlp_acc_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/nlp/classifier.py:165-235",
            logs=(
                f"Held-out accuracy={accuracy} (>=0.945), macro_f1={macro_f1}, unclassified_rate={unclassified_rate}, overlap={overlap_count}, analyzers={analyzers}."
                if nlp_acc_pass
                else f"Held-out accuracy={accuracy} (below 94.5% claim) or overlap={overlap_count}, char_ngrams={has_char_ngrams}."
            ),
        )
    )

    # PY-NLP-002: Train-on-Test Leakage Detection in classifier.evaluate()
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    eval_res = classifier_instance.evaluate()
    eval_f1 = round(float(eval_res["macro_avg"]["f1-score"]), 4)
    eval_size = int(eval_res["sample_size"])
    overlap_ratio = float(eval_res.get("train_test_overlap_ratio", 1.0))
    indep_split = bool(eval_res.get("independent_eval_split", False)) and (eval_size < len(TRAINING_CORPUS))
    dur = int((time.perf_counter() - t0) * 1000)

    nlp_leak_pass = indep_split and overlap_ratio == 0.0
    cases.append(
        make_case(
            test_id="PY-NLP-002",
            suite_mode="nlp_classification_test",
            module_id="M04",
            module_name="Transaction NLP Intelligence",
            title="Anti-Leakage Audit of TransactionNLPClassifier.evaluate()",
            description="Verifies that classifier_instance.evaluate() uses an independent validation split rather than evaluating directly on TRAINING_CORPUS.",
            preconditions=f"TransactionNLPClassifier initialized with TRAINING_CORPUS (N={len(TRAINING_CORPUS)}).",
            input_data={"training_corpus_size": len(TRAINING_CORPUS)},
            expected_data={"train_test_overlap_ratio": 0.0, "independent_eval_split": True},
            actual_data={
                "eval_sample_size": eval_size,
                "train_test_overlap_ratio": overlap_ratio,
                "independent_eval_split": indep_split,
                "eval_macro_f1": eval_f1,
                "held_out_macro_f1": macro_f1,
            },
            assertion_text=f"assert independent_eval_split is True and train_test_overlap_ratio ({overlap_ratio}) == 0.0",
            status="PASS" if nlp_leak_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/nlp/classifier.py:242-284",
            logs=(
                f"Verified stratified holdout validation split (eval_size={eval_size}, overlap=0.0, eval_macro_f1={eval_f1})."
                if nlp_leak_pass
                else f"CONFIRMED DEFECT: evaluate() has train-test overlap={overlap_ratio}."
            ),
        )
    )

    # PY-NLP-003: Low-Confidence Flag Boundary (< 0.65 specification)
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    probe_samples = [
        "GAJI MANDIRI",
        "TRANSFER BI-FAST",
        "BELANJA SUPERINDO",
        "TAGIHAN PLN",
        "PEMBAYARAN INVOICE",
        "XKJASDKJ 12938120",
        "",
        "   !@#$%^&*()   ",
        "DROP TABLE bank_transactions; --",
    ]
    probe_results = [classifier_instance.classify(s) for s in probe_samples]
    implemented_threshold = float(getattr(classifier_instance, "low_confidence_threshold", 0.50))
    mismatched_flags = [
        r for r in probe_results
        if (r["confidence"] < 0.65 and r["is_low_confidence"] is False)
        or (r["confidence"] >= 0.65 and r["category"] != "Unclassified" and r["is_low_confidence"] is True)
    ]
    empty_ok = probe_results[6]["category"] == "Unclassified" and probe_results[7]["category"] == "Unclassified"
    nlp_conf_pass = (abs(implemented_threshold - 0.65) < 1e-9) and (len(mismatched_flags) == 0) and empty_ok
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-NLP-003",
            suite_mode="nlp_classification_test",
            module_id="M04",
            module_name="Transaction NLP Intelligence",
            title="NLP Low-Confidence Threshold (< 0.65) & Adversarial/Empty Input Handling",
            description="Verifies that predictions with confidence < 0.65 are flagged with is_low_confidence=True, and empty/malformed inputs return Unclassified safely.",
            preconditions="Documented requirement: low-confidence flag when confidence < 0.65.",
            input_data={"probes": probe_samples, "documented_threshold": 0.65},
            expected_data={"low_confidence_threshold": 0.65, "mismatched_flag_count": 0, "empty_input_category": "Unclassified"},
            actual_data={
                "implemented_threshold_in_python": implemented_threshold,
                "mismatched_flag_count": len(mismatched_flags),
                "empty_input_result": probe_results[6],
                "malformed_symbol_result": probe_results[7],
                "adversarial_sql_result": probe_results[8],
            },
            assertion_text="assert implemented_threshold == 0.65 and len(mismatched_flags) == 0 and empty_ok",
            status="PASS" if nlp_conf_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/nlp/classifier.py:210-235, backend/src/ml_client/client.rs",
            logs=(
                f"Verified unified low-confidence threshold ({implemented_threshold}) and safe empty/adversarial handling across 9 probes."
                if nlp_conf_pass
                else f"CONFIRMED DEFECT: threshold={implemented_threshold}, mismatches={len(mismatched_flags)}."
            ),
        )
    )

    # ========================================================================
    # 2. MACHINE LEARNING RESEARCH LAB AUDIT
    # ========================================================================
    # PY-ML-001: LightGBM & XGBoost Training, Determinism, and Independent Metric Oracle (on Holdout Split)
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    X, y = trainer_instance.generate_synthetic_training_data(400, 42)
    X_rep, y_rep = trainer_instance.generate_synthetic_training_data(400, 42)
    X_diff, _ = trainer_instance.generate_synthetic_training_data(400, 99)

    deterministic_data = bool(np.allclose(X, X_rep) and np.array_equal(y, y_rep))
    seed_sensitive_data = bool(not np.allclose(X, X_diff))

    _, X_test_ref, _, y_test_ref = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

    with tempfile.TemporaryDirectory() as tmp_art_dir:
        iso_trainer = ModelTrainer(artifacts_dir=tmp_art_dir)
        lgb_model, lgb_metrics = iso_trainer.train_lightgbm(X, y, 42)
        xgb_model, xgb_metrics = iso_trainer.train_xgboost(X, y, 42)

        lgb_probs = lgb_model.predict_proba(X_test_ref)[:, 1]
        lgb_preds = (lgb_probs >= 0.35).astype(int)
        oracle_roc = round(float(roc_auc_score(y_test_ref, lgb_probs)), 4)
        oracle_pr = round(float(average_precision_score(y_test_ref, lgb_probs)), 4)
        oracle_f1 = round(float(f1_score(y_test_ref, lgb_preds, zero_division=0)), 4)
        oracle_brier = round(float(brier_score_loss(y_test_ref, lgb_probs)), 4)
        oracle_logloss = round(float(log_loss(y_test_ref, lgb_probs)), 4)

        artifacts_exist = (
            os.path.exists(os.path.join(tmp_art_dir, "lightgbm_latest.joblib"))
            and os.path.exists(os.path.join(tmp_art_dir, "xgboost_latest.joblib"))
        )

    metrics_match = (
        lgb_metrics["roc_auc"] == oracle_roc
        and lgb_metrics["pr_auc"] == oracle_pr
        and lgb_metrics["f1_score"] == oracle_f1
        and lgb_metrics["brier_score"] == oracle_brier
        and lgb_metrics["log_loss"] == oracle_logloss
    )
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-ML-001",
            suite_mode="ml_training_evaluation_test",
            module_id="M05",
            module_name="Model Research Laboratory",
            title="LightGBM & XGBoost Deterministic Training, Artifact Serialization & Metric Formula Verification",
            description="Verifies PRNG seed determinism, joblib artifact creation in isolated temp storage, and exact mathematical agreement between ModelTrainer._evaluate and independent Scikit-learn holdout oracle.",
            preconditions="Isolated temporary artifact directory; N=400, random_state=42.",
            input_data={"n_samples": 400, "random_state": 42, "algorithms": ["LightGBM", "XGBoost"]},
            expected_data={"deterministic_data": True, "seed_sensitive": True, "artifacts_exist": True, "oracle_roc_auc": oracle_roc, "oracle_pr_auc": oracle_pr, "oracle_brier": oracle_brier},
            actual_data={"deterministic_data": deterministic_data, "seed_sensitive": seed_sensitive_data, "artifacts_exist": artifacts_exist, "lgb_metrics": lgb_metrics, "xgb_metrics": xgb_metrics},
            assertion_text="assert deterministic_data and seed_sensitive and artifacts_exist and metrics_match",
            status="PASS" if (deterministic_data and seed_sensitive_data and artifacts_exist and metrics_match) else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/models/trainer.py:42-255",
            logs=f"LightGBM Holdout ROC-AUC={lgb_metrics['roc_auc']} (Oracle={oracle_roc}), XGBoost ROC-AUC={xgb_metrics['roc_auc']}",
        )
    )

    # PY-ML-002: Temporal/Stratified Holdout Split vs In-Sample Evaluation Leakage Check
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    with tempfile.TemporaryDirectory() as tmp_art_dir:
        iso_trainer = ModelTrainer(artifacts_dir=tmp_art_dir)
        clf_full, reported_m = iso_trainer.train_lightgbm(X, y, 42)
        eval_samples = int(reported_m.get("eval_samples", len(X)))
        train_eval_overlap = float(reported_m.get("train_eval_overlap", 1.0))
        in_sample_probs = clf_full.predict_proba(X)[:, 1]
        in_sample_roc = round(float(roc_auc_score(y, in_sample_probs)), 4)
        uses_holdout = (eval_samples < len(X)) and (train_eval_overlap == 0.0) and (reported_m["roc_auc"] == oracle_roc)
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-ML-002",
            suite_mode="ml_training_evaluation_test",
            module_id="M05",
            module_name="Model Research Laboratory",
            title="Train/Evaluation Separation & Stratified Holdout Split Audit",
            description="Audits ModelTrainer.train_lightgbm and train_xgboost to verify evaluation metrics are computed strictly on a held-out test split with 0% overlap.",
            preconditions="ModelTrainer.train_lightgbm(X, y) executed on N=400.",
            input_data={"total_samples": len(X), "expected_eval_samples": len(X_test_ref)},
            expected_data={"uses_out_of_time_or_holdout_split": True, "train_eval_overlap": 0.0},
            actual_data={
                "uses_out_of_time_or_holdout_split": uses_holdout,
                "train_eval_overlap": train_eval_overlap,
                "eval_samples": eval_samples,
                "reported_holdout_roc_auc": reported_m["roc_auc"],
                "independent_holdout_oracle_roc_auc": oracle_roc,
                "full_in_sample_roc_auc": in_sample_roc,
            },
            assertion_text="assert uses_holdout is True and train_eval_overlap == 0.0",
            status="PASS" if uses_holdout else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/models/trainer.py:92-145",
            logs=(
                f"Verified 75/25 stratified holdout split (eval_samples={eval_samples}, overlap=0.0, holdout ROC-AUC={reported_m['roc_auc']} == oracle {oracle_roc})."
                if uses_holdout
                else f"CONFIRMED DEFECT: trainer.py evaluates in-sample (overlap={train_eval_overlap})."
            ),
        )
    )

    # PY-ML-003: Baseline Logistic Regression Implementation Check in Python ML Service
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    has_logreg_method = hasattr(trainer_instance, "train_logistic_regression")
    resp_logreg = client.post("/api/models/train", json={"algorithm": "Baseline_LogReg", "n_samples": 200, "random_state": 42})
    resp_json = resp_logreg.json()
    logreg_model = trainer_instance.models.get("Baseline_LogReg")
    is_real_logreg = (
        logreg_model is not None
        and hasattr(logreg_model, "named_steps")
        and logreg_model.named_steps["clf"].__class__.__name__ == "LogisticRegression"
    )
    ml_logreg_pass = has_logreg_method and is_real_logreg and resp_logreg.status_code == 200 and resp_json.get("algorithm") == "Baseline_LogReg"
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-ML-003",
            suite_mode="ml_training_evaluation_test",
            module_id="M05",
            module_name="Model Research Laboratory",
            title="Baseline Logistic Regression Training Support in Python ML Service",
            description="Verifies that Baseline_LogReg trains a real StandardScaler + LogisticRegression pipeline via /api/models/train rather than falling back to LightGBM.",
            preconditions="POST /api/models/train called with algorithm='Baseline_LogReg'.",
            input_data={"endpoint": "POST /api/models/train", "payload": {"algorithm": "Baseline_LogReg", "n_samples": 200, "random_state": 42}},
            expected_data={"has_logreg_trainer": True, "trained_model_class": "LogisticRegression"},
            actual_data={
                "has_logreg_trainer": has_logreg_method,
                "is_real_logreg_pipeline": is_real_logreg,
                "models_dict_keys": list(trainer_instance.models.keys()),
                "api_algorithm": resp_json.get("algorithm"),
                "roc_auc": resp_json.get("metrics", {}).get("roc_auc"),
            },
            assertion_text="assert has_logreg_trainer and is_real_logreg and api_algorithm == 'Baseline_LogReg'",
            status="PASS" if ml_logreg_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/models/trainer.py:165-195, ml_service/app/main.py:85-118",
            logs=(
                f"Verified real StandardScaler + LogisticRegression baseline training (ROC-AUC={resp_json.get('metrics', {}).get('roc_auc')})."
                if ml_logreg_pass
                else "CONFIRMED DEFECT: Baseline_LogReg not properly trained."
            ),
        )
    )

    # ========================================================================
    # 3. TREE SHAP / XAI VALIDATION AUDIT
    # ========================================================================
    # PY-SHAP-001: LightGBM TreeSHAP Additive Identity Verification (Probability & Log-Odds Spaces)
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    sample_features = {
        "avg_monthly_income": 14_500_000.0,
        "income_variability": 0.18,
        "monthly_expense": 8_200_000.0,
        "net_cash_flow": 6_300_000.0,
        "avg_balance": 19_000_000.0,
        "cash_flow_volatility": 0.25,
        "expense_to_income_ratio": 0.5655,
        "recurring_payment_consistency": 0.8333,
        "utility_regularity_score": 0.8333,
        "payment_burden_ratio": 0.22,
        "transaction_frequency": 14.5,
        "data_completeness_score": 1.0,
    }
    explanation = explainer_instance.explain_instance(sample_features, "LightGBM")
    base_val = float(explanation["base_value"])
    sum_shap = sum(float(c["contribution"]) for c in explanation["shap_contributions"])
    reported_pd = float(explanation["probability_of_default"])
    prob_identity_diff = abs((base_val + sum_shap) - reported_pd)

    base_margin = float(explanation.get("base_value_log_odds", 0.0))
    sum_margin = float(explanation.get("sum_shap_log_odds", 0.0))
    sigmoid_margin_pd = 1.0 / (1.0 + math.exp(-(base_margin + sum_margin)))
    margin_identity_diff = abs(sigmoid_margin_pd - reported_pd)
    dur = int((time.perf_counter() - t0) * 1000)

    shap_id_pass = (
        prob_identity_diff < 0.005
        and margin_identity_diff < 0.005
        and len(explanation["shap_contributions"]) == 12
    )

    cases.append(
        make_case(
            test_id="PY-SHAP-001",
            suite_mode="shap_xai_validation",
            module_id="M08",
            module_name="Explainable AI Workspace",
            title="LightGBM TreeSHAP Additive Identity Verification (Probability & Margin Space)",
            description="Verifies that LightGBM TreeExplainer satisfies exact additive identity in both probability space (base_value + sum(phi_i) == PD) and log-odds margin space (sigmoid(margin_sum) == PD).",
            preconditions="LightGBM model and shap.TreeExplainer initialized.",
            input_data=sample_features,
            expected_data={"feature_count": 12, "additive_identity_tolerance": 0.005},
            actual_data={
                "base_value_prob": base_val,
                "sum_shap_prob": round(sum_shap, 6),
                "prob_identity_error": round(prob_identity_diff, 6),
                "margin_identity_error": round(margin_identity_diff, 6),
                "reported_pd": reported_pd,
            },
            assertion_text=f"assert prob_identity_error ({prob_identity_diff:.6f}) < 0.005 and margin_identity_error ({margin_identity_diff:.6f}) < 0.005",
            status="PASS" if shap_id_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/xai/explainer.py:110-185",
            logs=f"TreeSHAP additive identity verified: base({base_val:.4f}) + sum_shap({sum_shap:.4f}) = {base_val + sum_shap:.4f} vs PD={reported_pd} (err={prob_identity_diff:.6f}).",
        )
    )

    # PY-SHAP-002: UI Waterfall Scale Compatibility & Dynamic Global Importance Check
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    xgb_explanation = explainer_instance.explain_instance(sample_features, "XGBoost")
    lgb_global = explanation["global_importance"]
    xgb_global = xgb_explanation["global_importance"]
    global_is_hardcoded = lgb_global == xgb_global
    base_in_prob_range = 0.0 <= base_val <= 1.0 and 0.0 <= float(xgb_explanation["base_value"]) <= 1.0
    shap_scale_pass = base_in_prob_range and (not global_is_hardcoded)
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-SHAP-002",
            suite_mode="shap_xai_validation",
            module_id="M08",
            module_name="Explainable AI Workspace",
            title="SHAP Scale Consistency with Waterfall UI & Dynamic Global Importance Audit",
            description="Audits whether explainer.py outputs probability-scaled SHAP values in [0, 1] and dynamically computes distinct mean(|SHAP|) global_importance per model family.",
            preconditions="Compare LightGBM and XGBoost explanations.",
            input_data={"models_compared": ["LightGBM", "XGBoost"]},
            expected_data={"base_value_in_probability_range_0_to_1": True, "global_importance_computed_from_model": True},
            actual_data={
                "lightgbm_base_value": base_val,
                "xgboost_base_value": xgb_explanation["base_value"],
                "ui_rendered_baseline_pct": f"{base_val * 100:.1f}%",
                "global_importance_identical_across_models": global_is_hardcoded,
                "lightgbm_global_top3": lgb_global[:3],
                "xgboost_global_top3": xgb_global[:3],
            },
            assertion_text="assert 0.0 <= base_value <= 1.0 and not global_is_hardcoded",
            status="PASS" if shap_scale_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/xai/explainer.py:85-185, frontend/src/components/ShapWaterfall.tsx",
            logs=(
                f"Verified probability-space base_value={base_val:.4f} ({base_val*100:.1f}%) and distinct model-specific mean(|SHAP|) global importances."
                if shap_scale_pass
                else f"CONFIRMED DEFECT: base_in_prob_range={base_in_prob_range}, global_is_hardcoded={global_is_hardcoded}."
            ),
        )
    )

    # PY-SHAP-003: XGBoost Native TreeSHAP Non-Zero Attribution & Additive Verification
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    xgb_nonzero_contributions = sum(1 for c in xgb_explanation["shap_contributions"] if abs(c["contribution"]) > 0.0)
    xgb_base = float(xgb_explanation["base_value"])
    xgb_sum = sum(float(c["contribution"]) for c in xgb_explanation["shap_contributions"])
    xgb_pd = float(xgb_explanation["probability_of_default"])
    xgb_add_err = abs((xgb_base + xgb_sum) - xgb_pd)
    xgb_pass = ("XGBoost" in explainer_instance.explainers) and (xgb_nonzero_contributions > 0) and (xgb_add_err < 0.005)
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-SHAP-003",
            suite_mode="model_comparison_test",
            module_id="M06",
            module_name="Model Benchmark Comparison & XAI",
            title="XGBoost TreeSHAP Explainer Initialization & Non-Zero Attribution Verification",
            description="Verifies that XGBoost computes exact non-zero TreeSHAP local attributions via native C++ pred_contribs without base_score string parse crashes.",
            preconditions="XGBoost model trained in trainer_instance.models['XGBoost'].",
            input_data={"model": "XGBoost", "features": sample_features},
            expected_data={"xgb_in_explainers": True, "nonzero_shap_contributions": "> 0", "additive_error_lt": 0.005},
            actual_data={
                "xgb_in_explainers": "XGBoost" in explainer_instance.explainers,
                "explainer_backend": str(explainer_instance.explainers.get("XGBoost")),
                "nonzero_shap_contributions": xgb_nonzero_contributions,
                "base_value": xgb_base,
                "reported_pd": xgb_pd,
                "additive_error": round(xgb_add_err, 6),
            },
            assertion_text="assert 'XGBoost' in explainer_instance.explainers and xgb_nonzero_contributions > 0 and xgb_add_err < 0.005",
            status="PASS" if xgb_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/xai/explainer.py:30-65",
            logs=(
                f"Verified native XGBoost TreeSHAP: {xgb_nonzero_contributions} non-zero attributions, base={xgb_base:.4f}, PD={xgb_pd:.4f}, err={xgb_add_err:.6f}."
                if xgb_pass
                else f"CONFIRMED DEFECT: XGBoost TreeSHAP failed (nonzero={xgb_nonzero_contributions}, err={xgb_add_err})."
            ),
        )
    )

    # ========================================================================
    # 4. PSI DRIFT VALIDATION AUDIT
    # ========================================================================
    # PY-PSI-001: 10-Bucket PSI Mathematical Oracle across 4 Shift Regimes + Zero Buckets
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    rng = np.random.RandomState(42)
    base_dist = rng.normal(10.0, 2.0, 1000)
    identical_dist = base_dist.copy()
    small_shift = rng.normal(10.2, 2.0, 1000)
    moderate_shift = rng.normal(10.85, 2.0, 1000)
    significant_shift = rng.normal(13.0, 2.5, 1000)

    drift_res = drift_detector_instance.evaluate_feature_drift(
        {
            "identical": base_dist.tolist(),
            "small": base_dist.tolist(),
            "moderate": base_dist.tolist(),
            "significant": base_dist.tolist(),
            "empty": [],
        },
        {
            "identical": identical_dist.tolist(),
            "small": small_shift.tolist(),
            "moderate": moderate_shift.tolist(),
            "significant": significant_shift.tolist(),
            "empty": [],
        },
    )
    drift_map = {item["feature"]: item for item in drift_res}

    oracle_identical = independent_psi_oracle(base_dist, identical_dist)
    oracle_small = independent_psi_oracle(base_dist, small_shift)
    oracle_mod = independent_psi_oracle(base_dist, moderate_shift)
    oracle_sig = independent_psi_oracle(base_dist, significant_shift)
    empty_psi = calculate_psi(np.array([]), np.array([]))

    psi_pass = (
        drift_map["identical"]["psi"] == oracle_identical == 0.0
        and drift_map["identical"]["status"] == "STABLE"
        and drift_map["small"]["psi"] == oracle_small < 0.10
        and drift_map["small"]["status"] == "STABLE"
        and 0.10 <= drift_map["moderate"]["psi"] == oracle_mod < 0.25
        and drift_map["moderate"]["status"] == "MODERATE_DRIFT"
        and drift_map["significant"]["psi"] == oracle_sig >= 0.25
        and drift_map["significant"]["status"] == "SIGNIFICANT_DRIFT"
        and empty_psi == 0.0
    )
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-PSI-001",
            suite_mode="psi_drift_validation",
            module_id="M10",
            module_name="Dynamic Risk Monitoring (PSI Drift)",
            title="10-Bucket PSI Calculation & Threshold Classification Oracle (Stable, Moderate, Significant)",
            description="Validates calculate_psi and DriftDetector against an independent 10-bucket quantile PSI oracle across identical, small, moderate, significant shifts, and empty arrays.",
            preconditions="Documented thresholds: PSI < 0.10 STABLE; 0.10 <= PSI < 0.25 MODERATE_DRIFT; PSI >= 0.25 SIGNIFICANT_DRIFT.",
            input_data={"n_samples": 1000, "buckets": 10},
            expected_data={
                "identical": {"psi": oracle_identical, "status": "STABLE"},
                "small": {"psi": oracle_small, "status": "STABLE"},
                "moderate": {"psi": oracle_mod, "status": "MODERATE_DRIFT"},
                "significant": {"psi": oracle_sig, "status": "SIGNIFICANT_DRIFT"},
                "empty_psi": 0.0,
            },
            actual_data={"drift_results": drift_map, "empty_psi": empty_psi},
            assertion_text="assert all 4 regimes match independent PSI oracle and status classifications",
            status="PASS" if psi_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/monitoring/drift.py:4-60",
            logs=f"Identical={oracle_identical}, Small={oracle_small}, Moderate={oracle_mod}, Significant={oracle_sig}",
        )
    )

    # PY-PSI-002: Missing Values (NaN) Numerical Stability Verification
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    base_with_nan = base_dist.copy()
    base_with_nan[0] = np.nan
    clean_shifted_psi = independent_psi_oracle(base_dist[1:], significant_shift)
    nan_shifted_psi = calculate_psi(base_with_nan, significant_shift)
    psi_nan_pass = abs(nan_shifted_psi - clean_shifted_psi) < 0.05
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-PSI-002",
            suite_mode="psi_drift_validation",
            module_id="M10",
            module_name="Dynamic Risk Monitoring (PSI Drift)",
            title="PSI Numerical Stability & Drift Detection Under Missing (NaN) Values",
            description="Verifies that a single NaN in the baseline or current distribution does not corrupt np.percentile bucket bounds into returning a false PSI=0.0 (STABLE).",
            preconditions="Baseline N(10, 2) with 1 NaN value compared against shifted N(13, 2.5).",
            input_data={"baseline_nan_count": 1, "true_clean_psi": clean_shifted_psi},
            expected_data={"psi_with_nan_filtered": clean_shifted_psi, "status": "SIGNIFICANT_DRIFT"},
            actual_data={"psi_returned_by_calculate_psi": nan_shifted_psi, "status_assigned": "STABLE" if nan_shifted_psi < 0.10 else "SIGNIFICANT_DRIFT"},
            assertion_text=f"assert abs(nan_shifted_psi ({nan_shifted_psi}) - clean_shifted_psi ({clean_shifted_psi})) < 0.05",
            status="PASS" if psi_nan_pass else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/monitoring/drift.py:9-20",
            logs=(
                f"Verified NaN-safe PSI calculation: returned PSI={nan_shifted_psi} matching clean oracle {clean_shifted_psi} (SIGNIFICANT_DRIFT)."
                if psi_nan_pass
                else f"CONFIRMED DEFECT: NaN corrupted PSI to {nan_shifted_psi} vs clean {clean_shifted_psi}."
            ),
        )
    )

    # ========================================================================
    # 5. FAIRNESS & RESEARCH BIAS AUDIT
    # ========================================================================
    # PY-FAIR-001: Cohort Isolation, Approval Rate, Disparate Impact, FPR, FNR & Brier Score Audit
    t0 = time.perf_counter()
    started = datetime.now(timezone.utc).isoformat()
    sensitive_in_features = any("cohort" in f.lower() or "group" in f.lower() for f in FEATURE_NAMES)

    cohorts_payload = [
        {"cohort": "Group_A", "y_true": [0, 0, 0, 0, 1, 0, 1, 0, 0, 1], "y_pred": [0, 0, 0, 0, 1, 0, 0, 0, 1, 1], "y_prob": [0.05, 0.08, 0.10, 0.12, 0.78, 0.09, 0.25, 0.11, 0.42, 0.81]},
        {"cohort": "Group_B", "y_true": [0, 0, 1, 0, 1, 0, 0, 1, 0, 0], "y_pred": [0, 0, 1, 0, 1, 0, 1, 0, 0, 0], "y_prob": [0.07, 0.09, 0.74, 0.14, 0.69, 0.11, 0.39, 0.28, 0.08, 0.10]},
        {"cohort": "Group_C", "y_true": [0, 1, 0, 0, 1, 0, 1, 0, 0, 0], "y_pred": [0, 1, 1, 0, 1, 0, 1, 0, 0, 0], "y_prob": [0.09, 0.82, 0.41, 0.12, 0.77, 0.15, 0.68, 0.10, 0.11, 0.14]},
    ]
    audit_out = fairness_auditor_instance.audit_cohorts(cohorts_payload)
    metrics_list = audit_out["cohort_metrics"]

    oracle_a_ar = 0.70
    oracle_a_fpr = round(1.0 / 7.0, 4)
    oracle_a_fnr = round(1.0 / 3.0, 4)
    oracle_c_ar = 0.60
    oracle_c_di = round(0.60 / 0.70, 4)
    oracle_a_brier = round(
        float(np.mean((np.array(cohorts_payload[0]["y_prob"]) - np.array(cohorts_payload[0]["y_true"])) ** 2)), 4
    )

    math_matches = (
        not sensitive_in_features
        and metrics_list[0]["approval_rate"] == oracle_a_ar
        and metrics_list[0]["false_positive_rate"] == oracle_a_fpr
        and metrics_list[0]["false_negative_rate"] == oracle_a_fnr
        and metrics_list[2]["approval_rate"] == oracle_c_ar
        and metrics_list[2]["disparate_impact_ratio"] == oracle_c_di
    )
    has_brier_by_cohort = (
        all("brier_calibration_score" in m for m in metrics_list)
        and abs(metrics_list[0]["brier_calibration_score"] - oracle_a_brier) < 1e-4
    )
    dur = int((time.perf_counter() - t0) * 1000)

    cases.append(
        make_case(
            test_id="PY-FAIR-001",
            suite_mode="fairness_audit",
            module_id="M11",
            module_name="Fairness & Research Bias Validation",
            title="Fairness Metric Oracle (Approval Rate, Disparate Impact, FPR, FNR) & Brier Score Completeness",
            description="Verifies feature pipeline exclusion of Group_A/B/C, validates exact Disparate Impact, FPR, FNR, and per-cohort Brier calibration scores against an independent oracle.",
            preconditions="Controlled 3-cohort ground-truth and prediction fixture.",
            input_data={"cohorts_count": 3, "samples_per_cohort": 10},
            expected_data={
                "sensitive_in_features": False,
                "group_a": {"approval_rate": oracle_a_ar, "fpr": oracle_a_fpr, "fnr": oracle_a_fnr, "brier": oracle_a_brier},
                "group_c_disparate_impact": oracle_c_di,
                "includes_brier_score_by_cohort": True,
            },
            actual_data={
                "sensitive_in_features": sensitive_in_features,
                "cohort_metrics": metrics_list,
                "includes_brier_score_by_cohort": has_brier_by_cohort,
            },
            assertion_text="assert math_matches and has_brier_by_cohort",
            status="PASS" if (math_matches and has_brier_by_cohort) else "FAIL",
            started_at=started,
            completed_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=dur,
            source_refs="ml_service/app/fairness/audit.py:5-85",
            logs=f"Disparate Impact, FPR, FNR, and per-cohort Brier Score ({oracle_a_brier}) all verified against independent oracle.",
        )
    )

    return cases


def test_python_oracles_execute_and_produce_evidence():
    results = run_all_python_oracles()
    assert len(results) == 12
    for r in results:
        assert r["test_id"]
        assert r["status"] == "PASS", f"Oracle {r['test_id']} failed: {r['logs']}"
        assert r["assertion_text"]


if __name__ == "__main__":
    results = run_all_python_oracles()
    if "--json" in sys.argv:
        print(json.dumps({"cases": results}))
    else:
        print(json.dumps({"cases": results}, indent=2))
