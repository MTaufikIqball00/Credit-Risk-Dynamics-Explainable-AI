use crate::api::system::AppState;
use crate::domain::ResearchDataset;
use crate::features::FeatureCalculator;
use crate::generator::SyntheticGenerator;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct GenerateDatasetRequest {
    pub name: Option<String>,
    pub profile_type: Option<String>, // "small", "medium", "large"
    pub customer_count: Option<usize>,
    pub random_seed: Option<u64>,
}

pub async fn list_datasets(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let datasets: Vec<ResearchDataset> =
        sqlx::query_as("SELECT * FROM research_datasets ORDER BY created_at DESC")
            .fetch_all(&state.pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "datasets": datasets })))
}

pub async fn generate_dataset(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<GenerateDatasetRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile = payload.profile_type.unwrap_or_else(|| "small".to_string());
    let default_count = match profile.to_lowercase().as_str() {
        "large" => 500,
        "medium" => 150,
        _ => 50,
    };
    let count = payload
        .customer_count
        .unwrap_or(default_count)
        .clamp(10, 1000);
    let seed = payload.random_seed.unwrap_or(42);
    let name = payload
        .name
        .unwrap_or_else(|| format!("Research-Dataset-{}-{}", profile, seed));

    let generator = SyntheticGenerator::new();
    let bundle = generator.generate_dataset(&name, &profile, count, seed);

    let mut tx = state
        .pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 1. Insert dataset
    sqlx::query(
        r#"
        INSERT INTO research_datasets (id, name, version, description, profile_type, customer_count, random_seed, generator_version, data_dictionary, is_synthetic, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&bundle.dataset.id)
    .bind(&bundle.dataset.name)
    .bind(&bundle.dataset.version)
    .bind(&bundle.dataset.description)
    .bind(&bundle.dataset.profile_type)
    .bind(bundle.dataset.customer_count)
    .bind(bundle.dataset.random_seed)
    .bind(&bundle.dataset.generator_version)
    .bind(&bundle.dataset.data_dictionary)
    .bind(bundle.dataset.is_synthetic)
    .bind(&bundle.dataset.created_at)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Insert customers
    for cust in &bundle.customers {
        sqlx::query(
            r#"
            INSERT INTO synthetic_customers (id, dataset_id, customer_code, simulation_profile, employment_type, monthly_income, stated_monthly_expenses, credit_obligation_amount, existing_credit_lines, credit_history_months, synthetic_cohort, is_defaulted, default_reason, is_synthetic, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&cust.id)
        .bind(&cust.dataset_id)
        .bind(&cust.customer_code)
        .bind(&cust.simulation_profile)
        .bind(&cust.employment_type)
        .bind(cust.monthly_income)
        .bind(cust.stated_monthly_expenses)
        .bind(cust.credit_obligation_amount)
        .bind(cust.existing_credit_lines)
        .bind(cust.credit_history_months)
        .bind(&cust.synthetic_cohort)
        .bind(cust.is_defaulted)
        .bind(&cust.default_reason)
        .bind(cust.is_synthetic)
        .bind(&cust.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 3. Insert accounts
    for acc in &bundle.accounts {
        sqlx::query(
            r#"
            INSERT INTO synthetic_accounts (id, customer_id, account_number, account_type, current_balance, currency, status, is_synthetic, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&acc.id)
        .bind(&acc.customer_id)
        .bind(&acc.account_number)
        .bind(&acc.account_type)
        .bind(acc.current_balance)
        .bind(&acc.currency)
        .bind(&acc.status)
        .bind(acc.is_synthetic)
        .bind(&acc.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 4. Insert transactions
    for t in &bundle.transactions {
        sqlx::query(
            r#"
            INSERT INTO bank_transactions (id, account_id, customer_id, transaction_date, amount, direction, raw_description, cleaned_description, running_balance, is_synthetic, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&t.id)
        .bind(&t.account_id)
        .bind(&t.customer_id)
        .bind(&t.transaction_date)
        .bind(t.amount)
        .bind(&t.direction)
        .bind(&t.raw_description)
        .bind(&t.cleaned_description)
        .bind(t.running_balance)
        .bind(t.is_synthetic)
        .bind(&t.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 5. Insert utilities
    for u in &bundle.utilities {
        sqlx::query(
            r#"
            INSERT INTO utility_payments (id, customer_id, utility_type, billing_period, due_date, payment_date, bill_amount, paid_amount, payment_status, days_past_due, is_synthetic, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&u.id)
        .bind(&u.customer_id)
        .bind(&u.utility_type)
        .bind(&u.billing_period)
        .bind(&u.due_date)
        .bind(&u.payment_date)
        .bind(u.bill_amount)
        .bind(u.paid_amount)
        .bind(&u.payment_status)
        .bind(u.days_past_due)
        .bind(u.is_synthetic)
        .bind(&u.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 6. Compute Feature Snapshots for each customer
    let calc = FeatureCalculator::new();
    for cust in &bundle.customers {
        let cust_txs: Vec<crate::domain::BankTransaction> = bundle
            .transactions
            .iter()
            .filter(|t| t.customer_id == cust.id)
            .cloned()
            .collect();
        let cust_utils: Vec<crate::domain::UtilityPayment> = bundle
            .utilities
            .iter()
            .filter(|u| u.customer_id == cust.id)
            .cloned()
            .collect();

        let feat = calc.compute_for_customer(cust, &cust_txs, &cust_utils);

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
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 7. Insert Audit Log
    let audit_id = Uuid::new_v4().to_string();
    let audit_details = json!({
        "dataset_name": bundle.dataset.name,
        "customers_count": bundle.customers.len(),
        "transactions_count": bundle.transactions.len(),
        "utilities_count": bundle.utilities.len(),
        "random_seed": seed,
        "generator_version": bundle.dataset.generator_version
    });

    sqlx::query(
        r#"
        INSERT INTO audit_logs (id, action_type, entity_name, entity_id, details, actor, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(audit_id)
    .bind("DATASET_GENERATED")
    .bind("research_datasets")
    .bind(&bundle.dataset.id)
    .bind(audit_details.to_string())
    .bind("SYNTHETIC_DATA_LAB")
    .bind(Utc::now().to_rfc3339())
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "status": "SUCCESS",
        "dataset": bundle.dataset,
        "summary": {
            "customers_generated": bundle.customers.len(),
            "transactions_generated": bundle.transactions.len(),
            "utilities_generated": bundle.utilities.len(),
            "random_seed": seed,
            "disclaimer": "SYNTHETIC RESEARCH DATASET CREATED"
        }
    })))
}
