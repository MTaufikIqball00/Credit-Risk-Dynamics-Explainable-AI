use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ResearchDataset {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub profile_type: String,
    pub customer_count: i64,
    pub random_seed: i64,
    pub generator_version: String,
    pub data_dictionary: String,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyntheticCustomer {
    pub id: String,
    pub dataset_id: String,
    pub customer_code: String,
    pub simulation_profile: String,
    pub employment_type: String,
    pub monthly_income: f64,
    pub stated_monthly_expenses: f64,
    pub credit_obligation_amount: f64,
    pub existing_credit_lines: i64,
    pub credit_history_months: i64,
    pub synthetic_cohort: String,
    pub is_defaulted: i64,
    pub default_reason: Option<String>,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyntheticAccount {
    pub id: String,
    pub customer_id: String,
    pub account_number: String,
    pub account_type: String,
    pub current_balance: f64,
    pub currency: String,
    pub status: String,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BankTransaction {
    pub id: String,
    pub account_id: String,
    pub customer_id: String,
    pub transaction_date: String,
    pub amount: f64,
    pub direction: String,
    pub raw_description: String,
    pub cleaned_description: String,
    pub running_balance: f64,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UtilityPayment {
    pub id: String,
    pub customer_id: String,
    pub utility_type: String,
    pub billing_period: String,
    pub due_date: String,
    pub payment_date: Option<String>,
    pub bill_amount: f64,
    pub paid_amount: f64,
    pub payment_status: String,
    pub days_past_due: i64,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FeatureSnapshot {
    pub id: String,
    pub customer_id: String,
    pub snapshot_date: String,
    pub feature_version: String,
    pub avg_monthly_income: f64,
    pub income_variability: f64,
    pub monthly_expense: f64,
    pub net_cash_flow: f64,
    pub avg_balance: f64,
    pub cash_flow_volatility: f64,
    pub expense_to_income_ratio: f64,
    pub recurring_payment_consistency: f64,
    pub utility_regularity_score: f64,
    pub payment_burden_ratio: f64,
    pub transaction_frequency: f64,
    pub data_completeness_score: f64,
    pub features_json: String,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CreditAssessment {
    pub id: String,
    pub customer_id: String,
    pub feature_snapshot_id: String,
    pub model_version_id: String,
    pub probability_of_default: f64,
    pub risk_category: String,
    pub recommendation: String,
    pub uncertainty_score: f64,
    pub data_completeness: f64,
    pub review_status: String,
    pub reviewer_notes: Option<String>,
    pub override_reason: Option<String>,
    pub assessed_at: String,
    pub is_synthetic: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ModelRegistryItem {
    pub id: String,
    pub name: String,
    pub algorithm: String,
    pub target_variable: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ModelVersionItem {
    pub id: String,
    pub model_id: String,
    pub version_tag: String,
    pub training_dataset_id: String,
    pub feature_schema: String,
    pub hyperparameters: String,
    pub random_seed: i64,
    pub generator_version: String,
    pub artifact_path: String,
    pub is_active: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ModelEvaluationItem {
    pub id: String,
    pub model_version_id: String,
    pub experiment_id: Option<String>,
    pub dataset_id: String,
    pub roc_auc: f64,
    pub pr_auc: f64,
    pub f1_score: f64,
    pub precision: f64,
    pub recall: f64,
    pub brier_score: f64,
    pub log_loss: f64,
    pub calibration_metrics: String,
    pub confusion_matrix: String,
    pub threshold_analysis: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ShapExplanation {
    pub id: String,
    pub assessment_id: String,
    pub model_version_id: String,
    pub customer_id: String,
    pub base_value: f64,
    pub feature_contributions: String,
    pub global_importance_rank: String,
    pub disclaimer: String,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MonitoringEvent {
    pub id: String,
    pub customer_id: String,
    pub event_type: String,
    pub event_severity: String,
    pub description: String,
    pub event_payload: String,
    pub triggered_at: String,
    pub is_synthetic: i64,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DriftReport {
    pub id: String,
    pub dataset_baseline_id: String,
    pub dataset_current_id: String,
    pub feature_name: String,
    pub psi_score: f64,
    pub drift_status: String,
    pub distribution_shift: String,
    pub calculated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReassessmentHistoryItem {
    pub id: String,
    pub customer_id: String,
    pub monitoring_event_id: Option<String>,
    pub previous_assessment_id: String,
    pub new_assessment_id: String,
    pub prior_pd: f64,
    pub new_pd: f64,
    pub pd_delta: f64,
    pub prior_risk_category: String,
    pub new_risk_category: String,
    pub trigger_reason: String,
    pub reassessed_at: String,
    pub is_synthetic: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewRecord {
    pub id: String,
    pub assessment_id: String,
    pub reviewer_role: String,
    pub action: String,
    pub prior_decision: String,
    pub override_decision: Option<String>,
    pub justification: String,
    pub audit_notes: Option<String>,
    pub reviewed_at: String,
    pub is_synthetic: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLogItem {
    pub id: String,
    pub action_type: String,
    pub entity_name: String,
    pub entity_id: String,
    pub details: String,
    pub actor: String,
    pub timestamp: String,
}
