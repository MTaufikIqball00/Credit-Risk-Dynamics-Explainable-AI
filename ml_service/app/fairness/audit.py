import numpy as np
from typing import Dict, Any, List


class FairnessAuditor:
    def audit_cohorts(self, cohorts_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Audits demographic parity, error rate disparity, and calibration (Brier score)
        across synthetic research cohorts. Protected/cohort attributes are strictly excluded
        from feature pipelines and used solely in post-hoc research audits.
        """
        results = []
        reference_approval_rate = None

        for item in cohorts_data:
            cohort_name = item.get("cohort", "Unknown")
            y_true = np.asarray(item.get("y_true", []), dtype=float)
            y_pred = np.asarray(item.get("y_pred", []), dtype=int)  # 1 = Default, 0 = Non-default
            raw_prob = item.get("y_prob")
            if raw_prob is not None and len(raw_prob) == len(y_true):
                y_prob = np.asarray(raw_prob, dtype=float)
            else:
                y_prob = y_pred.astype(float)

            if len(y_pred) == 0:
                continue

            # In credit, approval = 1 - predicted_default
            approved = (y_pred == 0).astype(int)
            approval_rate = float(np.mean(approved))

            if reference_approval_rate is None:
                reference_approval_rate = max(approval_rate, 0.001)

            disparate_impact = approval_rate / reference_approval_rate

            # False Positive Rate: non-defaults classified as defaults
            negatives = y_true == 0
            fpr = float(np.mean(y_pred[negatives] == 1)) if np.sum(negatives) > 0 else 0.0

            # False Negative Rate: defaults classified as non-defaults
            positives = y_true == 1
            fnr = float(np.mean(y_pred[positives] == 0)) if np.sum(positives) > 0 else 0.0

            # Per-cohort probabilistic calibration Brier score
            brier = float(np.mean((y_prob - y_true) ** 2)) if len(y_true) > 0 else 0.0

            results.append(
                {
                    "cohort": cohort_name,
                    "sample_size": int(len(y_true)),
                    "approval_rate": round(approval_rate, 4),
                    "disparate_impact_ratio": round(disparate_impact, 4),
                    "false_positive_rate": round(fpr, 4),
                    "false_negative_rate": round(fnr, 4),
                    "brier_calibration_score": round(brier, 4),
                    "brier_score": round(brier, 4),
                }
            )

        if results:
            min_di = min(r["disparate_impact_ratio"] for r in results)
            fprs = [r["false_positive_rate"] for r in results]
            fnrs = [r["false_negative_rate"] for r in results]
            max_fpr_disp = round(max(fprs) - min(fprs), 4)
            max_fnr_disp = round(max(fnrs) - min(fnrs), 4)
        else:
            min_di = 1.0
            max_fpr_disp = 0.0
            max_fnr_disp = 0.0

        return {
            "cohort_metrics": results,
            "four_fifths_threshold": 0.80,
            "parity_audit": {
                "four_fifths_rule_status": (
                    "COMPLIANT_IN_SIMULATION" if min_di >= 0.80 else "DISPARITY_DETECTED"
                ),
                "min_disparate_impact_ratio": round(min_di, 4),
                "max_fpr_disparity": max_fpr_disp,
                "max_fnr_disparity": max_fnr_disp,
                "equal_opportunity_difference": max_fnr_disp,
            },
            "disclaimer": (
                "Academic fairness simulation on synthetic data. "
                "Real-world compliance requires non-synthetic empirical data."
            ),
        }


fairness_auditor_instance = FairnessAuditor()
