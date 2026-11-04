use crate::api::system::AppState;
use crate::domain::{CreditAssessment, FeatureSnapshot, ShapExplanation};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::json;
use std::sync::Arc;

pub async fn get_shap_workspace(
    Path(assessment_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let assessment: CreditAssessment =
        sqlx::query_as("SELECT * FROM credit_assessments WHERE id = ?")
            .bind(&assessment_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or_else(|| (StatusCode::NOT_FOUND, "Assessment not found".to_string()))?;

    let shap: ShapExplanation =
        sqlx::query_as("SELECT * FROM shap_explanations WHERE assessment_id = ?")
            .bind(&assessment_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    "SHAP explanation not found for this assessment".to_string(),
                )
            })?;

    let snapshot: Option<FeatureSnapshot> =
        sqlx::query_as("SELECT * FROM feature_snapshots WHERE id = ?")
            .bind(&assessment.feature_snapshot_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let contributions: serde_json::Value =
        serde_json::from_str(&shap.feature_contributions).unwrap_or(json!([]));
    let global_rank: serde_json::Value =
        serde_json::from_str(&shap.global_importance_rank).unwrap_or(json!([]));

    Ok(Json(json!({
        "assessment_id": assessment.id,
        "customer_id": assessment.customer_id,
        "model_version": assessment.model_version_id,
        "probability_of_default": assessment.probability_of_default,
        "risk_category": assessment.risk_category,
        "recommendation": assessment.recommendation,
        "base_value": shap.base_value,
        "waterfall_contributions": contributions,
        "global_importance_rank": global_rank,
        "feature_snapshot": snapshot,
        "explanation_guidance": {
            "disclaimer": shap.disclaimer,
            "interpretation": "Positive contributions elevate estimated Probability of Default (PD), while negative contributions diminish estimated risk. SHAP reflects model attribution, not physical causal mechanics.",
            "policy": "No adverse action reason may be communicated without explicit secondary policy validation."
        }
    })))
}
