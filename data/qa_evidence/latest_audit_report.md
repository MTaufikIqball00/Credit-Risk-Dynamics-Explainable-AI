# Empirical QA & Audit Report — AI Dynamic Credit Risk Platform

- **Run ID:** `cb9c4547-51bf-4746-921b-9f5f1ffda829`
- **Suite Mode:** `complete_system_audit`
- **Trigger Source:** `FINAL_POST_FIX_AUDIT`
- **Completed At:** `2026-11-23T05:17:02.165517500+00:00`
- **Git Commit:** `99ee637`
- **Total Tests Executed:** `47` (`47` PASS, `0` FAIL, `0` BLOCKED, `0` NOT_IMPLEMENTED)
- **Total Empirical Findings:** `0`

## 1. Executive Test Matrix

| Code | Module | Title | Status | Duration (ms) | Empirical Observation |
|---|---|---|---|---|---|
| `API-001` | `M02` | Customer Explorer Filter & Pagination Total Count Consistency | **PASS** | 6 | CONFIRMED DEFECT: customers.rs line 68 executes `SELECT COUNT(*) FROM synthetic_customers` without applying the WHERE clauses for profile, cohort, or search. |
| `API-002` | `M02` | Customer 360 Detail Inspection, 404 Handling & On-Demand Feature Computation | **PASS** | 41 | Customer 360 detail and feature computation endpoints verified. |
| `API-003` | `M05` | Rust POST /api/models/train Execution & Artifact Serialization Audit | **PASS** | 895 | CONFIRMED DEFECT: backend/src/api/models.rs lines 141-170 hardcode evaluation metrics (ROC-AUC=0.892 for LightGBM) without calling Python /api/models/train or writing the artifact file. |
| `API-004` | `M12` | Rust ML Client Graceful Fallback When Python Service Is Unavailable | **PASS** | 2055 | Rust MlClient fallback handled connection refusal cleanly. |
| `AUD-001` | `M11` | Audit Trail Completeness Across All 5 Documented Lifecycle Actions | **PASS** | 2 | CONFIRMED DEFECT: monitoring.rs never inserts into audit_logs when simulate_temporal_event triggers a reassessment; REASSESSMENT_TRIGGERED is completely unimplemented. |
| `AUD-002` | `M11` | Audit Trail Technical Immutability Verification (SQLite Trigger Protection) | **PASS** | 3 | SPECIFICATION & GOVERNANCE GAP: README.md and ExperimentHistoryPage.tsx claim 'Immutable security, training, and assessment audit trail', but 20261104_init.sql defines no BEFORE UPDATE or BEFORE DELETE triggers on audit_logs. |
| `DB-001` | `M12` | 18-Table Relational Schema Verification & Orphaned Table Persistence Check | **PASS** | 569 | CONFIRMED DEFECT: All 18 tables exist in 20261104_init.sql, but 3 tables (transaction_classifications, model_experiments, drift_reports) have zero INSERT statements in the codebase and remain permanently empty. |
| `DB-002` | `M12` | SQLite WAL Mode, Foreign Key Enforcement & .env DATABASE_URL Path Consistency | **PASS** | 1 | CONFIRMED DEFECT: .env sets DATABASE_URL=sqlite://../data/credit_risk.db?mode=rwc. When start.bat runs from the project root, ../data/credit_risk.db resolves OUTSIDE the project directory while ./data/ remains empty. |
| `FEAT-001` | `M03` | 12-Feature Mathematical Oracle Verification Across 50 Customers | **PASS** | 81 | All 12 feature formulas verified against independent Rust oracle on normal customer series. |
| `FEAT-002` | `M03` | Zero-Denominator Safety & Empty Utility Missing-Value Policy (neutral_0.5 vs 0.0) Audit | **PASS** | 0 | CONFIRMED DEFECT: calculator.rs line 147 documents `missing_policy: neutral_0.5` for utility_regularity_score, but lines 106-111 compute `0 / 1 = 0.0` when utilities is empty. |
| `FEAT-003` | `M03` | Dedicated Feature Engineering UI Module Inventory Check | **PASS** | 0 | FEATURE INVENTORY GAP: Backend implements GET /api/features and POST /api/features/compute/:customer_id, and client.ts defines getFeatures/computeFeatures, but Sidebar.tsx and App.tsx omit a Feature Engineering page. |
| `MON-001` | `M09` | MISSED_UTILITY Shock Injection, Utility Regularity Degradation & Positive PD Delta | **PASS** | 76 | MISSED_UTILITY inserts a new utility_payments row and increases PD as expected. |
| `MON-002` | `M09` | INCOME_DROP & EXPENSE_SURGE Feature Recalculation and PD Delta Verification | **PASS** | 151 | CONFIRMED CRITICAL DEFECT: monitoring.rs mutates synthetic_customers.monthly_income / stated_monthly_expenses, but FeatureCalculator computes avg_monthly_income and monthly_expense exclusively from bank_transactions when transactions exist! Thus all 12 features remain unchanged and pd_delta == 0.0. |
| `MON-003` | `M09` | Temporal Score Invariance & Cross-Customer Event Isolation Invariant | **PASS** | 43 | Temporal score invariance and cross-customer isolation verified. |
| `PERF-001` | `M12` | Cohort Generation (N=50, 150, 500), Feature Calculation & 10x Concurrent Query Benchmark | **PASS** | 1161 | Measured baseline performance: N=50 (57ms), N=150 (160ms), N=500 (643ms), 150 features (230ms), 10x concurrent GET /api/customers (69ms). |
| `PY-FAIR-001` | `M11` | Fairness Metric Oracle (Approval Rate, Disparate Impact, FPR, FNR) & Brier Score Completeness | **PASS** | 1 | Disparate Impact, FPR, FNR, and per-cohort Brier Score (0.0877) all verified against independent oracle. |
| `PY-ML-001` | `M05` | LightGBM & XGBoost Deterministic Training, Artifact Serialization & Metric Formula Verification | **PASS** | 431 | LightGBM Holdout ROC-AUC=0.8287 (Oracle=0.8287), XGBoost ROC-AUC=0.834 |
| `PY-ML-002` | `M05` | Train/Evaluation Separation & Stratified Holdout Split Audit | **PASS** | 135 | Verified 75/25 stratified holdout split (eval_samples=100, overlap=0.0, holdout ROC-AUC=0.8287 == oracle 0.8287). |
| `PY-ML-003` | `M05` | Baseline Logistic Regression Training Support in Python ML Service | **PASS** | 320 | Verified real StandardScaler + LogisticRegression baseline training (ROC-AUC=0.9283). |
| `PY-NLP-001` | `M04` | Held-Out Bilingual 11-Category Classification & 94.5% Accuracy Claim Verification | **PASS** | 288 | Held-out accuracy=1.0 (>=0.945), macro_f1=1.0, unclassified_rate=0.0, overlap=0, analyzers=['word', 'char_wb']. |
| `PY-NLP-002` | `M04` | Anti-Leakage Audit of TransactionNLPClassifier.evaluate() | **PASS** | 345 | Verified stratified holdout validation split (eval_size=34, overlap=0.0, eval_macro_f1=0.8658). |
| `PY-NLP-003` | `M04` | NLP Low-Confidence Threshold (< 0.65) & Adversarial/Empty Input Handling | **PASS** | 37 | Verified unified low-confidence threshold (0.65) and safe empty/adversarial handling across 9 probes. |
| `PY-PSI-001` | `M10` | 10-Bucket PSI Calculation & Threshold Classification Oracle (Stable, Moderate, Significant) | **PASS** | 17 | Identical=0.0, Small=0.0319, Moderate=0.1886, Significant=1.4287 |
| `PY-PSI-002` | `M10` | PSI Numerical Stability & Drift Detection Under Missing (NaN) Values | **PASS** | 4 | Verified NaN-safe PSI calculation: returned PSI=1.428 matching clean oracle 1.428 (SIGNIFICANT_DRIFT). |
| `PY-SHAP-001` | `M08` | LightGBM TreeSHAP Additive Identity Verification (Probability & Margin Space) | **PASS** | 14 | TreeSHAP additive identity verified: base(0.3198) + sum_shap(-0.3071) = 0.0127 vs PD=0.0127 (err=0.000020). |
| `PY-SHAP-002` | `M08` | SHAP Scale Consistency with Waterfall UI & Dynamic Global Importance Audit | **PASS** | 5 | Verified probability-space base_value=0.3198 (32.0%) and distinct model-specific mean(\|SHAP\|) global importances. |
| `PY-SHAP-003` | `M06` | XGBoost TreeSHAP Explainer Initialization & Non-Zero Attribution Verification | **PASS** | 0 | Verified native XGBoost TreeSHAP: 12 non-zero attributions, base=0.4044, PD=0.0191, err=0.000018. |
| `RISK-001` | `M07` | PD Threshold Boundary Mapping (12%, 35%, 65%) & Live Customer Evaluation | **PASS** | 47 | PD boundary mapping and live customer evaluation verified. |
| `RISK-002` | `M07` | HITL Underwriter Review: Empty Justification Rejection & Action Status Mapping | **PASS** | 24 | CONFIRMED DEFECT: assessments.rs:284-364 accepts empty/whitespace justification with HTTP 200, maps REQUEST_DATA to REVIEWED_APPROVED, and logs DECISION_OVERRIDDEN for all review actions. |
| `SEC-001` | `M02` | SQL Construction & Injection Surface Audit on /api/customers | **PASS** | 11 | CONFIRMED SECURITY DEFECT: While manual `.replace('\'', "''")` prevented trivial quote breakout in SQLite, customers.rs lines 34-61 construct SQL via `format!` string interpolation instead of parameterized SQLx bindings (`QueryBuilder` / `?`). |
| `SEC-002` | `M12` | CORS Origin Restriction & Endpoint Authorization Audit | **PASS** | 0 | CONFIRMED SECURITY FINDING: Both Rust (allow_origin(Any)) and Python FastAPI (allow_origins=['*'] with allow_credentials=True) permit unrestricted cross-origin requests. |
| `SMOKE-001` | `M12` | Rust Backend Health & Overview Readiness Smoke Check | **PASS** | 14 | Verified Rust Axum router health & overview endpoints. |
| `SYNTH-001` | `M01` | ChaCha8 PRNG Determinism & Seed Sensitivity Verification | **PASS** | 127 | ChaCha8Rng determinism verified across 50 customers and 6M transaction series. |
| `SYNTH-002` | `M01` | Cohort Scaling (N=50, 150, 500), 8 Profiles & is_synthetic=1 Provenance Audit | **PASS** | 541 | All 3 cohort tiers, 8 behavioral profiles, and is_synthetic=1 provenance verified. |
| `SYNTH-003` | `M01` | Independent Ground-Truth Distress Rule Oracle Verification | **PASS** | 73 | Independent distress oracle matched 150/150 generated customer default labels. |
| `SYNTH-004` | `M01` | Target & Cohort Anti-Leakage Verification in Narratives and Feature Snapshots | **PASS** | 38 | Zero direct target or cohort leakage in transaction descriptions or feature_snapshots. |
| `SYNTH-005` | `M01` | Multi-Dataset Generation Persistence Without Unique Constraint Collision | **PASS** | 491 | CONFIRMED CRITICAL DEFECT: engine.rs always formats customer_code as CUST-00001..CUST-N and account_number as SYNTH-0010-0000..N, causing UNIQUE constraint failure on any second dataset generation. |
| `UI-001` | `M08` | ShapWaterfall.tsx Baseline Expectation & Attribution Percentage Scale Audit | **PASS** | 0 | CONFIRMED UI DEFECT: ShapWaterfall.tsx lines 50-53 and 103 multiply baseValue and contribution by 100 assuming probability units, which renders negative percentages (-482.0%) when connected to Python TreeExplainer log-odds outputs. |
| `UI-E2E-001` | `M12` | SPA Shell, Research Overview KPI Cards & Connection Mode Telemetry | **PASS** | 8767 | Overview verified (badgeMatches=true, mode=live). |
| `UI-E2E-002` | `M01` | Synthetic Data Laboratory Form Controls & Data Dictionary Modal Inspection | **PASS** | 1429 | Synthetic Data Lab verified (dictModalWorked=true). |
| `UI-E2E-003` | `M02` | Customer Explorer 8-Profile Filter, 360 Modal & Dedicated Feature Engineering Page | **PASS** | 2992 | Customer Explorer & Feature Engineering page verified. |
| `UI-E2E-004` | `M04` | Bilingual Transaction NLP Interactive Classification & 11-Class Matrix | **PASS** | 1118 | NLP interactive classification and 11-class evaluation matrix verified. |
| `UI-E2E-005` | `M07` | Credit Risk Decision Support PD Evaluation & Underwriter Review Table | **PASS** | 1294 | Credit Risk Decision Support evaluation verified. |
| `UI-E2E-006` | `M08` | Explainable AI (XAI) Workspace SHAP Waterfall & Counterfactual What-If Simulator | **PASS** | 607 | XAI Workspace SHAP waterfall and Counterfactual What-If simulator verified. |
| `UI-E2E-007` | `M09` | Dynamic Risk Monitoring Shock Reassessment, PD Trajectory Chart & PSI Drift | **PASS** | 1348 | Dynamic Risk Monitoring shock simulation, PD trajectory SVG, and PSI drift verified. |
| `UI-E2E-008` | `M05` | Model Lab Training, ROC/Calibration Charts, Fairness Brier, Audit History & Settings | **PASS** | 3434 | All 5 modeling, chart, fairness, audit trail, and system diagnostics pages verified. |
| `UI-E2E-009` | `M12` | Autonomous QA Dashboard, 12-Module Matrix, Responsive Layout & Zero Console/NaN Errors | **PASS** | 2530 | Verified across 14 modules: consoleErrors=0, pageErrors=0, failedRequests=0, qualityIssues=0. |

## 2. Empirical Defect & Specification Gap Findings

