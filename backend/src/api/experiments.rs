use crate::api::system::AppState;
use crate::domain::ModelEvaluationItem;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::json;
use std::sync::Arc;

pub async fn list_experiments(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let evaluations: Vec<ModelEvaluationItem> =
        sqlx::query_as("SELECT * FROM model_evaluations ORDER BY created_at DESC")
            .fetch_all(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "experiments": evaluations
    })))
}
