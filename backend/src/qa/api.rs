use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;

use crate::api::system::AppState;
use super::{
    analyzer::analyze_and_record_findings, build_environment_json, detect_git_commit_sha,
    QaFindingRecord, QaRemediationLogRecord, QaRunRecord, QaScheduleRecord, QaTestCaseRecord,
    ALL_SUITE_MODES,
};

const DOCUMENTED_MODULES: &[(&str, &str, &str)] = &[
    ("M01", "1. Synthetic Data Laboratory", "IMPLEMENTED"),
    ("M02", "2. Synthetic Customer Explorer", "IMPLEMENTED"),
    ("M03", "3. Feature Engineering", "PARTIAL_EMBEDDED"),
    ("M04", "4. Transaction NLP Intelligence", "IMPLEMENTED"),
    ("M05", "5. Model Research Laboratory", "IMPLEMENTED"),
    ("M06", "6. Model Benchmark Comparison", "IMPLEMENTED"),
    ("M07", "7. Credit Risk Decision Support", "IMPLEMENTED"),
    ("M08", "8. Explainable AI Workspace", "IMPLEMENTED"),
    ("M09", "9. Dynamic Risk Monitoring", "IMPLEMENTED"),
    ("M10", "10. Fairness & Research Bias Validation", "IMPLEMENTED"),
    ("M11", "11. Experiment Reproducibility & Audit Trail", "IMPLEMENTED"),
    ("M12", "12. System Settings & Diagnostics", "IMPLEMENTED"),
];

