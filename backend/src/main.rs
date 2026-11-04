mod api;
mod config;
mod db;
mod domain;
mod features;
mod generator;
mod ml_client;
mod qa;

use api::system::AppState;
use config::AppConfig;
use ml_client::MlClient;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "credit_risk_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting AI Credit Risk Research & Dynamic Monitoring Platform Backend...");

    let config = AppConfig::load();
    let pool = db::init_pool(&config.database_url).await?;

    // Seed initial research dataset if empty
    let dataset_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM research_datasets")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    if dataset_count.0 == 0 {
        info!("No datasets found. Generating initial synthetic research dataset (Small, N=50)...");
        let gen = generator::SyntheticGenerator::new();
        let bundle = gen.generate_dataset("Research-Baseline-Dataset-v1", "small", 50, 42);

        let mut tx = pool.begin().await?;

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
        .await?;

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
            .await?;
        }

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
            .await?;
        }

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
            .await?;
        }

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
            .await?;
        }

        let calc = features::FeatureCalculator::new();
        for cust in &bundle.customers {
            let cust_txs: Vec<domain::BankTransaction> = bundle
                .transactions
                .iter()
                .filter(|t| t.customer_id == cust.id)
                .cloned()
                .collect();
            let cust_utils: Vec<domain::UtilityPayment> = bundle
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
            .await?;
        }

        tx.commit().await?;
        info!("Seeded 50 synthetic customers with full transaction histories & feature snapshots");
    }

    let ml_client = MlClient::new(config.ml_service_url.clone());
    let qa_db_url = std::env::var("QA_DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://data/qa_audit.db?mode=rwc".to_string());
    let qa_engine = match qa::QaEngine::init(&qa_db_url, config.ml_service_url.clone()).await {
        Ok(eng) => {
            info!("Autonomous QA & Audit Engine initialized at {}", qa_db_url);
            Some(eng)
        }
        Err(e) => {
            warn!("Could not initialize QA Engine ({}): {}", qa_db_url, e);
            None
        }
    };
    let state = Arc::new(AppState {
        pool,
        config: config.clone(),
        ml_client,
        qa_engine,
    });

    let app = api::build_router(state);

    // Bind listener with port fallback
    let mut target_port = config.port;
    let listener = loop {
        let addr = format!("{}:{}", config.host, target_port);
        match TcpListener::bind(&addr).await {
            Ok(l) => {
                info!("Server listening successfully on http://{}", addr);
                break l;
            }
            Err(e) => {
                warn!(
                    "Port {} unavailable ({}). Trying next port...",
                    target_port, e
                );
                target_port += 1;
                if target_port > config.port + 10 {
                    return Err(format!(
                        "Could not bind to any port in range {}-{}",
                        config.port, target_port
                    )
                    .into());
                }
            }
        }
    };

    println!("\n=======================================================");
    println!("  AI CREDIT RISK RESEARCH & MONITORING PLATFORM (RUST)");
    println!("  URL: http://127.0.0.1:{}", target_port);
    println!("  ML Service Target: {}", config.ml_service_url);
    println!("  Database: SQLite (WAL Active)");
    println!("  Disclaimers: Academic / Synthetic Prototype Only");
    println!("=======================================================\n");

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
