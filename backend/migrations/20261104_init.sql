-- ====================================================================
-- AI CREDIT RISK RESEARCH & DYNAMIC MONITORING PLATFORM
-- Schema Migration: 20261104_init.sql
-- All entities mark synthetic records with is_synthetic = 1
-- ====================================================================

-- 1. research_datasets
CREATE TABLE IF NOT EXISTS research_datasets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    profile_type TEXT NOT NULL, -- small, medium, large
    customer_count INTEGER NOT NULL,
    random_seed INTEGER NOT NULL,
    generator_version TEXT NOT NULL,
    data_dictionary TEXT NOT NULL, -- JSON
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 2. synthetic_customers
CREATE TABLE IF NOT EXISTS synthetic_customers (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    customer_code TEXT NOT NULL UNIQUE,
    simulation_profile TEXT NOT NULL, -- Stable Income, Variable Income, Irregular Income, High Expense Burden, Consistent Payment, Irregular Payment, Thin-file, No Credit History
    employment_type TEXT NOT NULL,
    monthly_income REAL NOT NULL,
    stated_monthly_expenses REAL NOT NULL,
    credit_obligation_amount REAL NOT NULL,
    existing_credit_lines INTEGER NOT NULL,
    credit_history_months INTEGER NOT NULL,
    synthetic_cohort TEXT NOT NULL, -- research audit cohort: Group_A, Group_B, Group_C
    is_defaulted INTEGER NOT NULL DEFAULT 0,
    default_reason TEXT,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES research_datasets(id) ON DELETE CASCADE
);

-- 3. synthetic_accounts
CREATE TABLE IF NOT EXISTS synthetic_accounts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    account_number TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL, -- Checking, Savings, Credit
    current_balance REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE
);

-- 4. bank_transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    amount REAL NOT NULL,
    direction TEXT NOT NULL, -- CREDIT, DEBIT
    raw_description TEXT NOT NULL,
    cleaned_description TEXT NOT NULL,
    running_balance REAL NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES synthetic_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE
);

-- 5. utility_payments
CREATE TABLE IF NOT EXISTS utility_payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    utility_type TEXT NOT NULL, -- Electricity (PLN), Water (PDAM), Internet/Telco
    billing_period TEXT NOT NULL,
    due_date TEXT NOT NULL,
    payment_date TEXT,
    bill_amount REAL NOT NULL,
    paid_amount REAL NOT NULL,
    payment_status TEXT NOT NULL, -- ON_TIME, LATE, MISSED
    days_past_due INTEGER NOT NULL DEFAULT 0,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE
);

-- 6. transaction_classifications
CREATE TABLE IF NOT EXISTS transaction_classifications (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence REAL NOT NULL,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    is_low_confidence INTEGER NOT NULL DEFAULT 0,
    classification_metadata TEXT, -- JSON
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES bank_transactions(id) ON DELETE CASCADE
);

-- 7. feature_snapshots
CREATE TABLE IF NOT EXISTS feature_snapshots (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    feature_version TEXT NOT NULL,
    avg_monthly_income REAL NOT NULL,
    income_variability REAL NOT NULL,
    monthly_expense REAL NOT NULL,
    net_cash_flow REAL NOT NULL,
    avg_balance REAL NOT NULL,
    cash_flow_volatility REAL NOT NULL,
    expense_to_income_ratio REAL NOT NULL,
    recurring_payment_consistency REAL NOT NULL,
    utility_regularity_score REAL NOT NULL,
    payment_burden_ratio REAL NOT NULL,
    transaction_frequency REAL NOT NULL,
    data_completeness_score REAL NOT NULL,
    features_json TEXT NOT NULL, -- Complete dictionary of features with unit & formula
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE
);

-- 8. credit_assessments
CREATE TABLE IF NOT EXISTS credit_assessments (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    feature_snapshot_id TEXT NOT NULL,
    model_version_id TEXT NOT NULL,
    probability_of_default REAL NOT NULL,
    risk_category TEXT NOT NULL, -- LOW, MODERATE, HIGH, VERY_HIGH
    recommendation TEXT NOT NULL, -- APPROVE_SUPPORTED, REVIEW_RECOMMENDED, CAUTION_FLAGGED
    uncertainty_score REAL NOT NULL DEFAULT 0.0,
    data_completeness REAL NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, REVIEWED_APPROVED, REVIEWED_REJECTED, OVERRIDDEN
    reviewer_notes TEXT,
    override_reason TEXT,
    assessed_at TEXT NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_snapshot_id) REFERENCES feature_snapshots(id) ON DELETE CASCADE
);

-- 9. model_registry
CREATE TABLE IF NOT EXISTS model_registry (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    algorithm TEXT NOT NULL, -- LightGBM, XGBoost, Baseline_LogReg
    target_variable TEXT NOT NULL DEFAULT 'is_defaulted',
    description TEXT,
    created_at TEXT NOT NULL
);

