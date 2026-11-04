# Empirical QA & Audit Report — AI Dynamic Credit Risk Platform

- **Run ID:** `5bc9735a-5123-40d6-bef8-c6783931cb57`
- **Suite Mode:** `complete_system_audit`
- **Trigger Source:** `EMPIRICAL_AUDIT_VERIFICATION`
- **Completed At:** `2026-11-04T12:32:12.543104800+00:00`
- **Git Commit:** `workspace-20261104-uncommitted`
- **Total Tests Executed:** `47` (`23` PASS, `23` FAIL, `0` BLOCKED, `1` NOT_IMPLEMENTED)
- **Total Empirical Findings:** `24`

## 1. Executive Test Matrix

| Code | Module | Title | Status | Duration (ms) | Empirical Observation |
|---|---|---|---|---|---|
| `API-001` | `M02` | Customer Explorer Filter & Pagination Total Count Consistency | **FAIL** | 5 | CONFIRMED DEFECT: customers.rs line 68 executes `SELECT COUNT(*) FROM synthetic_customers` without applying the WHERE clauses for profile, cohort, or search. |
| `API-002` | `M02` | Customer 360 Detail Inspection, 404 Handling & On-Demand Feature Computation | **PASS** | 54 | Customer 360 detail and feature computation endpoints verified. |
| `API-003` | `M05` | Rust POST /api/models/train Execution & Artifact Serialization Audit | **FAIL** | 80 | CONFIRMED DEFECT: backend/src/api/models.rs lines 141-170 hardcode evaluation metrics (ROC-AUC=0.892 for LightGBM) without calling Python /api/models/train or writing the artifact file. |
| `API-004` | `M12` | Rust ML Client Graceful Fallback When Python Service Is Unavailable | **PASS** | 2035 | Rust MlClient fallback handled connection refusal cleanly. |
| `AUD-001` | `M11` | Audit Trail Completeness Across All 5 Documented Lifecycle Actions | **FAIL** | 1 | CONFIRMED DEFECT: monitoring.rs never inserts into audit_logs when simulate_temporal_event triggers a reassessment; REASSESSMENT_TRIGGERED is completely unimplemented. |
| `AUD-002` | `M11` | Audit Trail Technical Immutability Verification (SQLite Trigger Protection) | **FAIL** | 19 | SPECIFICATION & GOVERNANCE GAP: README.md and ExperimentHistoryPage.tsx claim 'Immutable security, training, and assessment audit trail', but 20261104_init.sql defines no BEFORE UPDATE or BEFORE DELETE triggers on audit_logs. |
| `DB-001` | `M12` | 18-Table Relational Schema Verification & Orphaned Table Persistence Check | **FAIL** | 73 | CONFIRMED DEFECT: All 18 tables exist in 20261104_init.sql, but 3 tables (transaction_classifications, model_experiments, drift_reports) have zero INSERT statements in the codebase and remain permanently empty. |
| `DB-002` | `M12` | SQLite WAL Mode, Foreign Key Enforcement & .env DATABASE_URL Path Consistency | **FAIL** | 1 | CONFIRMED DEFECT: .env sets DATABASE_URL=sqlite://../data/credit_risk.db?mode=rwc. When start.bat runs from the project root, ../data/credit_risk.db resolves OUTSIDE the project directory while ./data/ remains empty. |
| `FEAT-001` | `M03` | 12-Feature Mathematical Oracle Verification Across 50 Customers | **PASS** | 81 | All 12 feature formulas verified against independent Rust oracle on normal customer series. |
| `FEAT-002` | `M03` | Zero-Denominator Safety & Empty Utility Missing-Value Policy (neutral_0.5 vs 0.0) Audit | **FAIL** | 0 | CONFIRMED DEFECT: calculator.rs line 147 documents `missing_policy: neutral_0.5` for utility_regularity_score, but lines 106-111 compute `0 / 1 = 0.0` when utilities is empty. |
| `FEAT-003` | `M03` | Dedicated Feature Engineering UI Module Inventory Check | **NOT_IMPLEMENTED** | 0 | FEATURE INVENTORY GAP: Backend implements GET /api/features and POST /api/features/compute/:customer_id, and client.ts defines getFeatures/computeFeatures, but Sidebar.tsx and App.tsx omit a Feature Engineering page. |
| `MON-001` | `M09` | MISSED_UTILITY Shock Injection, Utility Regularity Degradation & Positive PD Delta | **FAIL** | 124 | MISSED_UTILITY inserts a new utility_payments row and increases PD as expected. |
| `MON-002` | `M09` | INCOME_DROP & EXPENSE_SURGE Feature Recalculation and PD Delta Verification | **FAIL** | 219 | CONFIRMED CRITICAL DEFECT: monitoring.rs mutates synthetic_customers.monthly_income / stated_monthly_expenses, but FeatureCalculator computes avg_monthly_income and monthly_expense exclusively from bank_transactions when transactions exist! Thus all 12 features remain unchanged and pd_delta == 0.0. |
| `MON-003` | `M09` | Temporal Score Invariance & Cross-Customer Event Isolation Invariant | **PASS** | 69 | Temporal score invariance and cross-customer isolation verified. |
| `PERF-001` | `M12` | Cohort Generation (N=50, 150, 500), Feature Calculation & 10x Concurrent Query Benchmark | **PASS** | 1055 | Measured baseline performance: N=50 (64ms), N=150 (188ms), N=500 (567ms), 150 features (180ms), 10x concurrent GET /api/customers (54ms). |
| `PY-FAIR-001` | `M11` | Fairness Metric Oracle (Approval Rate, Disparate Impact, FPR, FNR) & Brier Score Completeness | **FAIL** | 1 | Disparate Impact, FPR, FNR match independent oracle (True), but FairnessAuditor omits Brier Score by cohort (has_brier_by_cohort=False). |
| `PY-ML-001` | `M05` | LightGBM & XGBoost Deterministic Training, Artifact Serialization & Metric Formula Verification | **PASS** | 372 | LightGBM ROC-AUC=1.0 (Oracle=1.0), XGBoost ROC-AUC=0.9997 |
| `PY-ML-002` | `M05` | Train/Evaluation Separation & Temporal Out-of-Time Split Audit | **FAIL** | 271 | CONFIRMED DEFECT: trainer.py fits and evaluates on the exact same (X, y) array (in-sample ROC-AUC=1.0 vs true out-of-sample ROC-AUC=0.9052). |
| `PY-ML-003` | `M05` | Baseline Logistic Regression Training Support in Python ML Service | **FAIL** | 319 | CONFIRMED DEFECT: trainer.py imports LogisticRegression on line 6 but never implements a training method; main.py line 75 `else:` branch trains LightGBM whenever algorithm != 'xgboost'. |
| `PY-NLP-001` | `M04` | Held-Out Bilingual 11-Category Classification & 94.5% Accuracy Claim Verification | **FAIL** | 112 | Held-out accuracy=0.7818 (below 94.5% claim), macro_f1=0.8606, unclassified_rate=0.2 because TfidfVectorizer uses word-only n-grams without char n-grams on a 61-item training set. |
| `PY-NLP-002` | `M04` | Anti-Leakage Audit of TransactionNLPClassifier.evaluate() | **FAIL** | 22 | CONFIRMED DEFECT: evaluate() predicts on TRAINING_CORPUS (in-sample F1=1.0 vs held-out F1=0.8606), causing 100% train-test data leakage. |
| `PY-NLP-003` | `M04` | NLP Low-Confidence Threshold (< 0.65) & Adversarial/Empty Input Handling | **FAIL** | 13 | CONFIRMED DEFECT: classifier.py line 137 uses `top_conf < 0.50` instead of `< 0.65`. Prediction 'GAJI MANDIRI' (conf=0.5277) is falsely marked is_low_confidence=False. |
| `PY-PSI-001` | `M10` | 10-Bucket PSI Calculation & Threshold Classification Oracle (Stable, Moderate, Significant) | **PASS** | 15 | Identical=0.0, Small=0.0319, Moderate=0.1886, Significant=1.4287 |
| `PY-PSI-002` | `M10` | PSI Numerical Stability & Drift Detection Under Missing (NaN) Values | **FAIL** | 3 | CONFIRMED DEFECT: A single NaN in baseline causes np.percentile to produce NaN bin edges, zeroing all histogram counts and returning PSI=0.0 (STABLE) instead of 1.4323 (SIGNIFICANT_DRIFT)! |
| `PY-SHAP-001` | `M08` | LightGBM TreeSHAP Additive Identity Verification (Log-Odds Margin Space) | **PASS** | 17 | TreeSHAP additive identity holds in log-odds space: base_value(-4.8197) + sum_shap(-2.2997) = -7.1194; sigmoid = 0.0008 vs PD = 0.0008. |
| `PY-SHAP-002` | `M08` | SHAP Scale Consistency with Waterfall UI & Dynamic Global Importance Audit | **FAIL** | 92 | CONFIRMED DEFECT: explainer.py returns log-odds base_value=-4.8197 which ShapWaterfall.tsx renders as '-482.0%' with negative bar width; global_importance is hardcoded at lines 89-95. |
| `PY-SHAP-003` | `M06` | XGBoost TreeSHAP Explainer Initialization & Non-Zero Attribution Verification | **FAIL** | 29 | CONFIRMED DEFECT: shap.TreeExplainer(xgb_model) fails with `ValueError: could not convert string to float: '[3.75E-2]'` and silently falls back to 12 zero SHAP contributions and base_value=0.20. |
| `RISK-001` | `M07` | PD Threshold Boundary Mapping (12%, 35%, 65%) & Live Customer Evaluation | **PASS** | 100 | PD boundary mapping and live customer evaluation verified. |
| `RISK-002` | `M07` | HITL Underwriter Review: Empty Justification Rejection & Action Status Mapping | **FAIL** | 76 | CONFIRMED DEFECT: assessments.rs:284-364 accepts empty/whitespace justification with HTTP 200, maps REQUEST_DATA to REVIEWED_APPROVED, and logs DECISION_OVERRIDDEN for all review actions. |
| `SEC-001` | `M02` | SQL Construction & Injection Surface Audit on /api/customers | **FAIL** | 6 | CONFIRMED SECURITY DEFECT: While manual `.replace('\'', "''")` prevented trivial quote breakout in SQLite, customers.rs lines 34-61 construct SQL via `format!` string interpolation instead of parameterized SQLx bindings (`QueryBuilder` / `?`). |
| `SEC-002` | `M12` | CORS Origin Restriction & Endpoint Authorization Audit | **FAIL** | 0 | CONFIRMED SECURITY FINDING: Both Rust (allow_origin(Any)) and Python FastAPI (allow_origins=['*'] with allow_credentials=True) permit unrestricted cross-origin requests. |
| `SMOKE-001` | `M12` | Rust Backend Health & Overview Readiness Smoke Check | **PASS** | 15 | Verified Rust Axum router health & overview endpoints. |
| `SYNTH-001` | `M01` | ChaCha8 PRNG Determinism & Seed Sensitivity Verification | **PASS** | 128 | ChaCha8Rng determinism verified across 50 customers and 6M transaction series. |
| `SYNTH-002` | `M01` | Cohort Scaling (N=50, 150, 500), 8 Profiles & is_synthetic=1 Provenance Audit | **PASS** | 561 | All 3 cohort tiers, 8 behavioral profiles, and is_synthetic=1 provenance verified. |
| `SYNTH-003` | `M01` | Independent Ground-Truth Distress Rule Oracle Verification | **PASS** | 68 | Independent distress oracle matched 150/150 generated customer default labels. |
| `SYNTH-004` | `M01` | Target & Cohort Anti-Leakage Verification in Narratives and Feature Snapshots | **PASS** | 40 | Zero direct target or cohort leakage in transaction descriptions or feature_snapshots. |
| `SYNTH-005` | `M01` | Multi-Dataset Generation Persistence Without Unique Constraint Collision | **FAIL** | 29 | CONFIRMED CRITICAL DEFECT: engine.rs always formats customer_code as CUST-00001..CUST-N and account_number as SYNTH-0010-0000..N, causing UNIQUE constraint failure on any second dataset generation. |
| `UI-001` | `M08` | ShapWaterfall.tsx Baseline Expectation & Attribution Percentage Scale Audit | **FAIL** | 0 | CONFIRMED UI DEFECT: ShapWaterfall.tsx lines 50-53 and 103 multiply baseValue and contribution by 100 assuming probability units, which renders negative percentages (-482.0%) when connected to Python TreeExplainer log-odds outputs. |
| `UI-E2E-001` | `M12` | SPA Shell, Research Overview KPI Cards & Backend Telemetry Rendering | **PASS** | 1931 | Research Overview rendered with live portfolio metrics and zero uncaught exceptions. |
| `UI-E2E-002` | `M01` | Synthetic Data Laboratory Form Controls & Data Dictionary Modal Inspection | **PASS** | 740 | Synthetic Data Lab UI controls and dataset registry verified in headless Chromium. |
| `UI-E2E-003` | `M02` | Customer Explorer Search, 8-Profile Filter & Customer 360 Feature Vector Modal | **PASS** | 2875 | Customer Explorer filters and 360 detail inspection verified in headless Chromium. |
| `UI-E2E-004` | `M04` | Bilingual Transaction NLP Interactive Classification & Confusion Matrix View | **PASS** | 1355 | NLP interactive classification and evaluation metrics verified in headless Chromium. |
| `UI-E2E-005` | `M07` | Credit Risk Decision Support PD Evaluation & Underwriter Review Table | **PASS** | 1466 | Credit Risk Decision Support evaluation executed in headless Chromium. |
| `UI-E2E-006` | `M08` | Explainable AI (XAI) Workspace Local SHAP Waterfall & Global Importance View | **PASS** | 657 | XAI Workspace rendered local and global SHAP visualizations in headless Chromium. |
| `UI-E2E-007` | `M09` | Dynamic Risk Monitoring Event Simulation & PSI Drift Surveillance View | **PASS** | 646 | Dynamic Risk Monitoring and PSI Drift view verified in headless Chromium. |
| `UI-E2E-008` | `M05` | Model Lab, Benchmark Comparison, Fairness Audit, Experiment History & System Diagnostics Navigation | **PASS** | 2636 | All 5 modeling, fairness, audit trail, and system diagnostics pages rendered accurately. |
| `UI-E2E-009` | `M12` | Autonomous QA & Audit Dashboard UI, 12-Module Matrix, Remediation Modal & Responsive Viewport | **PASS** | 2821 | QA & Audit Dashboard verified with 0 console errors and 0 failed network requests. |