pub async fn get_qa_overview(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };

    let runs = fetch_runs(&qa.qa_pool, 30).await;
    let latest_run = runs
        .iter()
        .find(|r| r.status == "COMPLETED" || r.status == "FAILED")
        .cloned()
        .or_else(|| runs.first().cloned());

    let current_run_id = qa.current_run_id.lock().await.clone();
    let active_suites: Vec<String> = qa.active_suites.lock().await.iter().cloned().collect();
    let queue_depth = *qa.queue_depth.lock().await;

    let (
        latest_total,
        latest_passed,
        latest_failed,
        latest_blocked,
        latest_skipped,
        latest_not_tested,
        latest_not_impl,
        latest_not_conf,
        pass_rate_pct,
        target_run_id,
    ) = if let Some(ref r) = latest_run {
        let rate = if r.total_tests > 0 {
            ((r.passed_tests as f64 / r.total_tests as f64) * 1000.0).round() / 10.0
        } else {
            0.0
        };
        (
            r.total_tests,
            r.passed_tests,
            r.failed_tests,
            r.blocked_tests,
            r.skipped_tests,
            r.not_tested_count,
            r.not_implemented_count,
            r.not_configured_count,
            rate,
            r.id.clone(),
        )
    } else {
        (0, 0, 0, 0, 0, 0, 0, 0, 0.0, String::new())
    };

    let findings = if !target_run_id.is_empty() {
        fetch_findings(&qa.qa_pool, Some(&target_run_id), None, None).await
    } else {
        Vec::new()
    };

    let crit = findings.iter().filter(|f| f.severity == "CRITICAL").count();
    let high = findings.iter().filter(|f| f.severity == "HIGH").count();
    let med = findings.iter().filter(|f| f.severity == "MEDIUM").count();
    let low = findings.iter().filter(|f| f.severity == "LOW").count();
    let info = findings.iter().filter(|f| f.severity == "INFORMATIONAL").count();

    let overall_health = if latest_run.is_none() {
        "NEVER_AUDITED"
    } else if crit > 0 {
        "CRITICAL_FAILURES"
    } else if high > 0 || med > 0 || latest_failed > 0 {
        "ISSUES_DETECTED"
    } else {
        "HEALTHY"
    };

    let cases = if !target_run_id.is_empty() {
        fetch_test_cases(&qa.qa_pool, Some(&target_run_id), None, None, None, None).await
    } else {
        Vec::new()
    };

    let mut module_coverage = Vec::new();
    for (mod_id, mod_name, impl_status) in DOCUMENTED_MODULES {
        let mod_cases: Vec<&QaTestCaseRecord> = cases
            .iter()
            .filter(|c| c.module_id == *mod_id || c.module_id.starts_with(mod_id))
            .collect();
        let total_c = mod_cases.len();
        let pass_c = mod_cases.iter().filter(|c| c.status == "PASS").count();
        let fail_c = mod_cases.iter().filter(|c| c.status == "FAIL").count();
        let not_impl_c = mod_cases
            .iter()
            .filter(|c| c.status == "NOT_IMPLEMENTED")
            .count();
        let cov_pct = if total_c > 0 {
            ((pass_c as f64 / total_c as f64) * 1000.0).round() / 10.0
        } else {
            0.0
        };
        let mod_status = if total_c == 0 {
            "UNTESTED"
        } else if fail_c > 0 {
            "DEFECTS_FOUND"
        } else if not_impl_c > 0 {
            "SPECIFICATION_GAP"
        } else {
            "VERIFIED"
        };

        module_coverage.push(json!({
            "module_id": mod_id,
            "module_name": mod_name,
            "implemented_status": impl_status,
            "automated_tests_count": total_c,
            "passed_count": pass_c,
            "failed_count": fail_c,
            "not_implemented_count": not_impl_c,
            "pass_rate_pct": cov_pct,
            "status": mod_status
        }));
    }

    (
        StatusCode::OK,
        Json(json!({
            "overall_health": overall_health,
            "latest_run": latest_run,
            "worker_status": {
                "is_running": current_run_id.is_some(),
                "active_run_id": current_run_id,
                "active_suites": active_suites,
                "queue_depth": queue_depth
            },
            "summary_counts": {
                "total_runs": runs.len(),
                "latest_total_tests": latest_total,
                "latest_passed": latest_passed,
                "latest_failed": latest_failed,
                "latest_blocked": latest_blocked,
                "latest_skipped": latest_skipped,
                "latest_not_tested": latest_not_tested,
                "latest_not_implemented": latest_not_impl,
                "latest_not_configured": latest_not_conf,
                "pass_rate_pct": pass_rate_pct
            },
            "open_findings_by_severity": {
                "critical": crit,
                "high": high,
                "medium": med,
                "low": low,
                "informational": info,
                "total": findings.len()
            },
            "module_coverage": module_coverage,
            "execution_modes": ALL_SUITE_MODES
        })),
    )
}

pub async fn list_qa_runs(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    let runs = fetch_runs(&qa.qa_pool, 50).await;
    (StatusCode::OK, Json(json!({ "runs": runs })))
}

pub async fn get_qa_run_detail(
    State(state): State<Arc<AppState>>,
    Path(run_id): Path<String>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    let runs = fetch_runs(&qa.qa_pool, 100).await;
    let Some(run) = runs.into_iter().find(|r| r.id == run_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "QA run not found"})),
        );
    };
    let test_cases = fetch_test_cases(&qa.qa_pool, Some(&run_id), None, None, None, None).await;
    let findings = fetch_findings(&qa.qa_pool, Some(&run_id), None, None).await;
    (
        StatusCode::OK,
        Json(json!({
            "run": run,
            "test_cases": test_cases,
            "findings": findings
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct TriggerRunRequest {
    pub suite_mode: String,
    pub triggered_by: Option<String>,
}

pub async fn trigger_qa_run(
    State(state): State<Arc<AppState>>,
    Json(req): Json<TriggerRunRequest>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    let trig = req.triggered_by.as_deref().unwrap_or("MANUAL_UI");
    match qa.enqueue_run(&req.suite_mode, trig).await {
        Ok(run_id) => (
            StatusCode::ACCEPTED,
            Json(json!({
                "status": "QUEUED",
                "run_id": run_id,
                "suite_mode": req.suite_mode
            })),
        ),
        Err(e) => (StatusCode::CONFLICT, Json(json!({ "error": e }))),
    }
}

pub async fn cancel_qa_run(
    State(state): State<Arc<AppState>>,
    Path(run_id): Path<String>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    match qa.cancel_run(&run_id).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({"status": "CANCEL_REQUESTED", "run_id": run_id})),
        ),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e}))),
    }
}

