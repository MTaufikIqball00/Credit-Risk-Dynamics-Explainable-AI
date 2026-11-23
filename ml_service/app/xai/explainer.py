import math
import shap
import xgboost as xgb
import numpy as np
from typing import Dict, Any, List, Tuple
from ..models.trainer import trainer_instance, FEATURE_NAMES


def _sigmoid(x: float) -> float:
    x_clamped = max(-500.0, min(500.0, float(x)))
    return 1.0 / (1.0 + math.exp(-x_clamped))


class XAIExplainer:
    def __init__(self):
        self.explainers: Dict[str, Any] = {}
        self.global_importances: Dict[str, List[Tuple[str, float]]] = {}
        self._init_explainers()

    def _init_explainers(self):
        if "LightGBM" in trainer_instance.models:
            lgb_model = trainer_instance.models["LightGBM"]
            try:
                exp = shap.TreeExplainer(lgb_model)
                self.explainers["LightGBM"] = exp
                self.global_importances["LightGBM"] = self._compute_global_importance(
                    "LightGBM", lgb_model
                )
            except Exception as e:
                print(f"Failed to initialize TreeExplainer for LightGBM: {e}")

        if "XGBoost" in trainer_instance.models:
            xgb_model = trainer_instance.models["XGBoost"]
            try:
                # Native C++ TreeSHAP via booster pred_contribs avoids XGBoost>=2.0 base_score string bug
                self.explainers["XGBoost"] = "native_xgb_pred_contribs"
                self.global_importances["XGBoost"] = self._compute_global_importance(
                    "XGBoost", xgb_model
                )
            except Exception as e:
                print(f"Failed to initialize native TreeSHAP for XGBoost: {e}")

        if "Baseline_LogReg" in trainer_instance.models:
            lr_model = trainer_instance.models["Baseline_LogReg"]
            try:
                self.explainers["Baseline_LogReg"] = "linear_exact"
                self.global_importances["Baseline_LogReg"] = self._compute_global_importance(
                    "Baseline_LogReg", lr_model
                )
            except Exception as e:
                print(f"Failed to initialize LinearSHAP for Baseline_LogReg: {e}")

    def _raw_margin_shap_matrix(
        self, model_type: str, model: Any, X: np.ndarray
    ) -> Tuple[np.ndarray, float]:
        """Returns (shap_margin_matrix [N, M], base_margin_float) for any supported model."""
        if model_type == "XGBoost" and hasattr(model, "get_booster"):
            dmat = xgb.DMatrix(X)
            contribs = model.get_booster().predict(dmat, pred_contribs=True)
            return np.asarray(contribs[:, :-1], dtype=float), float(contribs[0, -1])

        if model_type == "Baseline_LogReg" and hasattr(model, "named_steps"):
            scaler = model.named_steps["scaler"]
            clf = model.named_steps["clf"]
            X_scaled = scaler.transform(X)
            coef = clf.coef_[0]
            intercept = float(clf.intercept_[0])
            # Exact linear SHAP relative to standardized training mean (0 in scaled space)
            shap_mat = X_scaled * coef
            return np.asarray(shap_mat, dtype=float), intercept

        explainer = self.explainers.get(model_type)
        if explainer is not None and not isinstance(explainer, str):
            shap_values = explainer.shap_values(X)
            if isinstance(shap_values, list) and len(shap_values) > 1:
                mat = np.asarray(shap_values[1], dtype=float)
            elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
                mat = np.asarray(shap_values[:, :, 1], dtype=float)
            else:
                mat = np.asarray(shap_values, dtype=float)
            ev = explainer.expected_value
            base_margin = float(ev[1] if isinstance(ev, (list, np.ndarray)) and len(ev) > 1 else (ev[0] if isinstance(ev, (list, np.ndarray)) else ev))
            return mat, base_margin

        return np.zeros((X.shape[0], len(FEATURE_NAMES)), dtype=float), 0.0

    def _compute_global_importance(self, model_type: str, model: Any) -> List[Tuple[str, float]]:
        """Computes dynamic mean(|SHAP|) across training background samples."""
        bg_X = trainer_instance.background_X.get(model_type)
        if bg_X is None or len(bg_X) == 0:
            return [(name, round(1.0 / len(FEATURE_NAMES), 4)) for name in FEATURE_NAMES[:6]]

        sample_X = bg_X[: min(150, len(bg_X))]
        shap_mat, _ = self._raw_margin_shap_matrix(model_type, model, sample_X)
        mean_abs = np.mean(np.abs(shap_mat), axis=0)
        total = float(np.sum(mean_abs))
        if total > 1e-12:
            norm = mean_abs / total
        else:
            norm = np.ones(len(FEATURE_NAMES)) / len(FEATURE_NAMES)

        ranked = sorted(
            [(name, round(float(val), 4)) for name, val in zip(FEATURE_NAMES, norm)],
            key=lambda x: x[1],
            reverse=True,
        )
        return ranked[:8]

    def explain_instance(
        self, feature_dict: Dict[str, float], model_type: str = "LightGBM"
    ) -> Dict[str, Any]:
        if model_type not in self.explainers:
            self._init_explainers()

        model = trainer_instance.models.get(model_type)
        features_array = np.array([[float(feature_dict.get(k, 0.0)) for k in FEATURE_NAMES]])

        if model is None:
            return self._fallback_explanation(feature_dict)

        # Predict probability
        prob = float(model.predict_proba(features_array)[0, 1])

        # Risk Category & Recommendation
        if prob < 0.12:
            cat = "LOW"
            rec = "APPROVE_SUPPORTED"
        elif prob < 0.35:
            cat = "MODERATE"
            rec = "REVIEW_RECOMMENDED"
        elif prob < 0.65:
            cat = "HIGH"
            rec = "CAUTION_FLAGGED"
        else:
            cat = "VERY_HIGH"
            rec = "CAUTION_FLAGGED"

        # Compute exact TreeSHAP / LinearSHAP in log-odds margin space
        try:
            shap_mat, base_margin = self._raw_margin_shap_matrix(model_type, model, features_array)
            margin_vals = shap_mat[0]
        except Exception:
            margin_vals = np.zeros(len(FEATURE_NAMES), dtype=float)
            base_margin = -1.5

        # Project exact margin attributions to exact probability-space additive contributions:
        # base_prob + sum(phi_prob_i) == prob, preserving exact sign & proportionality of margin SHAP.
        base_prob = _sigmoid(base_margin)
        sum_margin = float(np.sum(margin_vals))
        prob_delta = prob - base_prob
        if abs(sum_margin) > 1e-12:
            scale_factor = prob_delta / sum_margin
            prob_vals = margin_vals * scale_factor
        else:
            prob_vals = np.zeros(len(FEATURE_NAMES), dtype=float)

        contributions = []
        for name, val, p_shap, m_shap in zip(
            FEATURE_NAMES, features_array[0], prob_vals, margin_vals
        ):
            s_val = float(p_shap)
            contributions.append(
                {
                    "feature": name,
                    "value": round(float(val), 4),
                    "contribution": round(s_val, 6),
                    "margin_contribution": round(float(m_shap), 6),
                    "direction": "INCREASES_RISK" if s_val > 0 else "DECREASES_RISK",
                }
            )

        # Sort contributions by absolute impact
        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        global_importance = self.global_importances.get(model_type)
        if not global_importance:
            global_importance = self._compute_global_importance(model_type, model)

        uncertainty = round(float(prob * (1.0 - prob) * 0.35 + 0.03), 4)

        return {
            "probability_of_default": round(prob, 4),
            "risk_category": cat,
            "recommendation": rec,
            "uncertainty_score": uncertainty,
            "scale": "probability",
            "base_value": round(base_prob, 6),
            "base_value_log_odds": round(base_margin, 6),
            "sum_shap_log_odds": round(sum_margin, 6),
            "shap_contributions": contributions,
            "global_importance": global_importance,
            "model_version": f"{model_type}-Research-v2.0",
        }

    def _fallback_explanation(self, feature_dict: Dict[str, float]) -> Dict[str, Any]:
        dti = feature_dict.get("payment_burden_ratio", 0.2)
        exp = feature_dict.get("expense_to_income_ratio", 0.5)
        util = feature_dict.get("utility_regularity_score", 0.8)

        score = -2.5 + (dti * 3.5) + (exp * 2.8) - (util * 3.2)
        pd_val = float(_sigmoid(score))

        return {
            "probability_of_default": round(pd_val, 4),
            "risk_category": "MODERATE" if pd_val < 0.35 else "HIGH",
            "recommendation": "REVIEW_RECOMMENDED" if pd_val < 0.35 else "CAUTION_FLAGGED",
            "uncertainty_score": 0.08,
            "scale": "probability",
            "base_value": 0.20,
            "shap_contributions": [
                {
                    "feature": "utility_regularity_score",
                    "value": util,
                    "contribution": -0.15,
                    "direction": "DECREASES_RISK",
                },
                {
                    "feature": "payment_burden_ratio",
                    "value": dti,
                    "contribution": 0.18,
                    "direction": "INCREASES_RISK",
                },
            ],
            "global_importance": [("utility_regularity_score", 0.32)],
            "model_version": "Research-Fallback-v1.0",
        }


explainer_instance = XAIExplainer()
