import numpy as np
from typing import Dict, Any, Tuple, Optional
import lightgbm as lgb
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    brier_score_loss,
    log_loss,
    confusion_matrix,
    roc_curve,
)
from sklearn.calibration import calibration_curve
import joblib
import os

FEATURE_NAMES = [
    "avg_monthly_income",
    "income_variability",
    "monthly_expense",
    "net_cash_flow",
    "avg_balance",
    "cash_flow_volatility",
    "expense_to_income_ratio",
    "recurring_payment_consistency",
    "utility_regularity_score",
    "payment_burden_ratio",
    "transaction_frequency",
    "data_completeness_score",
]


class ModelTrainer:
    def __init__(self, artifacts_dir: str = "artifacts"):
        self.artifacts_dir = artifacts_dir
        os.makedirs(artifacts_dir, exist_ok=True)
        self.models: Dict[str, Any] = {}
        self.background_X: Dict[str, np.ndarray] = {}
        self.latest_metrics: Dict[str, Dict[str, Any]] = {}

    def generate_synthetic_training_data(
        self, n_samples: int = 500, random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray]:
        rng = np.random.RandomState(random_state)

        # Generate realistic synthetic distribution matching backend generator
        avg_monthly_income = rng.uniform(5_000_000, 30_000_000, n_samples)
        income_variability = rng.uniform(0.05, 0.60, n_samples)
        expense_ratio = rng.uniform(0.30, 0.90, n_samples)
        monthly_expense = avg_monthly_income * expense_ratio
        net_cash_flow = avg_monthly_income - monthly_expense
        avg_balance = avg_monthly_income * rng.uniform(0.5, 3.0, n_samples)
        cash_flow_volatility = rng.uniform(0.10, 0.80, n_samples)
        recurring_consistency = rng.uniform(0.40, 1.0, n_samples)
        utility_regularity = rng.uniform(0.30, 1.0, n_samples)
        payment_burden = rng.uniform(0.0, 0.50, n_samples)
        tx_freq = rng.uniform(4, 30, n_samples)
        completeness = rng.uniform(0.70, 1.0, n_samples)

        X = np.column_stack(
            [
                avg_monthly_income,
                income_variability,
                monthly_expense,
                net_cash_flow,
                avg_balance,
                cash_flow_volatility,
                expense_ratio,
                recurring_consistency,
                utility_regularity,
                payment_burden,
                tx_freq,
                completeness,
            ]
        )

        # Default criterion aligned with backend ground-truth distress model:
        # Combines debt/expense burden, cash-flow liquidity, and chronic utility delinquency.
        chronic_delinquency_boost = np.where(utility_regularity < 0.68, 2.4, 0.0)
        distress_logit = (
            -0.35
            + (payment_burden * 3.4)
            + (expense_ratio * 2.6)
            - (utility_regularity * 3.8)
            - (recurring_consistency * 1.8)
            - (np.clip(net_cash_flow / 10_000_000, -1.5, 2.0) * 1.1)
            + (income_variability * 1.2)
            + chronic_delinquency_boost
        )
        default_prob = 1.0 / (1.0 + np.exp(-distress_logit))
        y = (rng.uniform(0.0, 1.0, n_samples) < default_prob).astype(int)

        return X, y

    def _split_train_eval(
        self, X: np.ndarray, y: np.ndarray, random_state: int
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Stratified 75/25 holdout split to prevent in-sample evaluation leakage."""
        stratify_arg = y if (len(np.unique(y)) > 1 and np.min(np.bincount(y)) >= 2) else None
        return train_test_split(
            X, y, test_size=0.25, stratify=stratify_arg, random_state=random_state
        )

    def _save_artifact(self, model: Any, default_filename: str, artifact_path: Optional[str]) -> str:
        default_full = os.path.join(self.artifacts_dir, default_filename)
        joblib.dump(model, default_full)
        if artifact_path:
            parent = os.path.dirname(artifact_path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            joblib.dump(model, artifact_path)
            return artifact_path
        return default_full

    def train_lightgbm(
        self,
        X: np.ndarray,
        y: np.ndarray,
        random_state: int = 42,
        hyperparameters: Optional[Dict[str, Any]] = None,
        artifact_path: Optional[str] = None,
    ) -> Tuple[Any, Dict[str, Any]]:
        hp = hyperparameters or {}
        X_train, X_test, y_train, y_test = self._split_train_eval(X, y, random_state)

        clf = lgb.LGBMClassifier(
            learning_rate=float(hp.get("learning_rate", 0.05)),
            n_estimators=int(hp.get("n_estimators", 100)),
            max_depth=int(hp.get("max_depth", 4)),
            num_leaves=int(hp.get("num_leaves", 20)),
            random_state=random_state,
            verbose=-1,
        )
        clf.fit(X_train, y_train)
        metrics = self._evaluate(clf, X_test, y_test, len(X_train))
        saved_path = self._save_artifact(clf, "lightgbm_latest.joblib", artifact_path)
        metrics["artifact_path"] = saved_path

        self.models["LightGBM"] = clf
        self.background_X["LightGBM"] = X_train
        self.latest_metrics["LightGBM"] = metrics
        return clf, metrics

    def train_xgboost(
        self,
        X: np.ndarray,
        y: np.ndarray,
        random_state: int = 42,
        hyperparameters: Optional[Dict[str, Any]] = None,
        artifact_path: Optional[str] = None,
    ) -> Tuple[Any, Dict[str, Any]]:
        hp = hyperparameters or {}
        X_train, X_test, y_train, y_test = self._split_train_eval(X, y, random_state)

        clf = xgb.XGBClassifier(
            learning_rate=float(hp.get("learning_rate", 0.05)),
            n_estimators=int(hp.get("n_estimators", 100)),
            max_depth=int(hp.get("max_depth", 4)),
            subsample=float(hp.get("subsample", 0.85)),
            random_state=random_state,
            eval_metric="logloss",
        )
        clf.fit(X_train, y_train)
        metrics = self._evaluate(clf, X_test, y_test, len(X_train))
        saved_path = self._save_artifact(clf, "xgboost_latest.joblib", artifact_path)
        metrics["artifact_path"] = saved_path

        self.models["XGBoost"] = clf
        self.background_X["XGBoost"] = X_train
        self.latest_metrics["XGBoost"] = metrics
        return clf, metrics

    def train_logistic_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        random_state: int = 42,
        hyperparameters: Optional[Dict[str, Any]] = None,
        artifact_path: Optional[str] = None,
    ) -> Tuple[Any, Dict[str, Any]]:
        hp = hyperparameters or {}
        X_train, X_test, y_train, y_test = self._split_train_eval(X, y, random_state)

        clf = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "clf",
                    LogisticRegression(
                        C=float(hp.get("C", 1.0)),
                        max_iter=int(hp.get("max_iter", 500)),
                        random_state=random_state,
                    ),
                ),
            ]
        )
        clf.fit(X_train, y_train)
        metrics = self._evaluate(clf, X_test, y_test, len(X_train))
        saved_path = self._save_artifact(clf, "baseline_logreg_latest.joblib", artifact_path)
        metrics["artifact_path"] = saved_path

        self.models["Baseline_LogReg"] = clf
        self.background_X["Baseline_LogReg"] = X_train
        self.latest_metrics["Baseline_LogReg"] = metrics
        return clf, metrics

    def _evaluate(
        self, model: Any, X_eval: np.ndarray, y_eval: np.ndarray, train_samples: int
    ) -> Dict[str, Any]:
        probs = model.predict_proba(X_eval)[:, 1]
        preds = (probs >= 0.35).astype(int)

        roc = roc_auc_score(y_eval, probs) if len(np.unique(y_eval)) > 1 else 0.5
        pr = average_precision_score(y_eval, probs) if len(np.unique(y_eval)) > 1 else 0.0
        f1 = f1_score(y_eval, preds, zero_division=0)
        prec = precision_score(y_eval, preds, zero_division=0)
        rec = recall_score(y_eval, preds, zero_division=0)
        brier = brier_score_loss(y_eval, probs)
        loss = log_loss(y_eval, probs, labels=[0, 1])

        prob_true, prob_pred = calibration_curve(y_eval, probs, n_bins=5, strategy="uniform")
        cal_bins = [
            {"pred_prob": round(float(p), 4), "actual_rate": round(float(t), 4)}
            for t, p in zip(prob_true, prob_pred)
        ]

        if len(np.unique(y_eval)) > 1:
            fpr_arr, tpr_arr, _ = roc_curve(y_eval, probs)
            step = max(1, len(fpr_arr) // 12)
            roc_pts = [
                {"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
                for f, t in zip(fpr_arr[::step], tpr_arr[::step])
            ]
            if roc_pts[-1]["fpr"] != 1.0 or roc_pts[-1]["tpr"] != 1.0:
                roc_pts.append({"fpr": 1.0, "tpr": 1.0})
        else:
            roc_pts = [{"fpr": 0.0, "tpr": 0.0}, {"fpr": 1.0, "tpr": 1.0}]

        cm_arr = confusion_matrix(y_eval, preds, labels=[0, 1])
        tn, fp, fn, tp = cm_arr.ravel()

        return {
            "roc_auc": round(float(roc), 4),
            "pr_auc": round(float(pr), 4),
            "f1_score": round(float(f1), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "brier_score": round(float(brier), 4),
            "log_loss": round(float(loss), 4),
            "split_strategy": "STRATIFIED_HOLDOUT_75_25",
            "train_samples": int(train_samples),
            "eval_samples": int(len(y_eval)),
            "train_eval_overlap": 0.0,
            "calibration_curve": cal_bins,
            "roc_curve": roc_pts,
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
            },
        }


trainer_instance = ModelTrainer()
# Pre-train default research models (LightGBM, XGBoost, and Baseline_LogReg)
_X, _y = trainer_instance.generate_synthetic_training_data(500, 42)
trainer_instance.train_lightgbm(_X, _y, 42)
trainer_instance.train_xgboost(_X, _y, 42)
trainer_instance.train_logistic_regression(_X, _y, 42)