## 2. Empirical Defect & Specification Gap Findings

### `FND-MON-002` — Dynamic Monitoring INCOME_DROP and EXPENSE_SURGE Events Produce Zero PD Delta (0.0000) (`CRITICAL` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M09` — Dynamic Risk Monitoring — Behavioral Stress Simulation (`POST /api/monitoring/simulate`)
- **Expected Behavior:** Simulating a 50% income drop or 60% expense surge must alter the customer's cash-flow features (`avg_monthly_income`, `monthly_expense`, `net_cash_flow`, `expense_to_income_ratio`, `payment_burden_ratio`) and increase the recalculated Probability of Default (`pd_delta > 0`).
- **Actual Behavior:** Actual response: {"expense_surge_http":200,"expense_surge_reassessment":{"id":"057099d2-fe64-4bd9-83e4-bd105dc2fc79","new_pd":0.0002,"new_risk_category":"LOW","pd_delta":0.0,"prior_pd":0.0002,"prior_risk_category":"LOW","trigger_reason":"Simulated living expense shock of +60.0%"},"income_drop_http":200,"income_drop_reassessment":{"id":"95908145-d931-4883-bf0a-8563314bd1b0","new_pd":0.0002,"new_risk_category":"LOW","pd_delta":0.0,"prior_pd":0.0002,"prior_risk_category":"LOW","trigger_reason":"Simulated payroll income compression of 50.0%"}} | Logs: CONFIRMED CRITICAL DEFECT: monitoring.rs mutates synthetic_customers.monthly_income / stated_monthly_expenses, but FeatureCalculator computes avg_monthly_income and monthly_expense exclusively from bank_transactions when transactions exist! Thus all 12 features remain unchanged and pd_delta == 0.0.
- **Root Cause Analysis:** In `backend/src/api/monitoring.rs:88-116`, `INCOME_DROP` updates `synthetic_customers.monthly_income` and `EXPENSE_SURGE` updates `synthetic_customers.stated_monthly_expenses`, then calls `FeatureCalculator::compute_for_customer(&customer, &transactions, &utilities)`. However, in `backend/src/features/calculator.rs:45-55`, `avg_monthly_income` and `monthly_expense` are calculated strictly from `transactions` (`bank_transactions` credits/debits) whenever `!transactions.is_empty()`, only falling back to `customer.monthly_income` / `stated_monthly_expenses` when `transactions` is empty! Because `monitoring.rs` never inserts or adjusts `bank_transactions` for `INCOME_DROP` or `EXPENSE_SURGE`, the feature vector is 100% unchanged and `new_pd == prior_pd`.
- **Impact:** Renders 2 of the 3 dynamic stress events in Dynamic Risk Monitoring (`INCOME_DROP` and `EXPENSE_SURGE`) non-functional, masking credit deterioration during income and expense shocks.
- **Recommended Correction:** In `backend/src/api/monitoring.rs`, scale the customer's CREDIT or DEBIT transactions in `bank_transactions` (or insert a shock transaction) when simulating `INCOME_DROP` and `EXPENSE_SURGE` so `FeatureCalculator` reflects the shock.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-SYNTH-005` — Multi-Cohort Generation Fails with HTTP 500 UNIQUE Constraint Violation on customer_code (`CRITICAL` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M01` — Synthetic Data Laboratory — Multi-Cohort Persistence (`POST /api/generator/generate`)
- **Expected Behavior:** Multiple synthetic cohorts with different seeds or parameters should persist side-by-side in the database with globally unique customer_code and account_number identifiers.
- **Actual Behavior:** Actual response: {"http_status":500,"response":{"raw_text":"error returned from database: (code: 2067) UNIQUE constraint failed: synthetic_customers.customer_code"}} | Logs: CONFIRMED CRITICAL DEFECT: engine.rs always formats customer_code as CUST-00001..CUST-N and account_number as SYNTH-0010-0000..N, causing UNIQUE constraint failure on any second dataset generation.
- **Root Cause Analysis:** In `backend/src/generator/engine.rs:371`, `customer_code` is formatted as `format!("CUST-{:05}", i + 1)` where `i` always starts at `0` for every dataset run. Similarly, in `backend/src/generator/engine.rs:189`, `account_number` is formatted as `format!("SYNTH-{:04}-{:04}", (i / 1000) + 10, i % 1000)`. Because `backend/migrations/20261104_init.sql:26` and `:46` enforce `UNIQUE` constraints on `synthetic_customers.customer_code` and `synthetic_accounts.account_number`, any second cohort insertion immediately fails at `CUST-00001`.
- **Impact:** Prevents researchers from generating and comparing multiple synthetic cohorts (e.g., 50 vs 150 vs 500 customers or different PRNG seeds) in the Synthetic Data Laboratory without wiping the database.
- **Recommended Correction:** Include a short deterministic prefix derived from the dataset ID or seed in `customer_code` and `account_number` (or query the current max index offset before generation) while preserving deterministic PRNG draw order.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-API-003` — Rust Backend Model Training & Benchmark Endpoints Return Hardcoded Metrics Without Invoking Python ML Service or Writing Artifact Files (`HIGH` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M05` — Model Research Laboratory & Benchmark Comparison (`backend/src/api/models.rs`)
- **Expected Behavior:** `POST /api/models/train` should extract the feature matrix from SQLite, invoke the Python ML microservice `/api/models/train` (or persist a real model artifact), store experiment records in `model_experiments`, and return empirically computed metrics.
- **Actual Behavior:** Actual output: {"artifact_file_created_on_disk":false,"artifact_path_recorded_in_db":"artifacts/lightgbm_aec3fd08-27b2-406e-b277-9c580151fd1d.joblib","metrics_hardcoded_identical":true,"run1_evaluation":{"brier_score":0.098,"f1_score":0.814,"log_loss":0.312,"pr_auc":0.841,"precision":0.835,"recall":0.795,"roc_auc":0.892},"run2_evaluation":{"brier_score":0.098,"f1_score":0.814,"log_loss":0.312,"pr_auc":0.841,"precision":0.835,"recall":0.795,"roc_auc":0.892}} | Logs: CONFIRMED DEFECT: backend/src/api/models.rs lines 141-170 hardcode evaluation metrics (ROC-AUC=0.892 for LightGBM) without calling Python /api/models/train or writing the artifact file.
- **Root Cause Analysis:** In `backend/src/api/models.rs:49-227`, `train_model` constructs hardcoded metric tuples (`(0.892, 0.841, 0.648, 0.088, 0.784, 0.768, 0.776)` for LightGBM) and inserts a row into `model_versions` pointing to a non-existent `.joblib` path without calling `state.ml_client` or inserting into `model_experiments`. Similarly, `compare_models`, `nlp.rs`, `monitoring.rs` (`get_drift_report`), and `fairness.rs` return static hardcoded JSON responses instead of querying the Python microservice.
- **Impact:** Researchers training models through the UI receive constant hardcoded evaluation metrics regardless of dataset size, seed, or hyperparameters, and `model_experiments` remains empty.
- **Recommended Correction:** Wire `POST /api/models/train`, `GET /api/nlp/evaluate`, `GET /api/monitoring/drift`, and `GET /api/fairness/report` in the Rust backend to call `state.ml_client` with actual database records and persist rows into `model_experiments`, `transaction_classifications`, and `drift_reports`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-ML-002` — Python ML Trainer Evaluates Metrics In-Sample on Training Data (Zero Train/Test Split -> Overfitted ROC-AUC = 1.0) (`HIGH` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M05` — Python ML Service — Model Training Pipeline (`ml_service/app/models/trainer.py`)
- **Expected Behavior:** Model evaluation metrics (ROC-AUC, PR-AUC, KS, Brier, F1, calibration curve, confusion matrix) must be computed on a held-out test split or out-of-time validation split, never on the in-sample training set.
- **Actual Behavior:** Actual output: {"uses_out_of_time_or_holdout_split": false, "train_eval_overlap": 1.0, "in_sample_roc_auc_reported": 1.0, "true_out_of_sample_roc_auc": 0.9052, "in_sample_brier_reported": 0.0001, "true_out_of_sample_brier": 0.0192} | Logs: CONFIRMED DEFECT: trainer.py fits and evaluates on the exact same (X, y) array (in-sample ROC-AUC=1.0 vs true out-of-sample ROC-AUC=0.9052).
- **Root Cause Analysis:** In `ml_service/app/models/trainer.py:88-116`, `X, y = _generate_synthetic_training_matrix(seed=seed, n=400)` is passed directly to `model.fit(X, y)` and then `model.predict_proba(X)[:, 1]` is evaluated on the exact same `X` and `y` arrays without `train_test_split` or cross-validation.
- **Impact:** Causes severe optimistic bias (reporting ROC-AUC = 1.0000 and F1 = 0.9929 instead of true out-of-sample ROC-AUC = 0.9052), violating financial risk model validation standards.
- **Recommended Correction:** Split `(X, y)` using `train_test_split(X, y, test_size=0.25, stratify=y, random_state=seed)` before fitting `model.fit(X_train, y_train)` and compute all evaluation metrics on `(X_test, y_test)`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-SHAP-002` — SHAP Log-Odds vs Probability Space Mismatch Renders -482.0% Base Value in ShapWaterfall UI (`HIGH` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M08` — Explainable AI Workspace & ShapWaterfall Component (`explainer.py` / `ShapWaterfall.tsx`)
- **Expected Behavior:** Base value, feature attributions, and final PD must use a consistent scale (either probability space `[0, 1]` or explicitly labeled log-odds space with valid positive bar widths), and `global_importance` should reflect actual `mean(|SHAP|)` across the cohort.
- **Actual Behavior:** Actual output: {"lightgbm_base_value_log_odds": -4.8197, "ui_rendered_baseline_pct": "-482.0%", "global_importance_identical_across_models": true, "hardcoded_global_importance": [["utility_regularity_score", 0.34], ["payment_burden_ratio", 0.29], ["expense_to_income_ratio", 0.22], ["net_cash_flow", 0.15], ["cash_flow_volatility", 0.08]]} | Logs: CONFIRMED DEFECT: explainer.py returns log-odds base_value=-4.8197 which ShapWaterfall.tsx renders as '-482.0%' with negative bar width; global_importance is hardcoded at lines 89-95.
- **Root Cause Analysis:** LightGBM binary classification `TreeExplainer` outputs `expected_value` and `shap_values` in raw margin (log-odds) space (`base_value = -4.8197`, `sum(shap) = -2.2997`, where `sigmoid(-7.1194) = 0.0008 = predicted_pd`). However, the Rust fallback (`client.rs:265`) and the React frontend (`ShapWaterfall.tsx:50-58,103`) assume `base_value` and `shap_value` are in probability units `[0, 1]` and multiply them by `100` to display percentages (`-482.0%` baseline with negative CSS width). Additionally, `explainer.py:89-95` hardcodes `global_importance` instead of computing `mean(|SHAP|)`.
- **Impact:** Causes broken visual bars and mathematically misleading percentage labels (`-482.0%`) in the XAI Workspace whenever the Python ML service is active.
- **Recommended Correction:** Either transform log-odds SHAP values into probability-space attributions or update `ShapWaterfall.tsx` to handle log-odds space with `Math.abs()` bar widths, and compute dynamic `mean(|SHAP|)` for `global_importance`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-SEC-001` — Dynamic SQL String Interpolation and Unfiltered Pagination Count in GET /api/customers (`HIGH` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M02` — Synthetic Customer Explorer API (`backend/src/api/customers.rs`)
- **Expected Behavior:** 1. `GET /api/customers` must use parameterized SQLx queries (`QueryBuilder` with `.push_bind()`).
2. `pagination.total` must reflect the filtered count matching `profile`, `cohort`, and `search`.
- **Actual Behavior:** Actual output: {"http_status":200,"sqli_bypass_count":0,"uses_string_format_sql":true} | Logs: CONFIRMED SECURITY DEFECT: While manual `.replace('\'', "''")` prevented trivial quote breakout in SQLite, customers.rs lines 34-61 construct SQL via `format!` string interpolation instead of parameterized SQLx bindings (`QueryBuilder` / `?`).
- **Root Cause Analysis:** In `backend/src/api/customers.rs:31-61`, `sql` is constructed via `format!` string interpolation of query parameters (`profile`, `cohort`, `search`). Additionally, lines 68-71 execute `SELECT COUNT(*) FROM synthetic_customers` without applying the `WHERE` filter clauses.
- **Impact:** Violates parameterized SQL security best practices and reports inaccurate pagination totals whenever filters are active.
- **Recommended Correction:** Replace raw string `format!` in `backend/src/api/customers.rs:31-71` with `sqlx::QueryBuilder::<sqlx::Sqlite>::new(...)` using `.push_bind()` for both the data query and the count query.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-SHAP-003` — XGBoost TreeExplainer Crashes on base_score String Format and Silently Returns All-Zero SHAP Values (`HIGH` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M06` — Explainable AI Workspace — XGBoost Local SHAP Attribution (`ml_service/app/xai/explainer.py`)
- **Expected Behavior:** XGBoost models must produce valid, non-zero TreeSHAP feature attributions that satisfy the local additive property.
- **Actual Behavior:** Actual output: {"xgb_in_explainers": false, "xgb_init_error": "ValueError: could not convert string to float: '[3.75E-2]'", "nonzero_shap_contributions": 0, "fallback_base_value_returned": 0.2} | Logs: CONFIRMED DEFECT: shap.TreeExplainer(xgb_model) fails with `ValueError: could not convert string to float: '[3.75E-2]'` and silently falls back to 12 zero SHAP contributions and base_value=0.20.
- **Root Cause Analysis:** In `ml_service/app/xai/explainer.py:19-25`, `shap.TreeExplainer(model)` parses the XGBoost UBJSON/config model dump where XGBoost >= 2.0 serializes `base_score` as a bracketed string `'[3.75E-2]'`. `shap` calls `float(base_score)` which raises `ValueError`. Because `explainer.py:24` wraps `TreeExplainer` in a silent `except Exception:` fallback that assigns `shap_vals = np.zeros(len(FEATURE_ORDER))`, every XGBoost SHAP explanation silently returns 0.0 for all 12 features.
- **Impact:** Completely breaks local XAI explainability for the XGBoost model family while hiding the failure behind a silent zero-attribution fallback.
- **Recommended Correction:** Use `model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True)` from XGBoost's native C++ TreeSHAP engine before falling back to `shap.TreeExplainer`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-UI-001` — SHAP Log-Odds vs Probability Space Mismatch Renders -482.0% Base Value in ShapWaterfall UI (`HIGH` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M08` — Explainable AI Workspace & ShapWaterfall Component (`explainer.py` / `ShapWaterfall.tsx`)
- **Expected Behavior:** Base value, feature attributions, and final PD must use a consistent scale (either probability space `[0, 1]` or explicitly labeled log-odds space with valid positive bar widths), and `global_importance` should reflect actual `mean(|SHAP|)` across the cohort.
- **Actual Behavior:** Actual output: {"computed_css_width":"-481.97%","formula_in_ShapWaterfall_tsx":"(baseValue * 100).toFixed(1)%","playwright_report_present":true,"rendered_text_for_lightgbm":"-482.0%","uses_raw_pct_mult_on_log_odds":true} | Logs: CONFIRMED UI DEFECT: ShapWaterfall.tsx lines 50-53 and 103 multiply baseValue and contribution by 100 assuming probability units, which renders negative percentages (-482.0%) when connected to Python TreeExplainer log-odds outputs.
- **Root Cause Analysis:** LightGBM binary classification `TreeExplainer` outputs `expected_value` and `shap_values` in raw margin (log-odds) space (`base_value = -4.8197`, `sum(shap) = -2.2997`, where `sigmoid(-7.1194) = 0.0008 = predicted_pd`). However, the Rust fallback (`client.rs:265`) and the React frontend (`ShapWaterfall.tsx:50-58,103`) assume `base_value` and `shap_value` are in probability units `[0, 1]` and multiply them by `100` to display percentages (`-482.0%` baseline with negative CSS width). Additionally, `explainer.py:89-95` hardcodes `global_importance` instead of computing `mean(|SHAP|)`.
- **Impact:** Causes broken visual bars and mathematically misleading percentage labels (`-482.0%`) in the XAI Workspace whenever the Python ML service is active.
- **Recommended Correction:** Either transform log-odds SHAP values into probability-space attributions or update `ShapWaterfall.tsx` to handle log-odds space with `Math.abs()` bar widths, and compute dynamic `mean(|SHAP|)` for `global_importance`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-API-001` — Dynamic SQL String Interpolation and Unfiltered Pagination Count in GET /api/customers (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M02` — Synthetic Customer Explorer API (`backend/src/api/customers.rs`)
- **Expected Behavior:** 1. `GET /api/customers` must use parameterized SQLx queries (`QueryBuilder` with `.push_bind()`).
2. `pagination.total` must reflect the filtered count matching `profile`, `cohort`, and `search`.
- **Actual Behavior:** Actual output: {"filtered_customers_count":3,"pagination_total":50} | Logs: CONFIRMED DEFECT: customers.rs line 68 executes `SELECT COUNT(*) FROM synthetic_customers` without applying the WHERE clauses for profile, cohort, or search.
- **Root Cause Analysis:** In `backend/src/api/customers.rs:31-61`, `sql` is constructed via `format!` string interpolation of query parameters (`profile`, `cohort`, `search`). Additionally, lines 68-71 execute `SELECT COUNT(*) FROM synthetic_customers` without applying the `WHERE` filter clauses.
- **Impact:** Violates parameterized SQL security best practices and reports inaccurate pagination totals whenever filters are active.
- **Recommended Correction:** Replace raw string `format!` in `backend/src/api/customers.rs:31-71` with `sqlx::QueryBuilder::<sqlx::Sqlite>::new(...)` using `.push_bind()` for both the data query and the count query.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-AUD-001` — Missing REASSESSMENT_TRIGGERED Event Type in Audit Trail Logging (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M11` — Experiment Reproducibility & Audit Trail (`backend/src/api/monitoring.rs` & `20261104_init.sql`)
- **Expected Behavior:** 1. All 5 documented audit events (`DATASET_GENERATED`, `MODEL_TRAINED`, `ASSESSMENT_CREATED`, `DECISION_OVERRIDDEN`, `REASSESSMENT_TRIGGERED`) must be logged.
2. `audit_logs` must enforce append-only immutability at the database layer via `BEFORE UPDATE` and `BEFORE DELETE` triggers.
- **Actual Behavior:** Actual output: {"monitoring_rs_writes_audit_logs":false,"reassessment_triggered_logged":false,"recorded_action_types":["MODEL_TRAINED","DECISION_OVERRIDDEN","ASSESSMENT_CREATED"]} | Logs: CONFIRMED DEFECT: monitoring.rs never inserts into audit_logs when simulate_temporal_event triggers a reassessment; REASSESSMENT_TRIGGERED is completely unimplemented.
- **Root Cause Analysis:** `backend/src/api/monitoring.rs` never inserts into `audit_logs` when `simulate_temporal_event` executes, and `backend/migrations/20261104_init.sql:288-297` creates `audit_logs` without `BEFORE UPDATE` or `BEFORE DELETE` triggers.
- **Impact:** Leaves `REASSESSMENT_TRIGGERED` unpopulated in the Audit Trail and allows SQL-level mutation or deletion of audit records.
- **Recommended Correction:** Insert `REASSESSMENT_TRIGGERED` into `audit_logs` in `monitoring.rs`, and add `CREATE TRIGGER prevent_audit_log_update` / `prevent_audit_log_delete` to the database schema.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-AUD-002` — Audit Logs Table Lacks SQLite BEFORE UPDATE / BEFORE DELETE Immutability Triggers (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M11` — Experiment Reproducibility & Audit Trail (`backend/src/api/monitoring.rs` & `20261104_init.sql`)
- **Expected Behavior:** 1. All 5 documented audit events (`DATASET_GENERATED`, `MODEL_TRAINED`, `ASSESSMENT_CREATED`, `DECISION_OVERRIDDEN`, `REASSESSMENT_TRIGGERED`) must be logged.
2. `audit_logs` must enforce append-only immutability at the database layer via `BEFORE UPDATE` and `BEFORE DELETE` triggers.
- **Actual Behavior:** Actual output: {"deletion_blocked_by_db_trigger":false,"rows_deleted":1} | Logs: SPECIFICATION & GOVERNANCE GAP: README.md and ExperimentHistoryPage.tsx claim 'Immutable security, training, and assessment audit trail', but 20261104_init.sql defines no BEFORE UPDATE or BEFORE DELETE triggers on audit_logs.
- **Root Cause Analysis:** `backend/src/api/monitoring.rs` never inserts into `audit_logs` when `simulate_temporal_event` executes, and `backend/migrations/20261104_init.sql:288-297` creates `audit_logs` without `BEFORE UPDATE` or `BEFORE DELETE` triggers.
- **Impact:** Leaves `REASSESSMENT_TRIGGERED` unpopulated in the Audit Trail and allows SQL-level mutation or deletion of audit records.
- **Recommended Correction:** Insert `REASSESSMENT_TRIGGERED` into `audit_logs` in `monitoring.rs`, and add `CREATE TRIGGER prevent_audit_log_update` / `prevent_audit_log_delete` to the database schema.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-DB-001` — Three Documented Relational Tables (transaction_classifications, model_experiments, drift_reports) Are Never Written To (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M12` — Database Integrity & Persistence Configuration (`backend/migrations/20261104_init.sql` & `.env`)
- **Expected Behavior:** All 18 schema tables should be actively populated when their corresponding domain workflows (NLP classification, model training, drift calculation) execute.
- **Actual Behavior:** Actual output: {"all_18_tables_exist":true,"discovered_tables_count":18,"drift_reports_rows":0,"model_experiments_rows":0,"transaction_classifications_rows":0} | Logs: CONFIRMED DEFECT: All 18 tables exist in 20261104_init.sql, but 3 tables (transaction_classifications, model_experiments, drift_reports) have zero INSERT statements in the codebase and remain permanently empty.
- **Root Cause Analysis:** No `INSERT INTO transaction_classifications`, `INSERT INTO model_experiments`, or `INSERT INTO drift_reports` statements exist anywhere in `backend/src/api/`.
- **Impact:** Leaves 3 of the 18 database tables permanently empty (`0` rows) and risks split database files if started from different working directories.
- **Recommended Correction:** Add `INSERT` persistence statements for `transaction_classifications`, `model_experiments`, and `drift_reports` in their respective API handlers, and normalize `DATABASE_URL` in `config.rs`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-DB-002` — Relative DATABASE_URL in .env Resolves Outside Project Root When Launched From Root Directory (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M12` — Database Integrity & Persistence Configuration (`backend/migrations/20261104_init.sql` & `.env`)
- **Expected Behavior:** Database path resolution should consistently point to `<project_root>/data/credit_risk.db` regardless of working directory.
- **Actual Behavior:** Actual output: {"dotenv_uses_parent_relative_path":true,"foreign_keys":1,"journal_mode":"delete"} | Logs: CONFIRMED DEFECT: .env sets DATABASE_URL=sqlite://../data/credit_risk.db?mode=rwc. When start.bat runs from the project root, ../data/credit_risk.db resolves OUTSIDE the project directory while ./data/ remains empty.
- **Root Cause Analysis:** `.env` defines `DATABASE_URL=sqlite://../data/credit_risk.db?mode=rwc`. When launched from the project root directory, `../data/credit_risk.db` resolves to the parent directory of the repository.
- **Impact:** Leaves 3 of the 18 database tables permanently empty (`0` rows) and risks split database files if started from different working directories.
- **Recommended Correction:** Add `INSERT` persistence statements for `transaction_classifications`, `model_experiments`, and `drift_reports` in their respective API handlers, and normalize `DATABASE_URL` in `config.rs`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-FEAT-002` — Empty Utility History Computes utility_regularity_score = 0.0 Instead of Documented neutral_0.5 Fallback (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M03` — Feature Engineering — `utility_regularity_score` Missing Value Handling (`backend/src/features/calculator.rs`)
- **Expected Behavior:** When a customer has no utility bill records (`utilities.is_empty()`), `utility_regularity_score` should match its documented `missing_policy: "neutral_0.5"` (`0.5`) rather than penalizing the customer with `0.0` (equivalent to 100% delinquent utility bills).
- **Actual Behavior:** Actual output: {"actual_cash_flow_volatility":0.2,"actual_data_completeness_score":0.6666666666666666,"actual_income_variability":0.15,"actual_utility_regularity_score_when_empty":0.0,"all_finite_no_nan":true} | Logs: CONFIRMED DEFECT: calculator.rs line 147 documents `missing_policy: neutral_0.5` for utility_regularity_score, but lines 106-111 compute `0 / 1 = 0.0` when utilities is empty.
- **Root Cause Analysis:** In `backend/src/features/calculator.rs:106-111`, `total_utils = utilities.len().max(1) as f64` and `on_time_utils = 0.0`, so `on_time_utils / total_utils` evaluates to `0.0 / 1.0 = 0.0` when `utilities.is_empty()`, contradicting line 147 (`"missing_policy": "neutral_0.5"`).
- **Impact:** Unfairly penalizes thin-file customers without utility payment records as if they missed 100% of their utility bills.
- **Recommended Correction:** Check `if utilities.is_empty() { 0.5 } else { on_time_utils / (utilities.len() as f64) }` in `backend/src/features/calculator.rs:106-111`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-MON-001` — QA Assertion Failure in MISSED_UTILITY Shock Injection, Utility Regularity Degradation & Positive PD Delta (MON-001) (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M09` — Dynamic Risk Monitoring
- **Expected Behavior:** {"http_status":200,"pd_delta_gt_0":true}
- **Actual Behavior:** {"http_status":200,"reassessment":{"id":"0aac503d-739e-4ea8-bd53-b2674bc17047","new_pd":0.0002,"new_risk_category":"LOW","pd_delta":0.0,"prior_pd":0.0002,"prior_risk_category":"LOW","trigger_reason":"Simulated recurring utility delinquency (65 DPD PLN bill)"}}
- **Root Cause Analysis:** Automated oracle assertion failed: assert http_status == 200 && pd_delta > 0.0 | MISSED_UTILITY inserts a new utility_payments row and increases PD as expected.
- **Impact:** Impacts functional or statistical correctness of the target module.
- **Recommended Correction:** Inspect the recorded evidence payload and align implementation with expected oracle behavior.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-ML-003` — Baseline Logistic Regression Model Not Implemented in Python ML Service (Silently Trains LightGBM) (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M05` — Python ML Service — Baseline_LogReg Training (`ml_service/app/main.py` & `trainer.py`)
- **Expected Behavior:** Requesting `Baseline_LogReg` should train a calibrated `sklearn.linear_model.LogisticRegression` pipeline (with `StandardScaler`) rather than silently training a LightGBM classifier.
- **Actual Behavior:** Actual output: {"has_logreg_trainer": false, "models_dict_keys": ["LightGBM", "XGBoost"], "api_response": {"status": "SUCCESS", "algorithm": "Baseline_LogReg", "metrics": {"roc_auc": 1.0, "pr_auc": 1.0, "f1_score": 1.0, "precision": 1.0, "recall": 1.0, "brier_score": 0.0037, "log_loss": 0.027, "calibration_curve": [{"pred_prob": 0.0133, "actual_rate": 0.0}, {"pred_prob": 0.6627, "actual_rate": 1.0}, {"pred_prob": 0.863, "actual_rate": 1.0}], "confusion_matrix": {"true_negative": 94, "false_positive": 0, "false_negative": 0, "true_positive": 6}}}} | Logs: CONFIRMED DEFECT: trainer.py imports LogisticRegression on line 6 but never implements a training method; main.py line 75 `else:` branch trains LightGBM whenever algorithm != 'xgboost'.
- **Root Cause Analysis:** `ml_service/app/main.py:75` coerces any `model_type` not containing `'XGB'` into `'LightGBM'`, and `ml_service/app/models/trainer.py:55-97` has no `LogisticRegression` branch.
- **Impact:** Prevents true empirical benchmarking of gradient boosted trees against a linear Logistic Regression baseline in the Python ML service.
- **Recommended Correction:** Add an explicit `elif 'LOGREG' in model_type.upper() or 'LOGISTIC' in model_type.upper():` branch in `trainer.py` using `make_pipeline(StandardScaler(), LogisticRegression(random_state=seed))` and preserve `req.model_type` in `main.py`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-NLP-001` — Bilingual NLP Pipeline Audit Finding (PY-NLP-001) — Confidence Threshold, Char N-Grams, and Holdout Split (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M04` — Transaction NLP Intelligence (`ml_service/app/nlp/classifier.py` & `backend/src/api/nlp.rs`)
- **Expected Behavior:** 1. Low-confidence flag must trigger when `confidence < 0.65` consistently across Python and Rust.
2. TF-IDF pipeline should include character n-grams or subword resilience alongside word n-grams to handle typos and morphological variations.
3. NLP evaluation metrics should be computed on a held-out split rather than 100% in-sample on the 61 training rows.
- **Actual Behavior:** Actual output: {"overlap_with_training": 0, "held_out_accuracy": 0.7818, "held_out_macro_f1": 0.8606, "unclassified_rate": 0.2, "vectorizer_analyzer": "word", "per_class_f1": {"Salary / Income": 1.0, "Business Revenue": 1.0, "Utility Payment": 0.8, "Loan Repayment": 0.8889, "Insurance": 0.75, "Housing": 0.75, "Groceries": 0.8889, "Transportation": 1.0, "Subscription": 0.75, "Transfer": 0.75, "Cash Withdrawal": 0.8889}, "confusion_matrix": [[5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 4, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]]} | Logs: Held-out accuracy=0.7818 (below 94.5% claim), macro_f1=0.8606, unclassified_rate=0.2 because TfidfVectorizer uses word-only n-grams without char n-grams on a 61-item training set.
- **Root Cause Analysis:** In `ml_service/app/nlp/classifier.py:86-93`, `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)` uses word n-grams only on a 61-sentence corpus (`TRAINING_CORPUS`). Line 115 sets `is_low_confidence = top_conf < 0.50` (whereas `backend/src/api/nlp.rs:78` uses `< 0.60`, and the specification requires `< 0.65`). Furthermore, `evaluate_nlp_pipeline()` (`classifier.py:124-142`) predicts on the exact 61 training sentences (`X_vec = _VECTORIZER.transform(texts)`), reporting an in-sample F1 of `0.946` while achieving `0.587` Macro-F1 on our independent 33-sample bilingual ground-truth fixture.
- **Impact:** Causes inconsistent low-confidence flagging (`0.50` vs `0.60` vs `0.65`), misclassification of English/typo narratives, and over-optimistic in-sample NLP accuracy reporting.
- **Recommended Correction:** 1. Standardize `is_low_confidence` threshold to `< 0.65` in both `classifier.py:115` and `backend/src/api/nlp.rs:78`.
2. Use `FeatureUnion` combining word `(1,2)` and char_wb `(3,5)` TF-IDF vectorizers.
3. Expand the bilingual corpus and evaluate on a stratified holdout split.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-NLP-002` — Bilingual NLP Pipeline Audit Finding (PY-NLP-002) — Confidence Threshold, Char N-Grams, and Holdout Split (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M04` — Transaction NLP Intelligence (`ml_service/app/nlp/classifier.py` & `backend/src/api/nlp.rs`)
- **Expected Behavior:** 1. Low-confidence flag must trigger when `confidence < 0.65` consistently across Python and Rust.
2. TF-IDF pipeline should include character n-grams or subword resilience alongside word n-grams to handle typos and morphological variations.
3. NLP evaluation metrics should be computed on a held-out split rather than 100% in-sample on the 61 training rows.
- **Actual Behavior:** Actual output: {"eval_sample_size": 61, "train_test_overlap_ratio": 1.0, "in_sample_macro_f1": 1.0, "held_out_macro_f1": 0.8606} | Logs: CONFIRMED DEFECT: evaluate() predicts on TRAINING_CORPUS (in-sample F1=1.0 vs held-out F1=0.8606), causing 100% train-test data leakage.
- **Root Cause Analysis:** In `ml_service/app/nlp/classifier.py:86-93`, `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)` uses word n-grams only on a 61-sentence corpus (`TRAINING_CORPUS`). Line 115 sets `is_low_confidence = top_conf < 0.50` (whereas `backend/src/api/nlp.rs:78` uses `< 0.60`, and the specification requires `< 0.65`). Furthermore, `evaluate_nlp_pipeline()` (`classifier.py:124-142`) predicts on the exact 61 training sentences (`X_vec = _VECTORIZER.transform(texts)`), reporting an in-sample F1 of `0.946` while achieving `0.587` Macro-F1 on our independent 33-sample bilingual ground-truth fixture.
- **Impact:** Causes inconsistent low-confidence flagging (`0.50` vs `0.60` vs `0.65`), misclassification of English/typo narratives, and over-optimistic in-sample NLP accuracy reporting.
- **Recommended Correction:** 1. Standardize `is_low_confidence` threshold to `< 0.65` in both `classifier.py:115` and `backend/src/api/nlp.rs:78`.
2. Use `FeatureUnion` combining word `(1,2)` and char_wb `(3,5)` TF-IDF vectorizers.
3. Expand the bilingual corpus and evaluate on a stratified holdout split.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-NLP-003` — Bilingual NLP Pipeline Audit Finding (PY-NLP-003) — Confidence Threshold, Char N-Grams, and Holdout Split (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M04` — Transaction NLP Intelligence (`ml_service/app/nlp/classifier.py` & `backend/src/api/nlp.rs`)
- **Expected Behavior:** 1. Low-confidence flag must trigger when `confidence < 0.65` consistently across Python and Rust.
2. TF-IDF pipeline should include character n-grams or subword resilience alongside word n-grams to handle typos and morphological variations.
3. NLP evaluation metrics should be computed on a held-out split rather than 100% in-sample on the 61 training rows.
- **Actual Behavior:** Actual output: {"implemented_threshold_in_python": 0.5, "implemented_threshold_in_rust_fallback": 0.6, "mismatched_predictions_in_0_50_to_0_65": [{"text": "GAJI MANDIRI", "category": "Salary / Income", "confidence": 0.5277, "is_low_confidence": false, "model_name": "TF-IDF-Logistic-IndoFin-v2.0"}], "empty_input_result": {"text": "", "category": "Unclassified", "confidence": 0.0, "is_low_confidence": true, "model_name": "TF-IDF-Logistic-IndoFin-v2.0"}, "malformed_symbol_result": {"text": "   !@#$%^&*()   ", "category": "Unclassified", "confidence": 0.0, "is_low_confidence": true, "model_name": "TF-IDF-Logistic-IndoFin-v2.0"}} | Logs: CONFIRMED DEFECT: classifier.py line 137 uses `top_conf < 0.50` instead of `< 0.65`. Prediction 'GAJI MANDIRI' (conf=0.5277) is falsely marked is_low_confidence=False.
- **Root Cause Analysis:** In `ml_service/app/nlp/classifier.py:86-93`, `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)` uses word n-grams only on a 61-sentence corpus (`TRAINING_CORPUS`). Line 115 sets `is_low_confidence = top_conf < 0.50` (whereas `backend/src/api/nlp.rs:78` uses `< 0.60`, and the specification requires `< 0.65`). Furthermore, `evaluate_nlp_pipeline()` (`classifier.py:124-142`) predicts on the exact 61 training sentences (`X_vec = _VECTORIZER.transform(texts)`), reporting an in-sample F1 of `0.946` while achieving `0.587` Macro-F1 on our independent 33-sample bilingual ground-truth fixture.
- **Impact:** Causes inconsistent low-confidence flagging (`0.50` vs `0.60` vs `0.65`), misclassification of English/typo narratives, and over-optimistic in-sample NLP accuracy reporting.
- **Recommended Correction:** 1. Standardize `is_low_confidence` threshold to `< 0.65` in both `classifier.py:115` and `backend/src/api/nlp.rs:78`.
2. Use `FeatureUnion` combining word `(1,2)` and char_wb `(3,5)` TF-IDF vectorizers.
3. Expand the bilingual corpus and evaluate on a stratified holdout split.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-PSI-002` — PSI Drift Calculator Silently Returns PSI = 0.0 (STABLE) When Input Contains Any NaN Value (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M10` — Dynamic Risk Monitoring — Population Stability Index (`ml_service/app/monitoring/drift.py`)
- **Expected Behavior:** `calculate_psi` must filter out `NaN` / non-finite values (`base[np.isfinite(base)]`) before computing decile breakpoints so that a single missing value does not blind drift detection.
- **Actual Behavior:** Actual output: {"psi_returned_by_calculate_psi": 0.0, "false_status_assigned": "STABLE"} | Logs: CONFIRMED DEFECT: A single NaN in baseline causes np.percentile to produce NaN bin edges, zeroing all histogram counts and returning PSI=0.0 (STABLE) instead of 1.4323 (SIGNIFICANT_DRIFT)!
- **Root Cause Analysis:** In `ml_service/app/monitoring/drift.py:9-15`, `np.percentile(base, quantiles)` is called without filtering `np.isfinite(base)` or using `np.nanpercentile`. When `base` contains even one `NaN`, all 11 quantile breakpoints become `NaN`, causing `np.histogram` to return zeros and `psi_val` to evaluate to `0.0` (`STABLE`).
- **Impact:** Can silently mask severe population drift (`CRITICAL_DRIFT` reported as `STABLE` with `PSI = 0.0`) if any feature snapshot contains a null/NaN value.
- **Recommended Correction:** Filter both `base` and `curr` with `base = base[np.isfinite(base)]` and `curr = curr[np.isfinite(curr)]` at the top of `calculate_psi` in `ml_service/app/monitoring/drift.py`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-RISK-002` — Underwriter Review Endpoint Accepts Blank Justification and Maps REQUEST_DATA to REVIEWED_APPROVED (`MEDIUM` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M07` — Credit Risk Decision Support — Underwriter Review (`POST /api/assessments/:id/review`)
- **Expected Behavior:** 1. Backend must reject empty or whitespace-only `justification` strings with HTTP 400.
2. `REQUEST_DATA` must map to a distinct status (e.g., `DATA_REQUESTED`) rather than `REVIEWED_APPROVED`.
- **Actual Behavior:** Actual output: {"empty_justification_http_status":200,"empty_justification_response":{"assessment_id":"0aff979b-be20-4fbe-b3c8-4b4637914828","justification":"   ","new_review_status":"REVIEWED_APPROVED","review_id":"bf507456-2ef0-445a-b62f-8b1fa90c29fd","status":"REVIEW_RECORDED"},"request_data_http_status":200,"request_data_new_status":"REVIEWED_APPROVED"} | Logs: CONFIRMED DEFECT: assessments.rs:284-364 accepts empty/whitespace justification with HTTP 200, maps REQUEST_DATA to REVIEWED_APPROVED, and logs DECISION_OVERRIDDEN for all review actions.
- **Root Cause Analysis:** In `backend/src/api/assessments.rs:284-305`, `review_assessment` does not validate `!payload.justification.trim().is_empty()`, and lines 300-304 check only `if payload.action == "OVERRIDE" { "OVERRIDDEN" } else { "REVIEWED_APPROVED" }`.
- **Impact:** Allows direct API calls to record reviews with blank justifications and inaccurately marks `REQUEST_DATA` assessments as `REVIEWED_APPROVED`.
- **Recommended Correction:** Validate `!payload.justification.trim().is_empty()` in `assessments.rs:289` and map `"REQUEST_DATA" => "DATA_REQUESTED"`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-FEAT-003` — Dedicated Feature Engineering Navigation Module Not Implemented in Frontend Sidebar (Embedded in Customer Explorer) (`LOW` / `SPECIFICATION_GAP`)
- **Module & Feature:** `M03` — Feature Engineering UI Module (`frontend/src/components/Sidebar.tsx` & `App.tsx`)
- **Expected Behavior:** Either provide a dedicated Feature Engineering laboratory view or explicitly document that Feature Engineering is embedded within Synthetic Customer Explorer.
- **Actual Behavior:** Actual output: {"backend_endpoints_exist":true,"dedicated_frontend_route_exists":false} | Logs: FEATURE INVENTORY GAP: Backend implements GET /api/features and POST /api/features/compute/:customer_id, and client.ts defines getFeatures/computeFeatures, but Sidebar.tsx and App.tsx omit a Feature Engineering page.
- **Root Cause Analysis:** `frontend/src/api/client.ts:46-49` defines `getFeatures` and `computeFeatures`, and `CustomerExplorerPage.tsx` renders the 12-feature vector per customer, but `Sidebar.tsx` has no standalone Feature Engineering navigation item.
- **Impact:** Users looking for a standalone 'Feature Engineering' sidebar menu item must instead navigate to Customer Explorer.
- **Recommended Correction:** Add a Feature Engineering tab or dictionary view in the UI.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-PY-FAIR-001` — Fairness Cohort Metrics Omit Per-Group Brier Calibration Score (`LOW` / `SPECIFICATION_GAP`)
- **Module & Feature:** `M11` — Fairness & Research Bias Validation (`ml_service/app/fairness/audit.py` & `backend/src/api/fairness.rs`)
- **Expected Behavior:** Fairness audit group metrics should include per-cohort calibration (`brier_score`) alongside approval rate, TPR, FPR, and predicted vs actual default rate.
- **Actual Behavior:** Actual output: {"sensitive_in_features": false, "cohort_metrics": [{"cohort": "Group_A", "sample_size": 10, "approval_rate": 0.7, "disparate_impact_ratio": 1.0, "false_positive_rate": 0.1429, "false_negative_rate": 0.3333}, {"cohort": "Group_B", "sample_size": 10, "approval_rate": 0.7, "disparate_impact_ratio": 1.0, "false_positive_rate": 0.1429, "false_negative_rate": 0.3333}, {"cohort": "Group_C", "sample_size": 10, "approval_rate": 0.6, "disparate_impact_ratio": 0.8571, "false_positive_rate": 0.1429, "false_negative_rate": 0.0}], "includes_brier_score_by_cohort": false} | Logs: Disparate Impact, FPR, FNR match independent oracle (True), but FairnessAuditor omits Brier Score by cohort (has_brier_by_cohort=False).
- **Root Cause Analysis:** `ml_service/app/fairness/audit.py:21-38` and `backend/src/api/fairness.rs` compute `approval_rate`, `predicted_default_rate`, `actual_default_rate`, `tpr`, and `fpr`, but omit `brier_score` (`mean((y_prob - y_true)^2)` per group).
- **Impact:** Limits cohort-level probability calibration comparison in the Fairness & Research Bias module.
- **Recommended Correction:** Add `brier_score: float(round(np.mean((probs - actual) ** 2), 4))` to each group entry in `ml_service/app/fairness/audit.py`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)

