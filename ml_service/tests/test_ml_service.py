import pytest
import numpy as np
from app.nlp.classifier import classifier_instance
from app.models.trainer import trainer_instance, FEATURE_NAMES
from app.xai.explainer import explainer_instance
from app.monitoring.drift import calculate_psi, drift_detector_instance
from app.fairness.audit import fairness_auditor_instance

def test_nlp_classification():
    salary_res = classifier_instance.classify("GAJI BULANAN MANDIRI")
    assert salary_res["category"] == "Salary / Income"
    assert salary_res["confidence"] > 0.5

    pln_res = classifier_instance.classify("TAGIHAN LISTRIK PLN BULANAN")
    assert pln_res["category"] == "Utility Payment"

    unknown_res = classifier_instance.classify("XKJASDKJ 12938120")
    assert unknown_res["category"] in ["Unclassified", "Transfer"] # or low confidence
    assert unknown_res["is_low_confidence"] == True

def test_model_training_and_metrics():
    X, y = trainer_instance.generate_synthetic_training_data(150, 42)
    assert X.shape[1] == len(FEATURE_NAMES)
    assert len(y) == 150

    _, metrics = trainer_instance.train_lightgbm(X, y, 42)
    assert "roc_auc" in metrics
    assert "f1_score" in metrics
    assert "confusion_matrix" in metrics
    assert metrics["roc_auc"] >= 0.70

def test_shap_explanation():
    sample_features = {
        "avg_monthly_income": 15000000.0,
        "income_variability": 0.10,
        "monthly_expense": 6000000.0,
        "net_cash_flow": 9000000.0,
        "avg_balance": 25000000.0,
        "cash_flow_volatility": 0.20,
        "expense_to_income_ratio": 0.40,
        "recurring_payment_consistency": 1.0,
        "utility_regularity_score": 0.95,
        "payment_burden_ratio": 0.15,
        "transaction_frequency": 18.0,
        "data_completeness_score": 0.95
    }
    explanation = explainer_instance.explain_instance(sample_features, "LightGBM")
    assert "probability_of_default" in explanation
    assert "shap_contributions" in explanation
    assert len(explanation["shap_contributions"]) == len(FEATURE_NAMES)
    assert explanation["shap_contributions"][0]["direction"] in ["INCREASES_RISK", "DECREASES_RISK"]

def test_drift_psi_calculation():
    # Identical distributions -> PSI should be close to 0 (< 0.10)
    rng = np.random.RandomState(42)
    base = rng.normal(10, 2, 500)
    curr = rng.normal(10, 2, 500)
    psi_stable = calculate_psi(base, curr)
    assert psi_stable < 0.10

    # Shifted distribution -> PSI should increase (> 0.10)
    shifted = rng.normal(16, 2, 500)
    psi_shifted = calculate_psi(base, shifted)
    assert psi_shifted > 0.10

def test_fairness_audit():
    cohort_data = [
        {
            "cohort": "Group_A",
            "y_true": [0, 0, 1, 0, 1],
            "y_pred": [0, 0, 1, 0, 0] # 4 approved, 1 rejected
        },
        {
            "cohort": "Group_B",
            "y_true": [0, 1, 1, 0, 0],
            "y_pred": [0, 0, 1, 0, 0]
        }
    ]
    report = fairness_auditor_instance.audit_cohorts(cohort_data)
    assert "cohort_metrics" in report
    assert len(report["cohort_metrics"]) == 2
    assert report["cohort_metrics"][0]["disparate_impact_ratio"] > 0.0
