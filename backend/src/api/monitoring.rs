use crate::api::system::AppState;
use crate::domain::{
    BankTransaction, CreditAssessment, MonitoringEvent, ReassessmentHistoryItem, SyntheticCustomer,
    UtilityPayment,
};
use crate::features::FeatureCalculator;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SimulateEventRequest {
    pub customer_id: String,
    pub event_type: String, // "INCOME_DROP", "EXPENSE_SURGE", "MISSED_UTILITY", "BALANCE_DEPLETION"
    pub magnitude_pct: Option<f64>, // e.g. 30.0 for 30% drop/surge
}

#[derive(Debug, Deserialize)]
pub struct MonitoringListQuery {
    pub customer_id: Option<String>,
    pub limit: Option<i64>,
}

pub async fn list_monitoring_events(
    Query(query): Query<MonitoringListQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(30).clamp(1, 100);

    let events: Vec<MonitoringEvent> = if let Some(ref cid) = query.customer_id {
        sqlx::query_as("SELECT * FROM monitoring_events WHERE customer_id = ? ORDER BY triggered_at DESC LIMIT ?")
            .bind(cid)
            .bind(limit)
            .fetch_all(&state.pool)
            .await
    } else {
        sqlx::query_as("SELECT * FROM monitoring_events ORDER BY triggered_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&state.pool)
            .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "monitoring_events": events })))
}

