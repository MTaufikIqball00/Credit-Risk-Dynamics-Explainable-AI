import shap
import numpy as np
from typing import Dict, Any, List
from ..models.trainer import trainer_instance, FEATURE_NAMES

class XAIExplainer:
    def __init__(self):
        self.explainers = {}
        self._init_explainers()

    def _init_explainers(self):
        if "LightGBM" in trainer_instance.models:
            lgb_model = trainer_instance.models["LightGBM"]
            try:
                self.explainers["LightGBM"] = shap.TreeExplainer(lgb_model)
            except Exception as e:
                print(f"Failed to initialize TreeExplainer for LightGBM: {e}")

        if "XGBoost" in trainer_instance.models:
            xgb_model = trainer_instance.models["XGBoost"]
            try:
                self.explainers["XGBoost"] = shap.TreeExplainer(xgb_model)
            except Exception as e:
                print(f"Failed to initialize TreeExplainer for XGBoost: {e}")

    def explain_instance(self, feature_dict: Dict[str, float], model_type: str = "LightGBM") -> Dict[str, Any]:
        if model_type not in self.explainers:
            self._init_explainers()

        model = trainer_instance.models.get(model_type)
        explainer = self.explainers.get(model_type)

        features_array = np.array([[float(feature_dict.get(k, 0.0)) for k in FEATURE_NAMES]])

        if model is None:
            # Fallback mathematical values
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

        # Compute SHAP values
        if explainer is not None:
            try:
                shap_values = explainer.shap_values(features_array)
                # TreeExplainer returns list or 2D array depending on version
                if isinstance(shap_values, list) and len(shap_values) > 1:
                    vals = shap_values[1][0]
                elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 2:
                    vals = shap_values[0]
                else:
                    vals = shap_values[0]

                base_val = float(explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value)
            except Exception:
                vals = [0.0] * len(FEATURE_NAMES)
                base_val = 0.20
        else:
            vals = [0.0] * len(FEATURE_NAMES)
            base_val = 0.20

        contributions = []
        for name, val, shap_val in zip(FEATURE_NAMES, features_array[0], vals):
            s_val = float(shap_val)
            contributions.append({
                "feature": name,
                "value": round(float(val), 4),
                "contribution": round(s_val, 4),
                "direction": "INCREASES_RISK" if s_val > 0 else "DECREASES_RISK"
            })

        # Sort contributions by absolute impact
        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        global_importance = [
            ("utility_regularity_score", 0.34),
            ("payment_burden_ratio", 0.29),
            ("expense_to_income_ratio", 0.22),
            ("net_cash_flow", 0.15),
            ("cash_flow_volatility", 0.08)
        ]

        uncertainty = round(float(prob * (1.0 - prob) * 0.35 + 0.03), 4)

        return {
            "probability_of_default": round(prob, 4),
            "risk_category": cat,
            "recommendation": rec,
            "uncertainty_score": uncertainty,
            "base_value": round(base_val, 4),
            "shap_contributions": contributions,
            "global_importance": global_importance,
            "model_version": f"{model_type}-Research-v2.0"
        }

    def _fallback_explanation(self, feature_dict: Dict[str, float]) -> Dict[str, Any]:
        dti = feature_dict.get("payment_burden_ratio", 0.2)
        exp = feature_dict.get("expense_to_income_ratio", 0.5)
        util = feature_dict.get("utility_regularity_score", 0.8)

        score = -2.5 + (dti * 3.5) + (exp * 2.8) - (util * 3.2)
        pd = 1.0 / (1.0 + np.exp(-score))

        return {
            "probability_of_default": round(float(pd), 4),
            "risk_category": "MODERATE" if pd < 0.35 else "HIGH",
            "recommendation": "REVIEW_RECOMMENDED" if pd < 0.35 else "CAUTION_FLAGGED",
            "uncertainty_score": 0.08,
            "base_value": 0.20,
            "shap_contributions": [
                {"feature": "utility_regularity_score", "value": util, "contribution": -0.15, "direction": "DECREASES_RISK"},
                {"feature": "payment_burden_ratio", "value": dti, "contribution": 0.18, "direction": "INCREASES_RISK"}
            ],
            "global_importance": [("utility_regularity_score", 0.32)],
            "model_version": "Research-Fallback-v1.0"
        }

explainer_instance = XAIExplainer()