-- 10. model_versions
CREATE TABLE IF NOT EXISTS model_versions (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    version_tag TEXT NOT NULL,
    training_dataset_id TEXT NOT NULL,
    feature_schema TEXT NOT NULL, -- JSON
    hyperparameters TEXT NOT NULL, -- JSON
    random_seed INTEGER NOT NULL,
    generator_version TEXT NOT NULL,
    artifact_path TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (model_id) REFERENCES model_registry(id) ON DELETE CASCADE,
    FOREIGN KEY (training_dataset_id) REFERENCES research_datasets(id) ON DELETE CASCADE
);

-- 11. model_experiments
CREATE TABLE IF NOT EXISTS model_experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_version_id TEXT NOT NULL,
    status TEXT NOT NULL, -- QUEUED, RUNNING, COMPLETED, FAILED
    split_strategy TEXT NOT NULL, -- TEMPORAL_OUT_OF_TIME, STRATIFIED_K_FOLD
    started_at TEXT NOT NULL,
    completed_at TEXT,
    notes TEXT,
    FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE CASCADE
);

-- 12. model_evaluations
CREATE TABLE IF NOT EXISTS model_evaluations (
    id TEXT PRIMARY KEY,
    model_version_id TEXT NOT NULL,
    experiment_id TEXT,
    dataset_id TEXT NOT NULL,
    roc_auc REAL NOT NULL,
    pr_auc REAL NOT NULL,
    f1_score REAL NOT NULL,
    precision REAL NOT NULL,
    recall REAL NOT NULL,
    brier_score REAL NOT NULL,
    log_loss REAL NOT NULL,
    calibration_metrics TEXT NOT NULL, -- JSON bins
    confusion_matrix TEXT NOT NULL, -- JSON
    threshold_analysis TEXT NOT NULL, -- JSON
    created_at TEXT NOT NULL,
    FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE CASCADE
);

-- 13. shap_explanations
CREATE TABLE IF NOT EXISTS shap_explanations (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    model_version_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    base_value REAL NOT NULL,
    feature_contributions TEXT NOT NULL, -- JSON array of {feature, value, contribution, direction}
    global_importance_rank TEXT NOT NULL, -- JSON
    disclaimer TEXT NOT NULL DEFAULT 'SHAP reflects feature attribution toward model score, not causal impact or deterministic lending decisions.',
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (assessment_id) REFERENCES credit_assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE
);

-- 14. monitoring_events
CREATE TABLE IF NOT EXISTS monitoring_events (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- INCOME_DROP, EXPENSE_SURGE, BALANCE_DEPLETION, MISSED_UTILITY, VOLATILITY_SPIKE
    event_severity TEXT NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    description TEXT NOT NULL,
    event_payload TEXT NOT NULL, -- JSON
    triggered_at TEXT NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE
);

-- 15. drift_reports
CREATE TABLE IF NOT EXISTS drift_reports (
    id TEXT PRIMARY KEY,
    dataset_baseline_id TEXT NOT NULL,
    dataset_current_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    psi_score REAL NOT NULL,
    drift_status TEXT NOT NULL, -- STABLE, MODERATE_DRIFT, SIGNIFICANT_DRIFT
    distribution_shift TEXT NOT NULL, -- JSON
    calculated_at TEXT NOT NULL,
    FOREIGN KEY (dataset_baseline_id) REFERENCES research_datasets(id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_current_id) REFERENCES research_datasets(id) ON DELETE CASCADE
);

-- 16. reassessment_history
CREATE TABLE IF NOT EXISTS reassessment_history (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    monitoring_event_id TEXT,
    previous_assessment_id TEXT NOT NULL,
    new_assessment_id TEXT NOT NULL,
    prior_pd REAL NOT NULL,
    new_pd REAL NOT NULL,
    pd_delta REAL NOT NULL,
    prior_risk_category TEXT NOT NULL,
    new_risk_category TEXT NOT NULL,
    trigger_reason TEXT NOT NULL,
    reassessed_at TEXT NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (customer_id) REFERENCES synthetic_customers(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_assessment_id) REFERENCES credit_assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (new_assessment_id) REFERENCES credit_assessments(id) ON DELETE CASCADE
);

-- 17. review_records
CREATE TABLE IF NOT EXISTS review_records (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    action TEXT NOT NULL, -- CONFIRM, OVERRIDE, REQUEST_DATA, ESCALATE
    prior_decision TEXT NOT NULL,
    override_decision TEXT,
    justification TEXT NOT NULL,
    audit_notes TEXT,
    reviewed_at TEXT NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (assessment_id) REFERENCES credit_assessments(id) ON DELETE CASCADE
);

-- 18. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL, -- DATASET_GENERATED, MODEL_TRAINED, ASSESSMENT_CREATED, REASSESSMENT_TRIGGERED, DECISION_OVERRIDDEN, FAIRNESS_AUDITED
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL, -- JSON
    actor TEXT NOT NULL DEFAULT 'SYSTEM_ORCHESTRATOR',
    timestamp TEXT NOT NULL
);

-- Indexes for performance & query isolation
CREATE INDEX IF NOT EXISTS idx_customers_dataset ON synthetic_customers(dataset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON bank_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_utilities_customer ON utility_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_features_customer ON feature_snapshots(customer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_customer ON credit_assessments(customer_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_customer ON monitoring_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type);