pub async fn retry_qa_run(
    State(state): State<Arc<AppState>>,
    Path(run_id): Path<String>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    let suite_mode: Option<String> =
        sqlx::query_scalar("SELECT suite_mode FROM qa_runs WHERE id = ?")
            .bind(&run_id)
            .fetch_optional(&qa.qa_pool)
            .await
            .ok()
            .flatten();

    let Some(mode) = suite_mode else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Original QA run not found"})),
        );
    };

    match qa.enqueue_run(&mode, "MANUAL_RETRY").await {
        Ok(new_id) => (
            StatusCode::ACCEPTED,
            Json(json!({ "status": "QUEUED", "run_id": new_id, "suite_mode": mode })),
        ),
        Err(e) => (StatusCode::CONFLICT, Json(json!({ "error": e }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct IngestExternalTestCase {
    pub test_id: String,
    pub title: String,
    pub module_id: String,
    pub module_name: String,
    pub description: Option<String>,
    pub preconditions: Option<String>,
    pub status: String,
    pub duration_ms: i64,
    pub source_refs: String,
    pub assertion_text: String,
    pub input_json: Value,
    pub expected_json: Value,
    pub actual_json: Value,
    pub logs: Option<String>,
    pub screenshot_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IngestExternalRunRequest {
    pub suite_mode: String,
    pub triggered_by: Option<String>,
    pub append_to_run_id: Option<String>,
    pub cases: Vec<IngestExternalTestCase>,
}

pub async fn ingest_external_results(
    State(state): State<Arc<AppState>>,
    Json(req): Json<IngestExternalRunRequest>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };

    let now = Utc::now().to_rfc3339();
    let commit_sha = detect_git_commit_sha();
    let env_json = build_environment_json(&qa.ml_service_url);

    let run_id = if let Some(existing_id) = req.append_to_run_id.clone() {
        existing_id
    } else {
        let new_id = Uuid::new_v4().to_string();
        let _ = sqlx::query(
            "INSERT INTO qa_runs (
                id, suite_mode, trigger_source, status, started_at, completed_at, duration_ms,
                total_tests, passed_tests, failed_tests, blocked_tests, skipped_tests,
                not_tested_count, not_implemented_count, not_configured_count,
                commit_sha, environment_json, stdout_log, stderr_log, summary_json, is_synthetic, created_at
            ) VALUES (?, ?, ?, 'COMPLETED', ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, '', '', '{}', 1, ?)"
        )
        .bind(&new_id)
        .bind(&req.suite_mode)
        .bind(req.triggered_by.as_deref().unwrap_or("PLAYWRIGHT_E2E"))
        .bind(&now)
        .bind(&now)
        .bind(&commit_sha)
        .bind(&env_json)
        .bind(&now)
        .execute(&qa.qa_pool)
        .await;
        new_id
    };

    let mut records = Vec::new();
    for c in req.cases {
        let tc = QaTestCaseRecord {
            id: Uuid::new_v4().to_string(),
            run_id: run_id.clone(),
            test_id: c.test_id,
            suite_mode: req.suite_mode.clone(),
            module_id: c.module_id,
            module_name: c.module_name,
            title: c.title,
            description: c.description.unwrap_or_default(),
            preconditions: c.preconditions.unwrap_or_else(|| "Playwright E2E Browser Session".to_string()),
            input_json: c.input_json.to_string(),
            expected_json: c.expected_json.to_string(),
            actual_json: c.actual_json.to_string(),
            assertion_text: c.assertion_text,
            status: c.status,
            started_at: now.clone(),
            completed_at: now.clone(),
            duration_ms: c.duration_ms,
            commit_sha: commit_sha.clone(),
            environment_json: env_json.clone(),
            logs: c.logs.unwrap_or_default(),
            error_trace: None,
            screenshot_path: c.screenshot_path,
            api_metadata_json: None,
            db_evidence_json: None,
            source_refs: c.source_refs,
            is_synthetic: 1,
        };

        let _ = sqlx::query("DELETE FROM qa_test_cases WHERE run_id = ? AND test_id = ?")
            .bind(&run_id)
            .bind(&tc.test_id)
            .execute(&qa.qa_pool)
            .await;

        let _ = sqlx::query(
            "INSERT INTO qa_test_cases (
                id, run_id, test_id, suite_mode, module_id, module_name, title, description,
                preconditions, input_json, expected_json, actual_json, assertion_text, status,
                started_at, completed_at, duration_ms, commit_sha, environment_json, logs,
                error_trace, screenshot_path, api_metadata_json, db_evidence_json, source_refs, is_synthetic
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
        )
        .bind(&tc.id)
        .bind(&tc.run_id)
        .bind(&tc.test_id)
        .bind(&tc.suite_mode)
        .bind(&tc.module_id)
        .bind(&tc.module_name)
        .bind(&tc.title)
        .bind(&tc.description)
        .bind(&tc.preconditions)
        .bind(&tc.input_json)
        .bind(&tc.expected_json)
        .bind(&tc.actual_json)
        .bind(&tc.assertion_text)
        .bind(&tc.status)
        .bind(&tc.started_at)
        .bind(&tc.completed_at)
        .bind(tc.duration_ms)
        .bind(&tc.commit_sha)
        .bind(&tc.environment_json)
        .bind(&tc.logs)
        .bind(&tc.error_trace)
        .bind(&tc.screenshot_path)
        .bind(&tc.api_metadata_json)
        .bind(&tc.db_evidence_json)
        .bind(&tc.source_refs)
        .execute(&qa.qa_pool)
        .await;

        records.push(tc);
    }

    let findings_added = analyze_and_record_findings(&qa.qa_pool, &run_id, &records).await;

    let all_cases = fetch_test_cases(&qa.qa_pool, Some(&run_id), None, None, None, None).await;
    let total = all_cases.len() as i64;
    let passed = all_cases.iter().filter(|c| c.status == "PASS").count() as i64;
    let failed = all_cases.iter().filter(|c| c.status == "FAIL").count() as i64;
    let blocked = all_cases.iter().filter(|c| c.status == "BLOCKED").count() as i64;
    let not_impl = all_cases
        .iter()
        .filter(|c| c.status == "NOT_IMPLEMENTED")
        .count() as i64;
    let skipped = all_cases.iter().filter(|c| c.status == "SKIPPED").count() as i64;
    let dur: i64 = all_cases.iter().map(|c| c.duration_ms).sum();

    let _ = sqlx::query(
        "UPDATE qa_runs SET
            total_tests = ?, passed_tests = ?, failed_tests = ?,
            blocked_tests = ?, not_implemented_count = ?, skipped_tests = ?,
            duration_ms = ?
         WHERE id = ?",
    )
    .bind(total)
    .bind(passed)
    .bind(failed)
    .bind(blocked)
    .bind(not_impl)
    .bind(skipped)
    .bind(dur)
    .bind(&run_id)
    .execute(&qa.qa_pool)
    .await;

    (
        StatusCode::OK,
        Json(json!({
            "run_id": run_id,
            "ingested_cases": records.len(),
            "findings_added": findings_added,
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": failed
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct CompareRunsQuery {
    pub base_id: String,
    pub target_id: String,
}

pub async fn compare_qa_runs(
    State(state): State<Arc<AppState>>,
    Query(q): Query<CompareRunsQuery>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };

    let runs = fetch_runs(&qa.qa_pool, 100).await;
    let base_run = runs.iter().find(|r| r.id == q.base_id).cloned();
    let target_run = runs.iter().find(|r| r.id == q.target_id).cloned();

    let (Some(base), Some(target)) = (base_run, target_run) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "One or both QA runs not found"})),
        );
    };

    let base_cases = fetch_test_cases(&qa.qa_pool, Some(&q.base_id), None, None, None, None).await;
    let target_cases =
        fetch_test_cases(&qa.qa_pool, Some(&q.target_id), None, None, None, None).await;

    let mut newly_failing = Vec::new();
    let mut newly_passing = Vec::new();
    let mut persistent_failures = Vec::new();

    for tc in &target_cases {
        if let Some(bc) = base_cases.iter().find(|b| b.test_id == tc.test_id) {
            if bc.status == "PASS" && tc.status != "PASS" {
                newly_failing.push(tc.test_id.clone());
            } else if bc.status != "PASS" && tc.status == "PASS" {
                newly_passing.push(tc.test_id.clone());
            } else if bc.status != "PASS" && tc.status != "PASS" {
                persistent_failures.push(tc.test_id.clone());
            }
        }
    }

    let base_rate = if base.total_tests > 0 {
        (base.passed_tests as f64 / base.total_tests as f64) * 100.0
    } else {
        0.0
    };
    let target_rate = if target.total_tests > 0 {
        (target.passed_tests as f64 / target.total_tests as f64) * 100.0
    } else {
        0.0
    };

    (
        StatusCode::OK,
        Json(json!({
            "base_run": base,
            "target_run": target,
            "pass_rate_delta_pct": ((target_rate - base_rate) * 10.0).round() / 10.0,
            "duration_delta_ms": target.duration_ms - base.duration_ms,
            "newly_failing": newly_failing,
            "newly_passing": newly_passing,
            "persistent_failures": persistent_failures
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct TestCaseQuery {
    pub run_id: Option<String>,
    pub suite_mode: Option<String>,
    pub module_id: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

pub async fn list_qa_test_cases(
    State(state): State<Arc<AppState>>,
    Query(q): Query<TestCaseQuery>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    let target_run = if q.run_id.is_some() {
        q.run_id
    } else {
        fetch_runs(&qa.qa_pool, 5)
            .await
            .into_iter()
            .find(|r| r.status == "COMPLETED" || r.status == "FAILED")
            .map(|r| r.id)
    };

    let cases = fetch_test_cases(
        &qa.qa_pool,
        target_run.as_deref(),
        q.suite_mode.as_deref(),
        q.module_id.as_deref(),
        q.status.as_deref(),
        q.search.as_deref(),
    )
    .await;

    (
        StatusCode::OK,
        Json(json!({ "run_id": target_run, "test_cases": cases })),
    )
}

#[derive(Debug, Deserialize)]
pub struct FindingsQuery {
    pub run_id: Option<String>,
    pub severity: Option<String>,
    pub module_id: Option<String>,
}

pub async fn list_qa_findings(
    State(state): State<Arc<AppState>>,
    Query(q): Query<FindingsQuery>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };
    let target_run = if q.run_id.is_some() {
        q.run_id
    } else {
        fetch_runs(&qa.qa_pool, 5)
            .await
            .into_iter()
            .find(|r| r.status == "COMPLETED" || r.status == "FAILED")
            .map(|r| r.id)
    };

    let findings = fetch_findings(
        &qa.qa_pool,
        target_run.as_deref(),
        q.severity.as_deref(),
        q.module_id.as_deref(),
    )
    .await;

    (
        StatusCode::OK,
        Json(json!({ "run_id": target_run, "findings": findings })),
    )
}

#[derive(Debug, Deserialize)]
pub struct RemediationDecisionRequest {
    pub action: String,
    pub actor: Option<String>,
    pub rationale: String,
}

pub async fn submit_remediation_decision(
    State(state): State<Arc<AppState>>,
    Path(finding_id): Path<String>,
    Json(req): Json<RemediationDecisionRequest>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };

    if req.rationale.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Rationale is required for remediation approval or rejection"})),
        );
    }

    let now = Utc::now().to_rfc3339();
    let new_status = match req.action.to_uppercase().as_str() {
        "APPROVE" => "APPROVED_FOR_MANUAL_PATCH",
        "REJECT" => "REJECTED",
        "DEFER" => "DEFERRED",
        _ => "AWAITING_APPROVAL",
    };

    let _ = sqlx::query(
        "UPDATE qa_findings SET remediation_status = ?, reviewer_decision_notes = ?, updated_at = ? WHERE id = ?",
    )
    .bind(new_status)
    .bind(&req.rationale)
    .bind(&now)
    .bind(&finding_id)
    .execute(&qa.qa_pool)
    .await;

    let log_id = Uuid::new_v4().to_string();
    let actor = req
        .actor
        .unwrap_or_else(|| "Principal QA Auditor".to_string());
    let _ = sqlx::query(
        "INSERT INTO qa_remediation_logs (id, finding_id, action, actor, notes, before_evidence_json, after_evidence_json, timestamp)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)",
    )
    .bind(&log_id)
    .bind(&finding_id)
    .bind(&req.action)
    .bind(&actor)
    .bind(&req.rationale)
    .bind(&now)
    .execute(&qa.qa_pool)
    .await;

    let logs: Vec<QaRemediationLogRecord> = sqlx::query_as(
        "SELECT * FROM qa_remediation_logs WHERE finding_id = ? ORDER BY timestamp DESC",
    )
    .bind(&finding_id)
    .fetch_all(&qa.qa_pool)
    .await
    .unwrap_or_default();

    (
        StatusCode::OK,
        Json(json!({
            "finding_id": finding_id,
            "remediation_status": new_status,
            "log_id": log_id,
            "logs": logs,
            "note": "Remediation decision recorded. Production application code remains untouched until human developer applies the approved patch."
        })),
    )
}

pub async fn list_qa_schedules(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };

    let schedules: Vec<QaScheduleRecord> =
        sqlx::query_as("SELECT * FROM qa_schedules ORDER BY id ASC")
            .fetch_all(&qa.qa_pool)
            .await
            .unwrap_or_default();

    (StatusCode::OK, Json(json!({ "schedules": schedules })))
}

#[derive(Debug, Deserialize)]
pub struct UpdateScheduleRequest {
    pub id: String,
    pub enabled: bool,
    pub interval_seconds: Option<i64>,
    pub suite_mode: Option<String>,
}

pub async fn update_qa_schedule(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateScheduleRequest>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "QA Engine not initialized"})),
        );
    };

    let now = Utc::now().to_rfc3339();
    let enabled_int = if req.enabled { 1_i64 } else { 0_i64 };
    if let Some(interval) = req.interval_seconds {
        let _ = sqlx::query(
            "UPDATE qa_schedules SET enabled = ?, interval_seconds = ?, updated_at = ? WHERE id = ?",
        )
        .bind(enabled_int)
        .bind(interval.max(0))
        .bind(&now)
        .bind(&req.id)
        .execute(&qa.qa_pool)
        .await;
    } else {
        let _ = sqlx::query("UPDATE qa_schedules SET enabled = ?, updated_at = ? WHERE id = ?")
            .bind(enabled_int)
            .bind(&now)
            .bind(&req.id)
            .execute(&qa.qa_pool)
            .await;
    }

    if let Some(mode) = req.suite_mode {
        let _ = sqlx::query("UPDATE qa_schedules SET suite_mode = ?, updated_at = ? WHERE id = ?")
            .bind(mode)
            .bind(&now)
            .bind(&req.id)
            .execute(&qa.qa_pool)
            .await;
    }

    (
        StatusCode::OK,
        Json(json!({ "status": "UPDATED", "id": req.id })),
    )
}

