use crate::api::system::AppState;
use crate::domain::{
    BankTransaction, CreditAssessment, FeatureSnapshot, MonitoringEvent, ReassessmentHistoryItem,
    SyntheticAccount, SyntheticCustomer, UtilityPayment,
};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct CustomerListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub profile: Option<String>,
    pub cohort: Option<String>,
    pub search: Option<String>,
}

pub async fn list_customers(
    Query(query): Query<CustomerListQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut sql = "SELECT * FROM synthetic_customers WHERE 1=1".to_string();
    if let Some(ref prof) = query.profile {
        if !prof.is_empty() && prof != "ALL" {
            sql.push_str(&format!(
                " AND simulation_profile = '{}'",
                prof.replace('\'', "''")
            ));
        }
    }
    if let Some(ref coh) = query.cohort {
        if !coh.is_empty() && coh != "ALL" {
            sql.push_str(&format!(
                " AND synthetic_cohort = '{}'",
                coh.replace('\'', "''")
            ));
        }
    }
    if let Some(ref s) = query.search {
        if !s.is_empty() {
            sql.push_str(&format!(
                " AND (customer_code LIKE '%{}%' OR employment_type LIKE '%{}%')",
                s.replace('\'', "''"),
                s.replace('\'', "''")
            ));
        }
    }

    sql.push_str(&format!(
        " ORDER BY customer_code ASC LIMIT {} OFFSET {}",
        limit, offset
    ));

    let customers: Vec<SyntheticCustomer> = sqlx::query_as(&sql)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let count_tuple: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM synthetic_customers")
        .fetch_one(&state.pool)
        .await
        .unwrap_or((0,));

    Ok(Json(json!({
        "customers": customers,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": count_tuple.0
        }
    })))
}

pub async fn get_customer_detail(
    Path(customer_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let customer: SyntheticCustomer =
        sqlx::query_as("SELECT * FROM synthetic_customers WHERE id = ?")
            .bind(&customer_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or_else(|| (StatusCode::NOT_FOUND, "Customer not found".to_string()))?;

    let accounts: Vec<SyntheticAccount> =
        sqlx::query_as("SELECT * FROM synthetic_accounts WHERE customer_id = ?")
            .bind(&customer_id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let transactions: Vec<BankTransaction> = sqlx::query_as("SELECT * FROM bank_transactions WHERE customer_id = ? ORDER BY transaction_date DESC LIMIT 100")
        .bind(&customer_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let utilities: Vec<UtilityPayment> = sqlx::query_as(
        "SELECT * FROM utility_payments WHERE customer_id = ? ORDER BY due_date DESC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let features: Vec<FeatureSnapshot> = sqlx::query_as(
        "SELECT * FROM feature_snapshots WHERE customer_id = ? ORDER BY snapshot_date DESC LIMIT 5",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let assessments: Vec<CreditAssessment> = sqlx::query_as(
        "SELECT * FROM credit_assessments WHERE customer_id = ? ORDER BY assessed_at DESC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let events: Vec<MonitoringEvent> = sqlx::query_as(
        "SELECT * FROM monitoring_events WHERE customer_id = ? ORDER BY triggered_at DESC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let reassessments: Vec<ReassessmentHistoryItem> = sqlx::query_as(
        "SELECT * FROM reassessment_history WHERE customer_id = ? ORDER BY reassessed_at DESC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "customer": customer,
        "accounts": accounts,
        "transactions": transactions,
        "utility_payments": utilities,
        "feature_snapshots": features,
        "assessments": assessments,
        "monitoring_events": events,
        "reassessment_history": reassessments
    })))
}
