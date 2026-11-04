-- ====================================================================
-- AI CREDIT RISK RESEARCH & DYNAMIC MONITORING PLATFORM
-- Isolated QA & Empirical Audit Database Schema: 20261105_qa_schema.sql
-- Stored in isolated database: data/qa_audit.db
-- ====================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS qa_runs (
    id TEXT PRIMARY KEY,
    suite_mode TEXT NOT NULL,
    trigger_source TEXT NOT NULL, -- MANUAL, SCHEDULED_DAILY, SCHEDULED_WEEKLY, STARTUP_SMOKE, REGRESSION_CHANGE, RETRY
    status TEXT NOT NULL, -- QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED, INTERRUPTED
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    blocked_tests INTEGER NOT NULL DEFAULT 0,
    skipped_tests INTEGER NOT NULL DEFAULT 0,
    not_tested_count INTEGER NOT NULL DEFAULT 0,
    not_implemented_count INTEGER NOT NULL DEFAULT 0,
    not_configured_count INTEGER NOT NULL DEFAULT 0,
    commit_sha TEXT NOT NULL,
    environment_json TEXT NOT NULL,
    stdout_log TEXT NOT NULL DEFAULT '',
    stderr_log TEXT NOT NULL DEFAULT '',
    summary_json TEXT NOT NULL DEFAULT '{}',
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_test_cases (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    suite_mode TEXT NOT NULL,
    module_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    preconditions TEXT NOT NULL,
    input_json TEXT NOT NULL,
    expected_json TEXT NOT NULL,
    actual_json TEXT NOT NULL,
    assertion_text TEXT NOT NULL,
    status TEXT NOT NULL, -- PASS, FAIL, BLOCKED, SKIPPED, NOT_TESTED, NOT_IMPLEMENTED, NOT_CONFIGURED
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    commit_sha TEXT NOT NULL,
    environment_json TEXT NOT NULL,
    logs TEXT NOT NULL DEFAULT '',
    error_trace TEXT,
    screenshot_path TEXT,
    api_metadata_json TEXT,
    db_evidence_json TEXT,
    source_refs TEXT NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (run_id) REFERENCES qa_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_findings (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    finding_code TEXT NOT NULL,
    title TEXT NOT NULL,
    affected_feature TEXT NOT NULL,
    module_id TEXT NOT NULL,
    severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    classification TEXT NOT NULL, -- CONFIRMED_DEFECT, SUSPECTED_DEFECT, SPECIFICATION_GAP, ENVIRONMENT_BLOCKER
    reproduction_steps TEXT NOT NULL, -- JSON array
    expected_behavior TEXT NOT NULL,
    actual_behavior TEXT NOT NULL,
    evidence_refs TEXT NOT NULL, -- JSON
    root_cause_analysis TEXT NOT NULL,
    impact TEXT NOT NULL,
    recommended_correction TEXT NOT NULL,
    regression_test_rec TEXT NOT NULL,
    confidence_level TEXT NOT NULL, -- HIGH, MEDIUM, LOW, INSUFFICIENT_EVIDENCE
    confidence_explanation TEXT NOT NULL,
    remediation_status TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL', -- AWAITING_APPROVAL, APPROVED, REJECTED, APPLIED, VERIFIED
    proposed_patch_json TEXT NOT NULL, -- JSON with impacted_files, minimal_diff, regression_risk, rollback_instructions
    reviewer_decision_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES qa_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    suite_mode TEXT NOT NULL,
    schedule_type TEXT NOT NULL, -- STARTUP_SMOKE, DAILY_AUDIT, WEEKLY_COMPREHENSIVE, REGRESSION_ON_CHANGE, CUSTOM_INTERVAL
    cron_expression TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_id TEXT,
    last_run_at TEXT,
    next_run_at TEXT,
    last_commit_sha TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_remediation_logs (
    id TEXT PRIMARY KEY,
    finding_id TEXT NOT NULL,
    action TEXT NOT NULL, -- PROPOSED, APPROVED, REJECTED, ROLLBACK_NOTE
    actor TEXT NOT NULL,
    notes TEXT NOT NULL,
    before_evidence_json TEXT,
    after_evidence_json TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (finding_id) REFERENCES qa_findings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qa_runs_created ON qa_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_cases_run ON qa_test_cases(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_cases_test_id ON qa_test_cases(test_id);
CREATE INDEX IF NOT EXISTS idx_qa_cases_module ON qa_test_cases(module_id);
CREATE INDEX IF NOT EXISTS idx_qa_findings_run ON qa_findings(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_findings_severity ON qa_findings(severity);
