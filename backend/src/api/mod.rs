pub mod assessments;
pub mod customers;
pub mod datasets;
pub mod experiments;
pub mod fairness;
pub mod features;
pub mod models;
pub mod monitoring;
pub mod nlp;
pub mod system;
pub mod transactions;
pub mod xai;

use axum::routing::{get, post};
use axum::Router;
use std::sync::Arc;
use system::AppState;
use tower_http::cors::{Any, CorsLayer};

pub fn build_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // System & Overview
        .route("/api/health", get(system::health_check))
        .route("/api/overview", get(system::get_overview))
        .route("/api/audit-logs", get(system::list_audit_logs))
        // Datasets & Synthetic Laboratory
        .route("/api/datasets", get(datasets::list_datasets))
        .route("/api/generator/generate", post(datasets::generate_dataset))
        // Customers & Ingestion
        .route("/api/customers", get(customers::list_customers))
        .route("/api/customers/:id", get(customers::get_customer_detail))
        // Transactions
        .route("/api/transactions", get(transactions::list_transactions))
        // Features
        .route("/api/features", get(features::list_features))
        .route(
            "/api/features/compute/:customer_id",
            post(features::compute_features),
        )
        // NLP Transaction Intelligence
        .route("/api/nlp/classify", post(nlp::classify_transaction))
        .route("/api/nlp/models", get(nlp::get_nlp_models))
        .route("/api/nlp/evaluate", get(nlp::get_nlp_evaluation))
        // Credit Risk Modeling & Comparison
        .route("/api/models", get(models::list_models))
        .route("/api/models/train", post(models::train_model))
        .route("/api/models/compare", get(models::compare_models))
        // Credit Decision Support Assessments
        .route("/api/assessments", get(assessments::list_assessments))
        .route(
            "/api/assessments/evaluate/:customer_id",
            post(assessments::evaluate_customer),
        )
        .route(
            "/api/assessments/:id",
            get(assessments::get_assessment_detail),
        )
        .route(
            "/api/assessments/:id/review",
            post(assessments::review_assessment),
        )
        // Explainable AI Workspace
        .route("/api/xai/shap/:assessment_id", get(xai::get_shap_workspace))
        // Dynamic Risk Monitoring & Drift
        .route(
            "/api/monitoring/events",
            get(monitoring::list_monitoring_events),
        )
        .route(
            "/api/monitoring/simulate",
            post(monitoring::simulate_temporal_event),
        )
        .route(
            "/api/monitoring/timeline/:customer_id",
            get(monitoring::get_monitoring_timeline),
        )
        .route("/api/monitoring/drift", get(monitoring::get_drift_report))
        // Fairness & Research Validation
        .route("/api/fairness/report", get(fairness::get_fairness_report))
        // Experiments History
        .route("/api/experiments", get(experiments::list_experiments))
        // Autonomous QA & Empirical Audit Engine
        .route("/api/qa/overview", get(crate::qa::api::get_qa_overview))
        .route("/api/qa/runs", get(crate::qa::api::list_qa_runs))
        .route("/api/qa/runs/trigger", post(crate::qa::api::trigger_qa_run))
        .route("/api/qa/runs/compare", get(crate::qa::api::compare_qa_runs))
        .route(
            "/api/qa/runs/ingest-external",
            post(crate::qa::api::ingest_external_results),
        )
        .route("/api/qa/runs/:id", get(crate::qa::api::get_qa_run_detail))
        .route(
            "/api/qa/runs/:id/cancel",
            post(crate::qa::api::cancel_qa_run),
        )
        .route("/api/qa/runs/:id/retry", post(crate::qa::api::retry_qa_run))
        .route("/api/qa/test-cases", get(crate::qa::api::list_qa_test_cases))
        .route("/api/qa/findings", get(crate::qa::api::list_qa_findings))
        .route(
            "/api/qa/findings/:id/remediation",
            post(crate::qa::api::submit_remediation_decision),
        )
        .route(
            "/api/qa/schedules",
            get(crate::qa::api::list_qa_schedules).post(crate::qa::api::update_qa_schedule),
        )
        .route(
            "/api/qa/reports/export",
            get(crate::qa::api::export_qa_report),
        )
        .layer(cors)
        .with_state(state)
}
