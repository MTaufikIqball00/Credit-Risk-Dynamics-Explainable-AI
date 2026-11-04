use crate::api::system::AppState;
use crate::domain::BankTransaction;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct TransactionListQuery {
    pub customer_id: Option<String>,
    pub limit: Option<i64>,
    pub page: Option<i64>,
}

pub async fn list_transactions(
    Query(query): Query<TransactionListQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(50).clamp(1, 200);
    let page = query.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let (transactions, total_count) = if let Some(ref cid) = query.customer_id {
        let txs: Vec<BankTransaction> = sqlx::query_as(
            "SELECT * FROM bank_transactions WHERE customer_id = ? ORDER BY transaction_date DESC LIMIT ? OFFSET ?"
        )
        .bind(cid)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM bank_transactions WHERE customer_id = ?")
                .bind(cid)
                .fetch_one(&state.pool)
                .await
                .unwrap_or((0,));

        (txs, total.0)
    } else {
        let txs: Vec<BankTransaction> = sqlx::query_as(
            "SELECT * FROM bank_transactions ORDER BY transaction_date DESC LIMIT ? OFFSET ?",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM bank_transactions")
            .fetch_one(&state.pool)
            .await
            .unwrap_or((0,));

        (txs, total.0)
    };

    Ok(Json(json!({
        "transactions": transactions,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count
        }
    })))
}