### `FND-SEC-002` — Wildcard CORS Policy (allow_origin(Any)) on Rust Backend and Python ML Service (`LOW` / `CONFIRMED_DEFECT`)
- **Module & Feature:** `M12` — Application Security & CORS Configuration (`backend/src/api/mod.rs` & `ml_service/app/main.py`)
- **Expected Behavior:** Restrict CORS origins to configured local research origins (`http://localhost:3240`, `http://127.0.0.1:3240`).
- **Actual Behavior:** Actual output: {"python_cors":"allow_origins=['*'], allow_credentials=True","rust_cors":"allow_origin(Any)","wildcard_cors_enabled":true} | Logs: CONFIRMED SECURITY FINDING: Both Rust (allow_origin(Any)) and Python FastAPI (allow_origins=['*'] with allow_credentials=True) permit unrestricted cross-origin requests.
- **Root Cause Analysis:** Both services configure permissive wildcard `*` CORS origins by default.
- **Impact:** Allows arbitrary browser origins to issue cross-origin requests to local ports `:8240` and `:8241` while the services are running.
- **Recommended Correction:** Restrict `allow_origin` in `backend/src/api/mod.rs` and `ml_service/app/main.py` to `http://localhost:3240` and `http://127.0.0.1:3240`.
- **Remediation Status:** `AWAITING_APPROVAL` (Confidence: `HIGH`)


