use crate::api::system::AppState;
use crate::domain::{
    CreditAssessment, FeatureSnapshot, ReviewRecord, ShapExplanation, SyntheticCustomer,
};
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
pub struct AssessmentListQuery {
    pub customer_id: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewRequest {
    pub reviewer_role: String, // "Senior Risk Underwriter", "Credit Committee"
    pub action: String,        // "CONFIRM", "OVERRIDE", "REQUEST_DATA"
    pub override_decision: Option<String>, // "APPROVE_SUPPORTED", "CAUTION_FLAGGED"
    pub justification: String,
    pub audit_notes: Option<String>,
}

pub async fn list_assessments(
    Query(query): Query<AssessmentListQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);

    let assessments: Vec<CreditAssessment> = if let Some(ref cid) = query.customer_id {
        sqlx::query_as("SELECT * FROM credit_assessments WHERE customer_id = ? ORDER BY assessed_at DESC LIMIT ?")
            .bind(cid)
            .bind(limit)
            .fetch_all(&state.pool)
            .await
    } else {
        sqlx::query_as("SELECT * FROM credit_assessments ORDER BY assessed_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&state.pool)
            .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "assessments": assessments })))
}

pub async fn evaluate_customer(
    Path(customer_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // 1. Get customer
    let customer: SyntheticCustomer =
        sqlx::query_as("SELECT * FROM synthetic_customers WHERE id = ?")
            .bind(&customer_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or_else(|| (StatusCode::NOT_FOUND, "Customer not found".to_string()))?;

    // 2. Get latest feature snapshot
    let snapshot: FeatureSnapshot = sqlx::query_as(
        "SELECT * FROM feature_snapshots WHERE customer_id = ? ORDER BY snapshot_date DESC LIMIT 1",
    )
    .bind(&customer_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "No feature snapshot found for customer".to_string(),
        )
    })?;

    // 3. Prepare feature map for ML client
    let mut feature_map = serde_json::Map::new();
    feature_map.insert(
        "avg_monthly_income".to_string(),
        json!(snapshot.avg_monthly_income),
    );
    feature_map.insert(
        "income_variability".to_string(),
        json!(snapshot.income_variability),
    );
    feature_map.insert(
        "monthly_expense".to_string(),
        json!(snapshot.monthly_expense),
    );
    feature_map.insert("net_cash_flow".to_string(), json!(snapshot.net_cash_flow));
    feature_map.insert("avg_balance".to_string(), json!(snapshot.avg_balance));
    feature_map.insert(
        "cash_flow_volatility".to_string(),
        json!(snapshot.cash_flow_volatility),
    );
    feature_map.insert(
        "expense_to_income_ratio".to_string(),
        json!(snapshot.expense_to_income_ratio),
    );
    feature_map.insert(
        "recurring_payment_consistency".to_string(),
        json!(snapshot.recurring_payment_consistency),
    );
    feature_map.insert(
        "utility_regularity_score".to_string(),
        json!(snapshot.utility_regularity_score),
    );
    feature_map.insert(
        "payment_burden_ratio".to_string(),
        json!(snapshot.payment_burden_ratio),
    );
    feature_map.insert(
        "transaction_frequency".to_string(),
        json!(snapshot.transaction_frequency),
    );
    feature_map.insert(
        "data_completeness_score".to_string(),
        json!(snapshot.data_completeness_score),
    );

    // 4. Call ML service
    let ml_result = state
        .ml_client
        .predict_risk(&customer_id, feature_map, Some("LightGBM".to_string()))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let assessment_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Ensure model version exists in model_versions
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO model_registry (id, name, algorithm, target_variable, description, created_at)
        VALUES ('model-lightgbm', 'LightGBM Credit Risk Model', 'LightGBM', 'is_defaulted', 'Research champion tree ensemble', ?)
        "#
    )
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO model_versions (id, model_id, version_tag, training_dataset_id, feature_schema, hyperparameters, random_seed, generator_version, artifact_path, is_active, created_at)
        VALUES (?, 'model-lightgbm', ?, ?, '[]', '{}', 42, 'v1.2.0-research', 'artifacts/model.joblib', 1, ?)
        "#
    )
    .bind(&ml_result.model_version)
    .bind(&ml_result.model_version)
    .bind(&customer.dataset_id)
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 5. Store assessment
    sqlx::query(
        r#"
        INSERT INTO credit_assessments (id, customer_id, feature_snapshot_id, model_version_id, probability_of_default, risk_category, recommendation, uncertainty_score, data_completeness, review_status, reviewer_notes, override_reason, assessed_at, is_synthetic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', NULL, NULL, ?, 1)
        "#
    )
    .bind(&assessment_id)
    .bind(&customer_id)
    .bind(&snapshot.id)
    .bind(&ml_result.model_version)
    .bind(ml_result.probability_of_default)
    .bind(&ml_result.risk_category)
    .bind(&ml_result.recommendation)
    .bind(ml_result.uncertainty_score)
    .bind(snapshot.data_completeness_score)
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 6. Store SHAP explanation
    let shap_id = Uuid::new_v4().to_string();
    let shap_json =
        serde_json::to_string(&ml_result.shap_contributions).unwrap_or_else(|_| "[]".to_string());
    let global_json =
        serde_json::to_string(&ml_result.global_importance).unwrap_or_else(|_| "[]".to_string());

    sqlx::query(
        r#"
        INSERT INTO shap_explanations (id, assessment_id, model_version_id, customer_id, base_value, feature_contributions, global_importance_rank, disclaimer, is_synthetic, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SHAP indicates feature attribution toward model output score, not causal impact or deterministic lending decisions.', 1, ?)
        "#
    )
    .bind(&shap_id)
    .bind(&assessment_id)
    .bind(&ml_result.model_version)
    .bind(&customer_id)
    .bind(ml_result.base_value)
    .bind(&shap_json)
    .bind(&global_json)
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 7. Audit log
    let audit_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO audit_logs (id, action_type, entity_name, entity_id, details, actor, timestamp)
        VALUES (?, 'ASSESSMENT_CREATED', 'credit_assessments', ?, ?, 'RESEARCH_RISK_ENGINE', ?)
        "#
    )
    .bind(audit_id)
    .bind(&assessment_id)
    .bind(json!({ "customer_code": customer.customer_code, "pd": ml_result.probability_of_default, "category": ml_result.risk_category }).to_string())
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "status": "ASSESSED",
        "assessment_id": assessment_id,
        "customer": {
            "id": customer.id,
            "code": customer.customer_code,
            "profile": customer.simulation_profile
        },
        "output": {
            "probability_of_default": ml_result.probability_of_default,
            "risk_category": ml_result.risk_category,
            "recommendation": ml_result.recommendation,
            "uncertainty_score": ml_result.uncertainty_score,
            "data_completeness": snapshot.data_completeness_score,
            "model_version": ml_result.model_version,
            "assessed_at": now
        },
        "shap": {
            "base_value": ml_result.base_value,
            "contributions": ml_result.shap_contributions,
            "global_importance": ml_result.global_importance,
            "disclaimer": "SHAP demonstrates mathematical attribution, not causal relationship. Academic simulation only."
        }
    })))
}