#[derive(Debug, Deserialize)]
pub struct ExportReportQuery {
    pub run_id: Option<String>,
    pub format: Option<String>,
}

pub async fn export_qa_report(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ExportReportQuery>,
) -> impl IntoResponse {
    let Some(qa) = &state.qa_engine else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            [(header::CONTENT_TYPE, "application/json")],
            json!({"error": "QA Engine not initialized"}).to_string(),
        );
    };

    let runs = fetch_runs(&qa.qa_pool, 50).await;
    let target_run = if let Some(ref rid) = q.run_id {
        runs.into_iter().find(|r| &r.id == rid)
    } else {
        runs.into_iter()
            .find(|r| r.status == "COMPLETED" || r.status == "FAILED")
    };

    let Some(run) = target_run else {
        return (
            StatusCode::NOT_FOUND,
            [(header::CONTENT_TYPE, "application/json")],
            json!({"error": "No completed QA run available for export"}).to_string(),
        );
    };

    let cases = fetch_test_cases(&qa.qa_pool, Some(&run.id), None, None, None, None).await;
    let findings = fetch_findings(&qa.qa_pool, Some(&run.id), None, None).await;
    let fmt = q.format.as_deref().unwrap_or("json").to_lowercase();

    match fmt.as_str() {
        "csv" => {
            let mut csv = String::from(
                "test_id,module_id,module_name,suite_mode,status,duration_ms,source_refs,title,assertion_text,logs\n",
            );
            for c in &cases {
                csv.push_str(&format!(
                    "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{},\"{}\",\"{}\",\"{}\",\"{}\"\n",
                    c.test_id,
                    c.module_id,
                    c.module_name.replace('"', "'"),
                    c.suite_mode,
                    c.status,
                    c.duration_ms,
                    c.source_refs.replace('"', "'"),
                    c.title.replace('"', "'"),
                    c.assertion_text.replace('"', "'"),
                    c.logs.replace('"', "'")
                ));
            }
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "text/csv; charset=utf-8")],
                csv,
            )
        }
        "markdown" | "md" => {
            let mut md = format!(
                "# Empirical QA & Audit Report — AI Dynamic Credit Risk Platform\n\n\
                 - **Run ID:** `{}`\n\
                 - **Suite Mode:** `{}`\n\
                 - **Trigger Source:** `{}`\n\
                 - **Completed At:** `{}`\n\
                 - **Git Commit:** `{}`\n\
                 - **Total Tests Executed:** `{}` (`{}` PASS, `{}` FAIL, `{}` BLOCKED, `{}` NOT_IMPLEMENTED)\n\
                 - **Total Empirical Findings:** `{}`\n\n\
                 ## 1. Executive Test Matrix\n\n\
                 | Code | Module | Title | Status | Duration (ms) | Empirical Observation |\n\
                 |---|---|---|---|---|---|\n",
                run.id,
                run.suite_mode,
                run.trigger_source,
                run.completed_at.as_deref().unwrap_or("-"),
                run.commit_sha,
                run.total_tests,
                run.passed_tests,
                run.failed_tests,
                run.blocked_tests,
                run.not_implemented_count,
                findings.len()
            );

            for c in &cases {
                md.push_str(&format!(
                    "| `{}` | `{}` | {} | **{}** | {} | {} |\n",
                    c.test_id,
                    c.module_id,
                    c.title,
                    c.status,
                    c.duration_ms,
                    c.logs.replace('|', "\\|")
                ));
            }

            md.push_str("\n## 2. Empirical Defect & Specification Gap Findings\n\n");
            for f in &findings {
                md.push_str(&format!(
                    "### `{}` — {} (`{}` / `{}`)\n\
                     - **Module & Feature:** `{}` — {}\n\
                     - **Expected Behavior:** {}\n\
                     - **Actual Behavior:** {}\n\
                     - **Root Cause Analysis:** {}\n\
                     - **Impact:** {}\n\
                     - **Recommended Correction:** {}\n\
                     - **Remediation Status:** `{}` (Confidence: `{}`)\n\n",
                    f.finding_code,
                    f.title,
                    f.severity,
                    f.classification,
                    f.module_id,
                    f.affected_feature,
                    f.expected_behavior,
                    f.actual_behavior,
                    f.root_cause_analysis,
                    f.impact,
                    f.recommended_correction,
                    f.remediation_status,
                    f.confidence_level
                ));
            }

            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "text/markdown; charset=utf-8")],
                md,
            )
        }
        _ => {
            let payload = json!({
                "report_title": "Empirical QA & Audit Report — AI Dynamic Credit Risk Research & Monitoring Platform",
                "generated_at": Utc::now().to_rfc3339(),
                "run": run,
                "test_cases": cases,
                "findings": findings
            });
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
                serde_json::to_string_pretty(&payload).unwrap_or_default(),
            )
        }
    }
}