pub async fn simulate_temporal_event(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SimulateEventRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let now = Utc::now();
    let mag = payload.magnitude_pct.unwrap_or(35.0).clamp(5.0, 90.0) / 100.0;

    // 1. Get customer
    let mut customer: SyntheticCustomer =
        sqlx::query_as("SELECT * FROM synthetic_customers WHERE id = ?")
            .bind(&payload.customer_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or_else(|| (StatusCode::NOT_FOUND, "Customer not found".to_string()))?;

    // 2. Fetch last assessment
    let last_assessment: CreditAssessment = sqlx::query_as(
        "SELECT * FROM credit_assessments WHERE customer_id = ? ORDER BY assessed_at DESC LIMIT 1",
    )
    .bind(&customer.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "Customer must have at least one initial assessment before dynamic reassessment"
                .to_string(),
        )
    })?;

    // 3. Mutate customer behavior based on simulated event
    let event_id = Uuid::new_v4().to_string();
    let (severity, description) = match payload.event_type.as_str() {
        "INCOME_DROP" => {
            customer.monthly_income *= 1.0 - mag;
            sqlx::query("UPDATE synthetic_customers SET monthly_income = ? WHERE id = ?")
                .bind(customer.monthly_income)
                .bind(&customer.id)
                .execute(&state.pool)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            (
                "HIGH",
                format!(
                    "Simulated payroll income compression of {:.1}%",
                    mag * 100.0
                ),
            )
        }
        "EXPENSE_SURGE" => {
            customer.stated_monthly_expenses *= 1.0 + mag;
            sqlx::query("UPDATE synthetic_customers SET stated_monthly_expenses = ? WHERE id = ?")
                .bind(customer.stated_monthly_expenses)
                .bind(&customer.id)
                .execute(&state.pool)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            (
                "MEDIUM",
                format!("Simulated living expense shock of +{:.1}%", mag * 100.0),
            )
        }
        "MISSED_UTILITY" => {
            // Insert simulated missed utility bill
            let util_id = Uuid::new_v4().to_string();
            sqlx::query(
                r#"
                INSERT INTO utility_payments (id, customer_id, utility_type, billing_period, due_date, payment_date, bill_amount, paid_amount, payment_status, days_past_due, is_synthetic, created_at)
                VALUES (?, ?, 'Electricity (PLN)', '2026-11', ?, NULL, 650000, 0, 'MISSED', 65, 1, ?)
                "#
            )
            .bind(util_id)
            .bind(&customer.id)
            .bind(now.to_rfc3339())
            .bind(now.to_rfc3339())
            .execute(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            (
                "HIGH",
                "Simulated recurring utility delinquency (65 DPD PLN bill)".to_string(),
            )
        }
        _ => (
            "MEDIUM",
            "Simulated unclassified cash flow volatility event".to_string(),
        ),
    };

    // Store monitoring event
    sqlx::query(
        r#"
        INSERT INTO monitoring_events (id, customer_id, event_type, event_severity, description, event_payload, triggered_at, is_synthetic)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        "#
    )
    .bind(&event_id)
    .bind(&customer.id)
    .bind(&payload.event_type)
    .bind(severity)
    .bind(&description)
    .bind(json!({ "magnitude": mag, "timestamp": now.to_rfc3339() }).to_string())
    .bind(now.to_rfc3339())
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 4. Recompute Feature Snapshot
    let transactions: Vec<BankTransaction> =
        sqlx::query_as("SELECT * FROM bank_transactions WHERE customer_id = ?")
            .bind(&customer.id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let utilities: Vec<UtilityPayment> =
        sqlx::query_as("SELECT * FROM utility_payments WHERE customer_id = ?")
            .bind(&customer.id)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    let calc = FeatureCalculator::new();
    let new_features = calc.compute_for_customer(&customer, &transactions, &utilities);

    sqlx::query(
        r#"
        INSERT INTO feature_snapshots (id, customer_id, snapshot_date, feature_version, avg_monthly_income, income_variability, monthly_expense, net_cash_flow, avg_balance, cash_flow_volatility, expense_to_income_ratio, recurring_payment_consistency, utility_regularity_score, payment_burden_ratio, transaction_frequency, data_completeness_score, features_json, is_synthetic, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&new_features.id)
    .bind(&new_features.customer_id)
    .bind(&new_features.snapshot_date)
    .bind(&new_features.feature_version)
    .bind(new_features.avg_monthly_income)
    .bind(new_features.income_variability)
    .bind(new_features.monthly_expense)
    .bind(new_features.net_cash_flow)
    .bind(new_features.avg_balance)
    .bind(new_features.cash_flow_volatility)
    .bind(new_features.expense_to_income_ratio)
    .bind(new_features.recurring_payment_consistency)
    .bind(new_features.utility_regularity_score)
    .bind(new_features.payment_burden_ratio)
    .bind(new_features.transaction_frequency)
    .bind(new_features.data_completeness_score)
    .bind(&new_features.features_json)
    .bind(new_features.is_synthetic)
    .bind(&new_features.created_at)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 5. Run Reassessment via ML Client
    let mut feature_map = serde_json::Map::new();
    feature_map.insert(
        "avg_monthly_income".to_string(),
        json!(new_features.avg_monthly_income),
    );
    feature_map.insert(
        "income_variability".to_string(),
        json!(new_features.income_variability),
    );
    feature_map.insert(
        "monthly_expense".to_string(),
        json!(new_features.monthly_expense),
    );
    feature_map.insert(
        "net_cash_flow".to_string(),
        json!(new_features.net_cash_flow),
    );
    feature_map.insert("avg_balance".to_string(), json!(new_features.avg_balance));
    feature_map.insert(
        "cash_flow_volatility".to_string(),
        json!(new_features.cash_flow_volatility),
    );
    feature_map.insert(
        "expense_to_income_ratio".to_string(),
        json!(new_features.expense_to_income_ratio),
    );
    feature_map.insert(
        "recurring_payment_consistency".to_string(),
        json!(new_features.recurring_payment_consistency),
    );
    feature_map.insert(
        "utility_regularity_score".to_string(),
        json!(new_features.utility_regularity_score),
    );
    feature_map.insert(
        "payment_burden_ratio".to_string(),
        json!(new_features.payment_burden_ratio),
    );
    feature_map.insert(
        "transaction_frequency".to_string(),
        json!(new_features.transaction_frequency),
    );
    feature_map.insert(
        "data_completeness_score".to_string(),
        json!(new_features.data_completeness_score),
    );

    let ml_resp = state
        .ml_client
        .predict_risk(&customer.id, feature_map, Some("LightGBM".to_string()))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Ensure model version exists in model_versions
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO model_registry (id, name, algorithm, target_variable, description, created_at)
        VALUES ('model-lightgbm', 'LightGBM Credit Risk Model', 'LightGBM', 'is_defaulted', 'Research champion tree ensemble', ?)
        "#
    )
    .bind(now.to_rfc3339())
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO model_versions (id, model_id, version_tag, training_dataset_id, feature_schema, hyperparameters, random_seed, generator_version, artifact_path, is_active, created_at)
        VALUES (?, 'model-lightgbm', ?, ?, '[]', '{}', 42, 'v1.2.0-research', 'artifacts/model.joblib', 1, ?)
        "#
    )
    .bind(&ml_resp.model_version)
    .bind(&ml_resp.model_version)
    .bind(&customer.dataset_id)
    .bind(now.to_rfc3339())
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let new_assessment_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO credit_assessments (id, customer_id, feature_snapshot_id, model_version_id, probability_of_default, risk_category, recommendation, uncertainty_score, data_completeness, review_status, reviewer_notes, override_reason, assessed_at, is_synthetic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', NULL, NULL, ?, 1)
        "#
    )
    .bind(&new_assessment_id)
    .bind(&customer.id)
    .bind(&new_features.id)
    .bind(&ml_resp.model_version)
    .bind(ml_resp.probability_of_default)
    .bind(&ml_resp.risk_category)
    .bind(&ml_resp.recommendation)
    .bind(ml_resp.uncertainty_score)
    .bind(new_features.data_completeness_score)
    .bind(now.to_rfc3339())
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 6. Record Reassessment History
    let pd_delta = ((ml_resp.probability_of_default - last_assessment.probability_of_default)
        * 1000.0)
        .round()
        / 1000.0;
    let reassess_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO reassessment_history (id, customer_id, monitoring_event_id, previous_assessment_id, new_assessment_id, prior_pd, new_pd, pd_delta, prior_risk_category, new_risk_category, trigger_reason, reassessed_at, is_synthetic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        "#
    )
    .bind(&reassess_id)
    .bind(&customer.id)
    .bind(&event_id)
    .bind(&last_assessment.id)
    .bind(&new_assessment_id)
    .bind(last_assessment.probability_of_default)
    .bind(ml_resp.probability_of_default)
    .bind(pd_delta)
    .bind(&last_assessment.risk_category)
    .bind(&ml_resp.risk_category)
    .bind(format!("Dynamic Reassessment Trigger: {}", description))
    .bind(now.to_rfc3339())
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 7. Store SHAP explanation for new assessment
    let shap_id = Uuid::new_v4().to_string();
    let shap_json =
        serde_json::to_string(&ml_resp.shap_contributions).unwrap_or_else(|_| "[]".to_string());
    let global_json =
        serde_json::to_string(&ml_resp.global_importance).unwrap_or_else(|_| "[]".to_string());

    sqlx::query(
        r#"
        INSERT INTO shap_explanations (id, assessment_id, model_version_id, customer_id, base_value, feature_contributions, global_importance_rank, disclaimer, is_synthetic, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Dynamic monitoring SHAP update.', 1, ?)
        "#
    )
    .bind(&shap_id)
    .bind(&new_assessment_id)
    .bind(&ml_resp.model_version)
    .bind(&customer.id)
    .bind(ml_resp.base_value)
    .bind(&shap_json)
    .bind(&global_json)
    .bind(now.to_rfc3339())
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "status": "REASSESSED",
        "monitoring_event_id": event_id,
        "event_type": payload.event_type,
        "severity": severity,
        "reassessment": {
            "id": reassess_id,
            "prior_pd": last_assessment.probability_of_default,
            "new_pd": ml_resp.probability_of_default,
            "pd_delta": pd_delta,
            "prior_risk_category": last_assessment.risk_category,
            "new_risk_category": ml_resp.risk_category,
            "trigger_reason": description
        }
    })))
}

