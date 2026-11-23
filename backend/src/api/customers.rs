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
use sqlx::{QueryBuilder, Sqlite};
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct CustomerListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub profile: Option<String>,
    pub cohort: Option<String>,
    pub search: Option<String>,
}

fn apply_customer_filters<'a>(qb: &mut QueryBuilder<'a, Sqlite>, query: &'a CustomerListQuery) {
    if let Some(ref prof) = query.profile {
        if !prof.is_empty() && prof != "ALL" {
            qb.push(" AND simulation_profile = ").push_bind(prof);
        }
    }
    if let Some(ref coh) = query.cohort {
        if !coh.is_empty() && coh != "ALL" {
            qb.push(" AND synthetic_cohort = ").push_bind(coh);
        }
    }
    if let Some(ref s) = query.search {
        if !s.is_empty() {
            let pattern = format!("%{}%", s);
            qb.push(" AND (customer_code LIKE ")
                .push_bind(pattern.clone())
                .push(" OR employment_type LIKE ")
                .push_bind(pattern)
                .push(")");
        }
    }
}

pub async fn list_customers(
    Query(query): Query<CustomerListQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut select_qb: QueryBuilder<Sqlite> =
        QueryBuilder::new("SELECT * FROM synthetic_customers WHERE 1=1");
    apply_customer_filters(&mut select_qb, &query);
    select_qb
        .push(" ORDER BY customer_code ASC LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);

    let customers: Vec<SyntheticCustomer> = select_qb
        .build_query_as::<SyntheticCustomer>()
        .fetch_all(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut count_qb: QueryBuilder<Sqlite> =
        QueryBuilder::new("SELECT COUNT(*) FROM synthetic_customers WHERE 1=1");
    apply_customer_filters(&mut count_qb, &query);

    let count_tuple: (i64,) = count_qb
        .build_query_as::<(i64,)>()
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

    let transactions: Vec<BankTransaction> = sqlx::query_as(
        "SELECT * FROM bank_transactions WHERE customer_id = ? ORDER BY transaction_date DESC LIMIT 100",
    )
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
