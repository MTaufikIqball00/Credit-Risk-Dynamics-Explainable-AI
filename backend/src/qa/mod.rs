pub mod analyzer;
pub mod api;
pub mod oracles;

use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::str::FromStr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tracing::{error, info, warn};
use uuid::Uuid;

pub const ALL_SUITE_MODES: &[&str] = &[
    "smoke_test",
    "frontend_functional",
    "rust_api_test",
    "database_integrity",
    "synthetic_data_validation",
    "feature_engineering_validation",
    "nlp_classification_test",
    "ml_training_evaluation_test",
    "model_comparison_test",
    "credit_risk_assessment_test",
    "shap_xai_validation",
    "dynamic_risk_monitoring_test",
    "psi_drift_validation",
    "fairness_audit",
    "experiment_reproducibility_test",
    "audit_trail_integrity_test",
    "security_test",
    "performance_test",
    "complete_system_audit",
];

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QaRunRecord {
    pub id: String,
    pub suite_mode: String,
    pub trigger_source: String,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_ms: i64,
    pub total_tests: i64,
    pub passed_tests: i64,
    pub failed_tests: i64,
    pub blocked_tests: i64,
    pub skipped_tests: i64,
    pub not_tested_count: i64,
    pub not_implemented_count: i64,
    pub not_configured_count: i64,
    pub commit_sha: String,
    pub environment_json: String,
    pub stdout_log: String,
    pub stderr_log: String,
    pub summary_json: String,
    pub is_synthetic: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QaTestCaseRecord {
    pub id: String,
    pub run_id: String,
    pub test_id: String,
    pub suite_mode: String,
    pub module_id: String,
    pub module_name: String,
    pub title: String,
    pub description: String,
    pub preconditions: String,
    pub input_json: String,
    pub expected_json: String,
    pub actual_json: String,
    pub assertion_text: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: String,
    pub duration_ms: i64,
    pub commit_sha: String,
    pub environment_json: String,
    pub logs: String,
    pub error_trace: Option<String>,
    pub screenshot_path: Option<String>,
    pub api_metadata_json: Option<String>,
    pub db_evidence_json: Option<String>,
    pub source_refs: String,
    pub is_synthetic: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QaFindingRecord {
    pub id: String,
    pub run_id: String,
    pub test_id: String,
    pub finding_code: String,
    pub title: String,
    pub affected_feature: String,
    pub module_id: String,
    pub severity: String,
    pub classification: String,
    pub reproduction_steps: String,
    pub expected_behavior: String,
    pub actual_behavior: String,
    pub evidence_refs: String,
    pub root_cause_analysis: String,
    pub impact: String,
    pub recommended_correction: String,
    pub regression_test_rec: String,
    pub confidence_level: String,
    pub confidence_explanation: String,
    pub remediation_status: String,
    pub proposed_patch_json: String,
    pub reviewer_decision_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QaScheduleRecord {
    pub id: String,
    pub name: String,
    pub suite_mode: String,
    pub schedule_type: String,
    pub cron_expression: String,
    pub interval_seconds: i64,
    pub enabled: i64,
    pub last_run_id: Option<String>,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub last_commit_sha: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QaRemediationLogRecord {
    pub id: String,
    pub finding_id: String,
    pub action: String,
    pub actor: String,
    pub notes: String,
    pub before_evidence_json: Option<String>,
    pub after_evidence_json: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone)]
pub struct QueuedQaJob {
    pub run_id: String,
    pub suite_mode: String,
    pub trigger_source: String,
}

#[derive(Clone)]
pub struct QaEngine {
    pub qa_pool: SqlitePool,
    pub job_tx: mpsc::UnboundedSender<QueuedQaJob>,
    pub active_suites: Arc<Mutex<HashSet<String>>>,
    pub cancel_flags: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    pub current_run_id: Arc<Mutex<Option<String>>>,
    pub queue_depth: Arc<Mutex<usize>>,
    pub ml_service_url: String,
}

pub fn detect_git_commit_sha() -> String {
    std::process::Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "workspace-20261104-uncommitted".to_string())
}

pub fn build_environment_json(ml_service_url: &str) -> String {
    json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "rust_pkg_version": env!("CARGO_PKG_VERSION"),
        "ml_service_url": ml_service_url,
        "isolated_qa_db": "data/qa_audit.db",
        "temp_db_dir": "data/qa_temp",
        "synthetic_only": true
    })
    .to_string()
}