async fn fetch_runs(pool: &sqlx::SqlitePool, limit: i64) -> Vec<QaRunRecord> {
    sqlx::query_as("SELECT * FROM qa_runs ORDER BY created_at DESC LIMIT ?")
        .bind(limit)
        .fetch_all(pool)
        .await
        .unwrap_or_default()
}

async fn fetch_test_cases(
    pool: &sqlx::SqlitePool,
    run_id: Option<&str>,
    suite_mode: Option<&str>,
    module_id: Option<&str>,
    status: Option<&str>,
    search: Option<&str>,
) -> Vec<QaTestCaseRecord> {
    let rows: Vec<QaTestCaseRecord> = if let Some(rid) = run_id {
        sqlx::query_as("SELECT * FROM qa_test_cases WHERE run_id = ? ORDER BY test_id ASC")
            .bind(rid)
            .fetch_all(pool)
            .await
            .unwrap_or_default()
    } else {
        sqlx::query_as("SELECT * FROM qa_test_cases ORDER BY started_at DESC LIMIT 200")
            .fetch_all(pool)
            .await
            .unwrap_or_default()
    };

    rows.into_iter()
        .filter(|tc| {
            if let Some(sm) = suite_mode {
                if !sm.is_empty() && tc.suite_mode != sm {
                    return false;
                }
            }
            if let Some(mid) = module_id {
                if !mid.is_empty() && tc.module_id != mid && !tc.module_id.starts_with(mid) {
                    return false;
                }
            }
            if let Some(st) = status {
                if !st.is_empty() && tc.status != st {
                    return false;
                }
            }
            if let Some(q) = search {
                let q_low = q.to_lowercase();
                if !q_low.is_empty()
                    && !tc.test_id.to_lowercase().contains(&q_low)
                    && !tc.title.to_lowercase().contains(&q_low)
                    && !tc.source_refs.to_lowercase().contains(&q_low)
                    && !tc.logs.to_lowercase().contains(&q_low)
                {
                    return false;
                }
            }
            true
        })
        .collect()
}

async fn fetch_findings(
    pool: &sqlx::SqlitePool,
    run_id: Option<&str>,
    severity: Option<&str>,
    module_id: Option<&str>,
) -> Vec<QaFindingRecord> {
    let rows: Vec<QaFindingRecord> = if let Some(rid) = run_id {
        sqlx::query_as(
            "SELECT * FROM qa_findings WHERE run_id = ?
             ORDER BY CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4
                ELSE 5 END ASC, finding_code ASC",
        )
        .bind(rid)
        .fetch_all(pool)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as("SELECT * FROM qa_findings ORDER BY created_at DESC LIMIT 100")
            .fetch_all(pool)
            .await
            .unwrap_or_default()
    };

    rows.into_iter()
        .filter(|f| {
            if let Some(sev) = severity {
                if !sev.is_empty() && f.severity != sev {
                    return false;
                }
            }
            if let Some(mid) = module_id {
                if !mid.is_empty() && f.module_id != mid && !f.module_id.starts_with(mid) {
                    return false;
                }
            }
            true
        })
        .collect()
}