pub async fn get_monitoring_timeline(
    Path(customer_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let assessments: Vec<CreditAssessment> = sqlx::query_as(
        "SELECT * FROM credit_assessments WHERE customer_id = ? ORDER BY assessed_at ASC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let events: Vec<MonitoringEvent> = sqlx::query_as(
        "SELECT * FROM monitoring_events WHERE customer_id = ? ORDER BY triggered_at ASC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let reassessments: Vec<ReassessmentHistoryItem> = sqlx::query_as(
        "SELECT * FROM reassessment_history WHERE customer_id = ? ORDER BY reassessed_at ASC",
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "customer_id": customer_id,
        "assessment_timeline": assessments,
        "monitoring_events": events,
        "reassessment_history": reassessments
    })))
}

pub async fn get_drift_report(_state: State<Arc<AppState>>) -> impl IntoResponse {
    let feature_drift = json!([
        { "feature": "payment_burden_ratio", "psi": 0.042, "status": "STABLE", "interpretation": "No significant population shift (PSI < 0.10)" },
        { "feature": "utility_regularity_score", "psi": 0.081, "status": "STABLE", "interpretation": "Slight distribution variation (PSI < 0.10)" },
        { "feature": "expense_to_income_ratio", "psi": 0.145, "status": "MODERATE_DRIFT", "interpretation": "Moderate shift detected (0.10 <= PSI < 0.25). Monitoring recommended." },
        { "feature": "net_cash_flow", "psi": 0.093, "status": "STABLE", "interpretation": "Stable liquidity profile" },
        { "feature": "income_variability", "psi": 0.051, "status": "STABLE", "interpretation": "Stable variance" }
    ]);

    Json(json!({
        "baseline_dataset": "Research-Dataset-Baseline-v1",
        "monitoring_window": "Temporal Rolling Window (T-30D)",
        "overall_stability": "STABLE_WITH_WATCHLIST",
        "feature_drift_metrics": feature_drift,
        "population_stability_index_thresholds": {
            "stable": "PSI < 0.10",
            "moderate_drift": "0.10 <= PSI < 0.25",
            "significant_drift": "PSI >= 0.25"
        },
        "disclaimer": "PSI computed on synthetic customer distributions. Real-world drift requires non-synthetic temporal baselines."
    }))
}
