import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
import lightgbm as lgb
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    brier_score_loss,
    log_loss,
    confusion_matrix
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
    "data_completeness_score"
]

class ModelTrainer:
    def __init__(self, artifacts_dir: str = "artifacts"):
        self.artifacts_dir = artifacts_dir
        os.makedirs(artifacts_dir, exist_ok=True)
        self.models = {}

    def generate_synthetic_training_data(self, n_samples: int = 500, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
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

        X = np.column_stack([
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
            completeness
        ])

        # Default criterion (matches backend simulation ground truth)
        distress_score = (
            (payment_burden * 3.0) +
            (expense_ratio * 2.5) -
            (utility_regularity * 3.5) -
            (recurring_consistency * 2.0) -
            (np.clip(net_cash_flow / 10_000_000, -1.5, 2.0) * 1.5) +
            (income_variability * 1.2) +
            rng.normal(0, 0.4, n_samples)
        )
        y = (distress_score > 0.4).astype(int)

        return X, y

    def train_lightgbm(self, X: np.ndarray, y: np.ndarray, random_state: int = 42) -> Tuple[Any, Dict[str, Any]]:
        clf = lgb.LGBMClassifier(
            learning_rate=0.05,
            n_estimators=100,
            max_depth=4,
            num_leaves=20,
            random_state=random_state,
            verbose=-1
        )
        clf.fit(X, y)
        metrics = self._evaluate(clf, X, y)
        self.models["LightGBM"] = clf
        joblib.dump(clf, os.path.join(self.artifacts_dir, "lightgbm_latest.joblib"))
        return clf, metrics

    def train_xgboost(self, X: np.ndarray, y: np.ndarray, random_state: int = 42) -> Tuple[Any, Dict[str, Any]]:
        clf = xgb.XGBClassifier(
            learning_rate=0.05,
            n_estimators=100,
            max_depth=4,
            subsample=0.85,
            random_state=random_state,
            eval_metric="logloss"
        )
        clf.fit(X, y)
        metrics = self._evaluate(clf, X, y)
        self.models["XGBoost"] = clf
        joblib.dump(clf, os.path.join(self.artifacts_dir, "xgboost_latest.joblib"))
        return clf, metrics

    def _evaluate(self, model: Any, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        probs = model.predict_proba(X)[:, 1]
        preds = (probs >= 0.35).astype(int)

        roc = roc_auc_score(y, probs)
        pr = average_precision_score(y, probs)
        f1 = f1_score(y, preds, zero_division=0)
        prec = precision_score(y, preds, zero_division=0)
        rec = recall_score(y, preds, zero_division=0)
        brier = brier_score_loss(y, probs)
        loss = log_loss(y, probs)

        prob_true, prob_pred = calibration_curve(y, probs, n_bins=5)
        cal_bins = [
            {"pred_prob": round(float(p), 4), "actual_rate": round(float(t), 4)}
            for t, p in zip(prob_true, prob_pred)
        ]

        tn, fp, fn, tp = confusion_matrix(y, preds).ravel()

        return {
            "roc_auc": round(float(roc), 4),
            "pr_auc": round(float(pr), 4),
            "f1_score": round(float(f1), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "brier_score": round(float(brier), 4),
            "log_loss": round(float(loss), 4),
            "calibration_curve": cal_bins,
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp)
            }
        }

trainer_instance = ModelTrainer()
# Pre-train default models
_X, _y = trainer_instance.generate_synthetic_training_data(400, 42)
trainer_instance.train_lightgbm(_X, _y, 42)
trainer_instance.train_xgboost(_X, _y, 42)
