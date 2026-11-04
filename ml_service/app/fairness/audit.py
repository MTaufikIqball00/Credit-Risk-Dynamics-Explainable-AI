import numpy as np
from typing import Dict, Any, List

class FairnessAuditor:
    def audit_cohorts(self, cohorts_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Audits demographic parity & error rate disparity across synthetic research cohorts.
        Protected/cohort attributes are used solely in post-hoc research audits, not in feature pipelines.
        """
        results = []
        reference_approval_rate = None

        for item in cohorts_data:
            cohort_name = item.get("cohort", "Unknown")
            y_true = np.array(item.get("y_true", []))
            y_pred = np.array(item.get("y_pred", [])) # 1 = Default, 0 = Non-default

            if len(y_pred) == 0:
                continue

            # In credit, approval = 1 - predicted_default
            approved = (y_pred == 0).astype(int)
            approval_rate = float(np.mean(approved))

            if reference_approval_rate is None:
                reference_approval_rate = max(approval_rate, 0.001)

            disparate_impact = approval_rate / reference_approval_rate

            # False Positive Rate: non-defaults classified as defaults
            negatives = (y_true == 0)
            fpr = float(np.mean(y_pred[negatives] == 1)) if np.sum(negatives) > 0 else 0.0

            # False Negative Rate: defaults classified as non-defaults
            positives = (y_true == 1)
            fnr = float(np.mean(y_pred[positives] == 0)) if np.sum(positives) > 0 else 0.0

            results.append({
                "cohort": cohort_name,
                "sample_size": len(y_true),
                "approval_rate": round(approval_rate, 4),
                "disparate_impact_ratio": round(disparate_impact, 4),
                "false_positive_rate": round(fpr, 4),
                "false_negative_rate": round(fnr, 4)
            })

        return {
            "cohort_metrics": results,
            "four_fifths_threshold": 0.80,
            "disclaimer": "Academic fairness simulation on synthetic data. Real-world compliance requires non-synthetic empirical data."
        }

fairness_auditor_instance = FairnessAuditor()