impl QaEngine {
    pub async fn init(
        qa_db_url: &str,
        ml_service_url: String,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        if qa_db_url.starts_with("sqlite://") {
            let file_path = qa_db_url
                .trim_start_matches("sqlite://")
                .split('?')
                .next()
                .unwrap_or("data/qa_audit.db");
            if let Some(parent) = Path::new(file_path).parent() {
                if !parent.as_os_str().is_empty() {
                    fs::create_dir_all(parent)?;
                }
            }
        }
        fs::create_dir_all("data/qa_temp").ok();
        fs::create_dir_all("data/qa_evidence").ok();

        let connect_opts = SqliteConnectOptions::from_str(qa_db_url)?
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .foreign_keys(true);

        let qa_pool = SqlitePoolOptions::new()
            .max_connections(8)
            .connect_with(connect_opts)
            .await?;

        let schema_sql = include_str!("../../migrations/20261105_qa_schema.sql");
        sqlx::raw_sql(schema_sql).execute(&qa_pool).await?;

        // Recover any interrupted runs from prior crash/restart
        let now_str = Utc::now().to_rfc3339();
        let recovered = sqlx::query(
            r#"
            UPDATE qa_runs
            SET status = 'INTERRUPTED',
                completed_at = ?,
                stderr_log = stderr_log || ' [RECOVERY: Execution interrupted by application restart]'
            WHERE status IN ('RUNNING', 'QUEUED')
            "#,
        )
        .bind(&now_str)
        .execute(&qa_pool)
        .await?;

        if recovered.rows_affected() > 0 {
            warn!(
                "QA Engine recovered {} interrupted test run(s) after restart",
                recovered.rows_affected()
            );
        }

        // Seed default schedules if empty
        let sched_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM qa_schedules")
            .fetch_one(&qa_pool)
            .await
            .unwrap_or((0,));

        if sched_count.0 == 0 {
            let now = Utc::now();
            let commit = detect_git_commit_sha();
            let defaults = vec![
                (
                    "sched-startup-smoke",
                    "Startup Smoke Audit",
                    "smoke_test",
                    "STARTUP_SMOKE",
                    "@reboot",
                    0_i64,
                    1_i64,
                    Some(now.to_rfc3339()),
                ),
                (
                    "sched-daily-audit",
                    "Daily Automated System Audit",
                    "complete_system_audit",
                    "DAILY_AUDIT",
                    "0 2 * * *",
                    86400_i64,
                    1_i64,
                    Some((now + Duration::hours(24)).to_rfc3339()),
                ),
                (
                    "sched-weekly-comprehensive",
                    "Weekly Comprehensive QA & Fairness Audit",
                    "complete_system_audit",
                    "WEEKLY_COMPREHENSIVE",
                    "0 3 * * 0",
                    604800_i64,
                    1_i64,
                    Some((now + Duration::days(7)).to_rfc3339()),
                ),
                (
                    "sched-regression-commit",
                    "Post-Commit Regression Guard",
                    "complete_system_audit",
                    "REGRESSION_ON_CHANGE",
                    "*/15 * * * *",
                    900_i64,
                    1_i64,
                    Some((now + Duration::minutes(15)).to_rfc3339()),
                ),
            ];

            for (id, name, mode, stype, cron, interval, enabled, next_run) in defaults {
                sqlx::query(
                    r#"
                    INSERT INTO qa_schedules (id, name, suite_mode, schedule_type, cron_expression, interval_seconds, enabled, last_run_id, last_run_at, next_run_at, last_commit_sha, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
                    "#,
                )
                .bind(id)
                .bind(name)
                .bind(mode)
                .bind(stype)
                .bind(cron)
                .bind(interval)
                .bind(enabled)
                .bind(next_run)
                .bind(&commit)
                .bind(now.to_rfc3339())
                .bind(now.to_rfc3339())
                .execute(&qa_pool)
                .await?;
            }
        }

        let (job_tx, mut job_rx) = mpsc::unbounded_channel::<QueuedQaJob>();
        let active_suites = Arc::new(Mutex::new(HashSet::new()));
        let cancel_flags = Arc::new(Mutex::new(HashMap::new()));
        let current_run_id = Arc::new(Mutex::new(None));
        let queue_depth = Arc::new(Mutex::new(0usize));

        let engine = Self {
            qa_pool: qa_pool.clone(),
            job_tx,
            active_suites: active_suites.clone(),
            cancel_flags: cancel_flags.clone(),
            current_run_id: current_run_id.clone(),
            queue_depth: queue_depth.clone(),
            ml_service_url: ml_service_url.clone(),
        };

        // Spawn Background Execution Worker
        let worker_engine = engine.clone();
        tokio::spawn(async move {
            info!("Autonomous QA Background Worker started.");
            while let Some(job) = job_rx.recv().await {
                {
                    let mut q = worker_engine.queue_depth.lock().await;
                    *q = q.saturating_sub(1);
                }
                {
                    let mut cur = worker_engine.current_run_id.lock().await;
                    *cur = Some(job.run_id.clone());
                }

                let cancel_flag = {
                    let flags = worker_engine.cancel_flags.lock().await;
                    flags
                        .get(&job.run_id)
                        .cloned()
                        .unwrap_or_else(|| Arc::new(AtomicBool::new(false)))
                };

                if cancel_flag.load(Ordering::SeqCst) {
                    let now_s = Utc::now().to_rfc3339();
                    let _ = sqlx::query(
                        "UPDATE qa_runs SET status = 'CANCELLED', completed_at = ? WHERE id = ?",
                    )
                    .bind(&now_s)
                    .bind(&job.run_id)
                    .execute(&worker_engine.qa_pool)
                    .await;
                } else {
                    // Apply overall suite timeout (180 seconds)
                    let exec_res = tokio::time::timeout(
                        std::time::Duration::from_secs(180),
                        oracles::execute_qa_run(&worker_engine, &job, cancel_flag.clone()),
                    )
                    .await;

                    if exec_res.is_err() {
                        error!("QA run {} timed out after 180s", job.run_id);
                        let now_s = Utc::now().to_rfc3339();
                        let _ = sqlx::query(
                            "UPDATE qa_runs SET status = 'FAILED', completed_at = ?, stderr_log = stderr_log || '\n[TIMEOUT] Execution exceeded 180s limit' WHERE id = ?",
                        )
                        .bind(&now_s)
                        .bind(&job.run_id)
                        .execute(&worker_engine.qa_pool)
                        .await;
                    }
                }

                // Cleanup lock & flags
                {
                    let mut cur = worker_engine.current_run_id.lock().await;
                    *cur = None;
                }
                {
                    let mut suites = worker_engine.active_suites.lock().await;
                    suites.remove(&job.suite_mode);
                }
                {
                    let mut flags = worker_engine.cancel_flags.lock().await;
                    flags.remove(&job.run_id);
                }
            }
        });

        // Spawn Background Scheduler Loop
        let sched_engine = engine.clone();
        tokio::spawn(async move {
            // Check if no runs exist yet; if so, trigger initial complete_system_audit automatically
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM qa_runs")
                .fetch_one(&sched_engine.qa_pool)
                .await
                .unwrap_or((0,));
            if count.0 == 0 {
                info!("No prior QA runs found. Enqueueing initial startup Complete System Audit...");
                let _ = sched_engine
                    .enqueue_run("complete_system_audit", "STARTUP_SMOKE")
                    .await;
            }

            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                let schedules: Vec<QaScheduleRecord> =
                    sqlx::query_as("SELECT * FROM qa_schedules WHERE enabled = 1")
                        .fetch_all(&sched_engine.qa_pool)
                        .await
                        .unwrap_or_default();

                let now = Utc::now();
                let current_commit = detect_git_commit_sha();

                for sched in schedules {
                    if sched.schedule_type == "REGRESSION_ON_CHANGE" {
                        if let Some(ref last_sha) = sched.last_commit_sha {
                            if last_sha != &current_commit {
                                if let Ok(run_id) = sched_engine
                                    .enqueue_run(&sched.suite_mode, "REGRESSION_CHANGE")
                                    .await
                                {
                                    let _ = sqlx::query(
                                        "UPDATE qa_schedules SET last_run_id = ?, last_run_at = ?, last_commit_sha = ?, updated_at = ? WHERE id = ?",
                                    )
                                    .bind(&run_id)
                                    .bind(now.to_rfc3339())
                                    .bind(&current_commit)
                                    .bind(now.to_rfc3339())
                                    .bind(&sched.id)
                                    .execute(&sched_engine.qa_pool)
                                    .await;
                                }
                            }
                        }
                    } else if sched.interval_seconds > 0 {
                        let due = sched
                            .next_run_at
                            .as_ref()
                            .and_then(|ts| chrono::DateTime::parse_from_rfc3339(ts).ok())
                            .map(|dt| dt.with_timezone(&Utc) <= now)
                            .unwrap_or(false);

                        if due {
                            if let Ok(run_id) = sched_engine
                                .enqueue_run(&sched.suite_mode, &sched.schedule_type)
                                .await
                            {
                                let next_dt =
                                    now + Duration::seconds(sched.interval_seconds.max(60));
                                let _ = sqlx::query(
                                    "UPDATE qa_schedules SET last_run_id = ?, last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?",
                                )
                                .bind(&run_id)
                                .bind(now.to_rfc3339())
                                .bind(next_dt.to_rfc3339())
                                .bind(now.to_rfc3339())
                                .bind(&sched.id)
                                .execute(&sched_engine.qa_pool)
                                .await;
                            }
                        }
                    }
                }
            }
        });

        Ok(engine)
    }

