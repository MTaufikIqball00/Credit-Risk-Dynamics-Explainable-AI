import numpy as np
from typing import Dict, Any, List


def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_buckets: int = 10) -> float:
    """Calculate Population Stability Index (PSI) between expected and actual distributions.
    Safely filters NaN and non-finite values before computing quantile bucket edges.
    """
    exp_arr = np.asarray(expected, dtype=float)
    act_arr = np.asarray(actual, dtype=float)

    exp_arr = exp_arr[np.isfinite(exp_arr)]
    act_arr = act_arr[np.isfinite(act_arr)]

    if len(exp_arr) == 0 or len(act_arr) == 0:
        return 0.0

    percentiles = np.linspace(0, 100, num_buckets + 1)
    bucket_bounds = np.percentile(exp_arr, percentiles)
    bucket_bounds[0] = -np.inf
    bucket_bounds[-1] = np.inf

    expected_counts, _ = np.histogram(exp_arr, bins=bucket_bounds)
    actual_counts, _ = np.histogram(act_arr, bins=bucket_bounds)

    expected_pct = expected_counts / len(exp_arr)
    actual_pct = actual_counts / len(act_arr)

    # Avoid zero division / log(0)
    expected_pct = np.where(expected_pct == 0, 0.0001, expected_pct)
    actual_pct = np.where(actual_pct == 0, 0.0001, actual_pct)

    psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(np.round(psi_val, 4))


class DriftDetector:
    def evaluate_feature_drift(
        self,
        baseline_features: Dict[str, List[float]],
        current_features: Dict[str, List[float]],
    ) -> List[Dict[str, Any]]:
        results = []
        for feat_name, base_vals in baseline_features.items():
            curr_vals = current_features.get(feat_name, [])
            if not base_vals or not curr_vals:
                continue

            psi = calculate_psi(np.array(base_vals, dtype=float), np.array(curr_vals, dtype=float))
            if psi < 0.10:
                status = "STABLE"
                interpretation = "No significant drift (PSI < 0.10)"
            elif psi < 0.25:
                status = "MODERATE_DRIFT"
                interpretation = "Moderate distribution change detected (0.10 <= PSI < 0.25)"
            else:
                status = "SIGNIFICANT_DRIFT"
                interpretation = (
                    "Significant distribution shift! Model reassessment required (PSI >= 0.25)"
                )

            results.append(
                {
                    "feature": feat_name,
                    "psi": psi,
                    "status": status,
                    "interpretation": interpretation,
                }
            )

        return results


drift_detector_instance = DriftDetector()
