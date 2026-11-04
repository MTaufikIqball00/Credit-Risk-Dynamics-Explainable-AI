use crate::config::AppConfig;
use crate::domain::AuditLogItem;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub config: AppConfig,
    pub ml_client: crate::ml_client::MlClient,
    pub qa_engine: Option<crate::qa::QaEngine>,
}

#[derive(Deserialize)]
pub struct AuditQuery {
    pub limit: Option<i64>,
}

pub async fn health_check(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1").execute(&state.pool).await.is_ok();

    Json(json!({
        "status": "HEALTHY",
        "service": "AI Credit Risk Research & Dynamic Monitoring Platform",
        "engine": "Rust (Axum + Tokio + SQLx)",
        "database": if db_ok { "SQLite (WAL Mode - Operational)" } else { "DEGRADED" },
        "ports": {
            "backend": state.config.port,
            "ml_service": 8241,
            "frontend": 3240
        },
        "disclaimer": "RESEARCH & ACADEMIC PROTOTYPE ONLY - SYNTHETIC DATA - NOT FOR PRODUCTION LENDING",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

pub async fn get_overview(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let customer_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM synthetic_customers")
        .fetch_one(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let tx_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM bank_transactions")
        .fetch_one(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let dataset_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM research_datasets")
        .fetch_one(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let defaulted_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM synthetic_customers WHERE is_defaulted = 1")
            .fetch_one(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let assessment_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM credit_assessments")
        .fetch_one(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let alert_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM monitoring_events WHERE event_severity IN ('HIGH', 'CRITICAL')",
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let default_rate = if customer_count.0 > 0 {
        ((defaulted_count.0 as f64) / (customer_count.0 as f64) * 1000.0).round() / 10.0
    } else {
        0.0
    };

    let recent_events: Vec<crate::domain::MonitoringEvent> =
        sqlx::query_as("SELECT * FROM monitoring_events ORDER BY triggered_at DESC LIMIT 5")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let recent_assessments: Vec<crate::domain::CreditAssessment> =
        sqlx::query_as("SELECT * FROM credit_assessments ORDER BY assessed_at DESC LIMIT 5")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    Ok(Json(json!({
        "metrics": {
            "total_synthetic_customers": customer_count.0,
            "total_transactions": tx_count.0,
            "total_datasets": dataset_count.0,
            "total_assessments": assessment_count.0,
            "default_rate_pct": default_rate,
            "active_monitoring_alerts": alert_count.0
        },
        "model_status": {
            "active_model": "LightGBM-Research-v2.0",
            "benchmark_model": "XGBoost-Research-v1.8",
            "nlp_pipeline": "Transformer + TF-IDF Hybrid"
        },
        "recent_monitoring_events": recent_events,
        "recent_assessments": recent_assessments,
        "environment": "Synthetic Academic Environment"
    })))
}

pub async fn list_audit_logs(
    Query(query): Query<AuditQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(50).clamp(1, 200);
    let logs: Vec<AuditLogItem> =
        sqlx::query_as("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "logs": logs })))
}