    pub async fn enqueue_run(
        &self,
        suite_mode: &str,
        trigger_source: &str,
    ) -> Result<String, String> {
        let mode = suite_mode.trim().to_lowercase();
        if !ALL_SUITE_MODES.contains(&mode.as_str()) {
            return Err(format!("Unsupported QA suite_mode: {}", suite_mode));
        }

        // Prevent duplicate concurrent execution of the same suite
        {
            let mut active = self.active_suites.lock().await;
            if active.contains(&mode) || active.contains("complete_system_audit") {
                return Err(format!(
                    "Exclusive suite '{}' or complete_system_audit is already queued or running",
                    mode
                ));
            }
            active.insert(mode.clone());
        }

        let run_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let commit_sha = detect_git_commit_sha();
        let env_json = build_environment_json(&self.ml_service_url);

        sqlx::query(
            r#"
            INSERT INTO qa_runs (id, suite_mode, trigger_source, status, started_at, completed_at, duration_ms, total_tests, passed_tests, failed_tests, blocked_tests, skipped_tests, not_tested_count, not_implemented_count, not_configured_count, commit_sha, environment_json, stdout_log, stderr_log, summary_json, is_synthetic, created_at)
            VALUES (?, ?, ?, 'QUEUED', NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, '', '', '{}', 1, ?)
            "#,
        )
        .bind(&run_id)
        .bind(&mode)
        .bind(trigger_source)
        .bind(&commit_sha)
        .bind(&env_json)
        .bind(&now)
        .execute(&self.qa_pool)
        .await
        .map_err(|e| e.to_string())?;

        {
            let mut flags = self.cancel_flags.lock().await;
            flags.insert(run_id.clone(), Arc::new(AtomicBool::new(false)));
        }
        {
            let mut q = self.queue_depth.lock().await;
            *q += 1;
        }

        self.job_tx
            .send(QueuedQaJob {
                run_id: run_id.clone(),
                suite_mode: mode,
                trigger_source: trigger_source.to_string(),
            })
            .map_err(|e| e.to_string())?;

        Ok(run_id)
    }

    pub async fn cancel_run(&self, run_id: &str) -> Result<bool, String> {
        let flag_opt = {
            let flags = self.cancel_flags.lock().await;
            flags.get(run_id).cloned()
        };
        if let Some(flag) = flag_opt {
            flag.store(true, Ordering::SeqCst);
            let now = Utc::now().to_rfc3339();
            sqlx::query(
                "UPDATE qa_runs SET status = 'CANCELLED', completed_at = ? WHERE id = ? AND status IN ('QUEUED', 'RUNNING')",
            )
            .bind(&now)
            .bind(run_id)
            .execute(&self.qa_pool)
            .await
            .map_err(|e| e.to_string())?;
            Ok(true)
        } else {
            Ok(false)
        }
    }
}