pub async fn get_assessment_detail(
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

    let shap: Option<ShapExplanation> =
        sqlx::query_as("SELECT * FROM shap_explanations WHERE assessment_id = ?")
            .bind(&assessment_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let reviews: Vec<ReviewRecord> = sqlx::query_as(
        "SELECT * FROM review_records WHERE assessment_id = ? ORDER BY reviewed_at DESC",
    )
    .bind(&assessment_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "assessment": assessment,
        "shap_explanation": shap,
        "reviews": reviews
    })))
}

pub async fn review_assessment(
    Path(assessment_id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ReviewRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut assessment: CreditAssessment =
        sqlx::query_as("SELECT * FROM credit_assessments WHERE id = ?")
            .bind(&assessment_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or_else(|| (StatusCode::NOT_FOUND, "Assessment not found".to_string()))?;

    let now = Utc::now().to_rfc3339();
    let review_id = Uuid::new_v4().to_string();

    let new_status = if payload.action == "OVERRIDE" {
        "OVERRIDDEN"
    } else {
        "REVIEWED_APPROVED"
    };

    // Store review record
    sqlx::query(
        r#"
        INSERT INTO review_records (id, assessment_id, reviewer_role, action, prior_decision, override_decision, justification, audit_notes, reviewed_at, is_synthetic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        "#
    )
    .bind(&review_id)
    .bind(&assessment_id)
    .bind(&payload.reviewer_role)
    .bind(&payload.action)
    .bind(&assessment.recommendation)
    .bind(&payload.override_decision)
    .bind(&payload.justification)
    .bind(&payload.audit_notes)
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update credit assessment
    sqlx::query(
        "UPDATE credit_assessments SET review_status = ?, reviewer_notes = ?, override_reason = ? WHERE id = ?"
    )
    .bind(new_status)
    .bind(format!("{}: {}", payload.reviewer_role, payload.justification))
    .bind(&payload.override_decision)
    .bind(&assessment_id)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Audit log
    let audit_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO audit_logs (id, action_type, entity_name, entity_id, details, actor, timestamp)
        VALUES (?, 'DECISION_OVERRIDDEN', 'credit_assessments', ?, ?, ?, ?)
        "#
    )
    .bind(audit_id)
    .bind(&assessment_id)
    .bind(json!({ "action": payload.action, "justification": payload.justification, "role": payload.reviewer_role }).to_string())
    .bind(&payload.reviewer_role)
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    assessment.review_status = new_status.to_string();

    Ok(Json(json!({
        "status": "REVIEW_RECORDED",
        "review_id": review_id,
        "assessment_id": assessment_id,
        "new_review_status": new_status,
        "justification": payload.justification
    })))
}
