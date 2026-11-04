use crate::api::system::AppState;
use crate::domain::{BankTransaction, FeatureSnapshot, SyntheticCustomer, UtilityPayment};
use crate::features::FeatureCalculator;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct FeatureListQuery {
    pub customer_id: Option<String>,
    pub limit: Option<i64>,
}

pub async fn list_features(
    Query(query): Query<FeatureListQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);

    let features: Vec<FeatureSnapshot> = if let Some(ref cid) = query.customer_id {
        sqlx::query_as("SELECT * FROM feature_snapshots WHERE customer_id = ? ORDER BY snapshot_date DESC LIMIT ?")
            .bind(cid)
            .bind(limit)
            .fetch_all(&state.pool)
            .await
    } else {
        sqlx::query_as("SELECT * FROM feature_snapshots ORDER BY snapshot_date DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&state.pool)
            .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "feature_snapshots": features })))
}

pub async fn compute_features(
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

    let transactions: Vec<BankTransaction> =
        sqlx::query_as("SELECT * FROM bank_transactions WHERE customer_id = ?")
            .bind(&customer_id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let utilities: Vec<UtilityPayment> =
        sqlx::query_as("SELECT * FROM utility_payments WHERE customer_id = ?")
            .bind(&customer_id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let calc = FeatureCalculator::new();
    let feat = calc.compute_for_customer(&customer, &transactions, &utilities);

    sqlx::query(
        r#"
        INSERT INTO feature_snapshots (id, customer_id, snapshot_date, feature_version, avg_monthly_income, income_variability, monthly_expense, net_cash_flow, avg_balance, cash_flow_volatility, expense_to_income_ratio, recurring_payment_consistency, utility_regularity_score, payment_burden_ratio, transaction_frequency, data_completeness_score, features_json, is_synthetic, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&feat.id)
    .bind(&feat.customer_id)
    .bind(&feat.snapshot_date)
    .bind(&feat.feature_version)
    .bind(feat.avg_monthly_income)
    .bind(feat.income_variability)
    .bind(feat.monthly_expense)
    .bind(feat.net_cash_flow)
    .bind(feat.avg_balance)
    .bind(feat.cash_flow_volatility)
    .bind(feat.expense_to_income_ratio)
    .bind(feat.recurring_payment_consistency)
    .bind(feat.utility_regularity_score)
    .bind(feat.payment_burden_ratio)
    .bind(feat.transaction_frequency)
    .bind(feat.data_completeness_score)
    .bind(&feat.features_json)
    .bind(feat.is_synthetic)
    .bind(&feat.created_at)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "status": "COMPUTED",
        "feature_snapshot": feat
    })))
}
