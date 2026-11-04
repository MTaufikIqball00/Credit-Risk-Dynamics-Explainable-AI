# Empirical QA & Autonomous Audit Report and Operations Manual
**Project:** AI Dynamic Credit Risk Research & Monitoring Platform  
**Audit System:** Autonomous QA Engine (`backend/src/qa/*`, `ml_service/tests/qa_oracles.py`, `frontend/e2e/run_playwright_audit.mjs`, `frontend/src/pages/QaAuditDashboardPage.tsx`)  
**Latest Verified Run ID:** `5bc9735a-5123-40d6-bef8-c6783931cb57` (`complete_system_audit` + `frontend_functional` Headless Chromium E2E)  
**Audit Conclusion:** **`REQUIRES CORRECTION`** (`2` Critical, `6` High, `13` Medium, `3` Low findings identified with reproducible empirical evidence; `0` production source files silently modified — all remediation patches held in `AWAITING_APPROVAL` status)

---

## 1. Executive Summary & Overall Audit Verdict

An independent, autonomous background QA and mathematical validation system was designed, implemented, and executed against the **AI Dynamic Credit Risk Research & Monitoring Platform** without altering any existing business logic, model behavior, synthetic data rules, feature formulas, risk thresholds, or fairness definitions.

### Summary of Empirical Execution (`Run 5bc9735a-5123-40d6-bef8-c6783931cb57`)
- **Total Executed Test Cases:** **`47`**
  - **Passed (`PASS`):** **`23`** (`14` Rust/Python mathematical & integration tests + `9/9` Playwright headless Chromium E2E browser functional suites across all UI pages)
  - **Failed (`FAIL`):** **`23`** (Each failure backed by an executed assertion, exact input/expected/actual JSON payload, and line-level root-cause evidence)
  - **Not Implemented (`NOT_IMPLEMENTED`):** **`1`** (`FEAT-003` — standalone Feature Engineering navigation item is omitted in `Sidebar.tsx`; the 12 features are embedded inside the Customer 360 modal in `CustomerExplorerPage.tsx`)
  - **Blocked (`BLOCKED`):** **`0`**
- **Total Structured Empirical Findings:** **`24`** (`22` `CONFIRMED_DEFECT`, `2` `SPECIFICATION_GAP`)
  - **`CRITICAL` (`2`):** `FND-SYNTH-005`, `FND-MON-002`
  - **`HIGH` (`6`):** `FND-SHAP-003`, `FND-PY-SHAP-002`, `FND-UI-001`, `FND-API-003`, `FND-PY-ML-002`, `FND-SEC-001`
  - **`MEDIUM` (`13`):** `FND-API-001`, `FND-FEAT-002`, `FND-MON-001`, `FND-PY-ML-003`, `FND-PY-NLP-001`, `FND-PY-NLP-002`, `FND-PY-NLP-003`, `FND-PY-PSI-002`, `FND-RISK-002`, `FND-DB-001`, `FND-DB-002`, `FND-AUD-001`, `FND-AUD-002`
  - **`LOW` (`3`):** `FND-FEAT-003`, `FND-PY-FAIR-001`, `FND-SEC-002`

---

## 2. Architecture Verification Against Ground Truth

| Component | Documented Specification | Verified Actual Implementation | Verification Verdict |
|---|---|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Port `3240`, SPA | `frontend/package.json` (`react: ^18.3.1`, `vite: ^5.2.11`), `vite.config.ts` (`port: 3240`), state-switched SPA in `frontend/src/App.tsx` | **VERIFIED MATCH** (Note: Feature Engineering is embedded in Customer Explorer rather than a standalone sidebar route) |
| **Rust Backend** | Rust, Axum `0.7`, Tokio, SQLx `0.7`, SQLite, Port `8240` | `backend/Cargo.toml` (`axum = "0.7"`, `sqlx = "0.7"`, `rand_chacha = "0.3"`), `backend/src/config.rs` (`port: 8240`) | **VERIFIED MATCH** |
| **Python ML & XAI** | FastAPI, LightGBM, XGBoost, SHAP TreeExplainer, Scikit-learn, NumPy/Pandas, Port `8241` | `ml_service/app/main.py` (`port: 8241`), `trainer.py`, `explainer.py`, `classifier.py`, `drift.py`, `audit.py` | **VERIFIED WITH DISCREPANCIES** (`Baseline_LogReg` is unimplemented in Python; Rust `models.rs`, `nlp.rs`, `monitoring.rs/drift`, and `fairness.rs` return hardcoded metrics instead of calling Python) |
| **Database** | SQLite WAL mode, `data/credit_risk.db`, 18 relational tables, `backend/migrations/20261104_init.sql` | All 18 tables exist in `20261104_init.sql` and `is_synthetic = 1` is enforced | **VERIFIED WITH DISCREPANCIES** (`3` tables — `transaction_classifications`, `model_experiments`, `drift_reports` — have `0` `INSERT` statements; `.env` uses `../data/credit_risk.db`) |

---

## 3. Complete Test Case Execution Matrix (`47` Executed Cases)

| Test ID | Suite Mode | Module | Title | Status | Duration (ms) | Empirical Evidence Summary |
|---|---|---|---|---|---|---|
| `SMOKE-001` | `smoke_test` | `M12` | Rust Backend Health & Overview Readiness Smoke Check | **PASS** | 15 | `GET /api/health` and `GET /api/overview` return HTTP 200 with valid JSON telemetry. |
| `SYNTH-001` | `synthetic_data_validation` | `M01` | ChaCha8 PRNG Determinism & Seed Sensitivity Verification | **PASS** | 128 | Identical seeds (`42` vs `42`) produce bit-for-bit identical customer incomes, expenses, and 6-month transactions; different seeds (`42` vs `99`) diverge as expected. |
| `SYNTH-002` | `synthetic_data_validation` | `M01` | Cohort Scaling (`N=50, 150, 500`), 8 Profiles & `is_synthetic=1` Provenance Audit | **PASS** | 561 | Verified exact customer counts (`50`, `150`, `500`), all 8 documented behavioral profiles, 6-month transaction spans, and `is_synthetic = 1` across all rows. |
| `SYNTH-003` | `synthetic_data_validation` | `M01` | Independent Ground-Truth Distress Rule Oracle Verification | **PASS** | 68 | Independent oracle checking `(stated_monthly_expenses / monthly_income > 0.85 && cash_balance < monthly_income * 0.25) \|\| (max_utility_dpd >= 90 \|\| missed_utilities >= 2)` matched `150/150` generated labels (`0` mismatches). |
| `SYNTH-004` | `synthetic_data_validation` | `M01` | Target & Cohort Anti-Leakage Verification in Narratives and Feature Snapshots | **PASS** | 40 | Verified zero target label leakage in `bank_transactions.raw_description` and zero target/cohort columns in `feature_snapshots`. |
| `SYNTH-005` | `synthetic_data_validation` | `M01` | Multi-Dataset Generation Persistence Without Unique Constraint Collision | **FAIL** | 29 | **CONFIRMED CRITICAL DEFECT (`FND-SYNTH-005`):** Second `POST /api/generator/generate` returns HTTP 500 `UNIQUE constraint failed: synthetic_customers.customer_code` because `engine.rs:371` always starts at `CUST-00001`. |
| `FEAT-001` | `feature_engineering_validation` | `M03` | 12-Feature Mathematical Oracle Verification Across 50 Customers | **PASS** | 81 | All 12 features (`avg_monthly_income`, `income_variability`, `monthly_expense`, `net_cash_flow`, `avg_balance`, `cash_flow_volatility`, `expense_to_income_ratio`, `recurring_payment_consistency`, `utility_regularity_score`, `payment_burden_ratio`, `transaction_frequency`, `data_completeness_score`) matched independent oracle within `1e-9`. |
| `FEAT-002` | `feature_engineering_validation` | `M03` | Zero-Denominator Safety & Empty Utility Missing-Value Policy (`neutral_0.5` vs `0.0`) Audit | **FAIL** | 1 | **CONFIRMED DEFECT (`FND-FEAT-002`):** Zero denominators produce finite values (no `NaN`/`Inf`), but when `utilities` is empty, `calculator.rs:106-111` returns `0.0` instead of the documented `missing_policy: "neutral_0.5"` (`calculator.rs:147`). |
| `FEAT-003` | `feature_engineering_validation` | `M03` | Dedicated Feature Engineering UI Module Inventory Check | **NOT_IMPLEMENTED** | 1 | **SPECIFICATION GAP (`FND-FEAT-003`):** Backend implements `GET /api/features` and `POST /api/features/compute/:id`, and `client.ts` defines `getFeatures`/`computeFeatures`, but `Sidebar.tsx` has no standalone Feature Engineering route. |
| `API-001` | `rust_api_test` | `M02` | Customer Explorer Filter & Pagination Total Count Consistency | **FAIL** | 5 | **CONFIRMED DEFECT (`FND-API-001`):** `GET /api/customers?profile=Volatile%20Informal&cohort=Group_B` returns `3` filtered rows, but `pagination.total` returns `50` (unfiltered table count from `customers.rs:68`). |
| `API-002` | `rust_api_test` | `M02` | Customer 360 Detail Inspection, 404 Handling & On-Demand Feature Computation | **PASS** | 54 | Verified `GET /api/customers/:id` (200), non-existent UUID (404), and `POST /api/features/compute/:id` (200). |
| `API-003` | `ml_training_evaluation_test` | `M05` | Rust `POST /api/models/train` Execution & Artifact Serialization Audit | **FAIL** | 80 | **CONFIRMED DEFECT (`FND-API-003`):** `backend/src/api/models.rs:141-170` returns hardcoded metrics (`roc_auc: 0.892`) regardless of seed, never calls Python `/api/models/train`, never creates the `.joblib` file on disk, and leaves `model_experiments` empty. |
| `API-004` | `rust_api_test` | `M12` | Rust ML Client Graceful Fallback When Python Service Is Unavailable | **PASS** | 2035 | When pointed to an unreachable port (`127.0.0.1:19999`), `MlClient` falls back cleanly without panicking. |
| `RISK-001` | `credit_risk_assessment_test` | `M07` | PD Threshold Boundary Mapping (`12%`, `35%`, `65%`) & Live Customer Evaluation | **PASS** | 100 | Verified exact boundary mapping (`LOW` `<0.12`, `MODERATE` `0.12..0.35`, `HIGH` `0.35..0.65`, `VERY_HIGH` `>=0.65`) and live customer assessment persistence. |
| `RISK-002` | `credit_risk_assessment_test` | `M07` | HITL Underwriter Review: Empty Justification Rejection & Action Status Mapping | **FAIL** | 76 | **CONFIRMED DEFECT (`FND-RISK-002`):** `POST /api/assessments/:id/review` accepts whitespace-only justification (`"   "`) with HTTP 200 and maps `REQUEST_DATA` to `REVIEWED_APPROVED`. |
| `MON-001` | `dynamic_risk_monitoring_test` | `M09` | `MISSED_UTILITY` Shock Injection, Utility Regularity Degradation & Positive PD Delta | **FAIL** | 124 | **CONFIRMED DEFECT (`FND-MON-001`):** `MISSED_UTILITY` inserts `1` missed utility bill (`utility_regularity_score` drops from `18/18=1.0` to `18/19=0.9474`). While the Rust fallback increases PD, the live Python LightGBM tree model assigns the same leaf probability (`0.0002` -> `0.0002`, `pd_delta = 0.0`) because `0.9474` remains above the tree's split threshold (`~0.85`). |
| `MON-002` | `dynamic_risk_monitoring_test` | `M09` | `INCOME_DROP` & `EXPENSE_SURGE` Feature Recalculation and PD Delta Verification | **FAIL** | 219 | **CONFIRMED CRITICAL DEFECT (`FND-MON-002`):** `monitoring.rs:88-116` updates `synthetic_customers.monthly_income` / `stated_monthly_expenses` without modifying `bank_transactions`. Because `calculator.rs:45-55` computes income and expense strictly from `bank_transactions` when transactions exist, all 12 features remain 100% unchanged and `pd_delta == 0.0` under both Python and Rust scorers! |
| `MON-003` | `dynamic_risk_monitoring_test` | `M09` | Temporal Score Invariance & Cross-Customer Event Isolation Invariant | **PASS** | 69 | Re-evaluating an unshocked customer produces `0.0` drift and zero cross-customer contamination. |
| `DB-001` | `database_integrity` | `M12` | 18-Table Relational Schema Verification & Orphaned Table Persistence Check | **FAIL** | 73 | **CONFIRMED DEFECT (`FND-DB-001`):** All 18 tables exist, but `transaction_classifications`, `model_experiments`, and `drift_reports` have `0` `INSERT` statements in the codebase and remain permanently empty (`0` rows). |
| `DB-002` | `database_integrity` | `M12` | SQLite WAL Mode, Foreign Key Enforcement & `.env` `DATABASE_URL` Path Consistency | **FAIL** | 1 | **CONFIRMED DEFECT (`FND-DB-002`):** `.env` sets `DATABASE_URL=sqlite://../data/credit_risk.db?mode=rwc`, which resolves outside the repository root when launched from the project root. |
| `AUD-001` | `audit_trail_integrity_test` | `M11` | Audit Trail Completeness Across All 5 Documented Lifecycle Actions | **FAIL** | 1 | **CONFIRMED DEFECT (`FND-AUD-001`):** `REASSESSMENT_TRIGGERED` is never written to `audit_logs` by `monitoring.rs`. |
| `AUD-002` | `audit_trail_integrity_test` | `M11` | Audit Trail Technical Immutability Verification (SQLite Trigger Protection) | **FAIL** | 19 | **CONFIRMED DEFECT (`FND-AUD-002`):** `audit_logs` has no `BEFORE UPDATE` or `BEFORE DELETE` triggers in `20261104_init.sql`; `DELETE FROM audit_logs` succeeded (`rows_deleted: 1`). |
| `SEC-001` | `security_test` | `M02` | SQL Construction & Injection Surface Audit on `/api/customers` | **FAIL** | 6 | **CONFIRMED DEFECT (`FND-SEC-001`):** `customers.rs:34-61` builds SQL using `format!` string interpolation instead of parameterized `sqlx::QueryBuilder` bindings. |
| `SEC-002` | `security_test` | `M12` | CORS Origin Restriction & Endpoint Authorization Audit | **FAIL** | 1 | **CONFIRMED DEFECT (`FND-SEC-002`):** Both Rust (`allow_origin(Any)`) and Python FastAPI (`allow_origins=["*"]`) permit unrestricted wildcard cross-origin requests. |
| `PERF-001` | `performance_test` | `M12` | Cohort Generation (`N=50, 150, 500`), Feature Calculation & 10x Concurrent Query Benchmark | **PASS** | 1055 | Empirical latencies: `N=50` (`64ms`), `N=150` (`188ms`), `N=500` (`567ms`), `150` feature vectors (`180ms`), `10x` concurrent `GET /api/customers` (`54ms`). |
| `UI-001` | `shap_xai_validation` | `M08` | `ShapWaterfall.tsx` Baseline Expectation & Attribution Percentage Scale Audit | **FAIL** | 1 | **CONFIRMED DEFECT (`FND-UI-001`):** `ShapWaterfall.tsx:50-58,103` multiplies log-odds `baseValue` (`-4.8197`) by `100`, rendering `-482.0%` with negative CSS width (`-481.97%`). |
| `PY-NLP-001` | `nlp_classification_test` | `M04` | Held-Out Bilingual 11-Category Classification & 94.5% Accuracy Claim Verification | **FAIL** | 112 | **CONFIRMED DEFECT (`FND-PY-NLP-001`):** On a 55-sample held-out bilingual test corpus across all 11 classes, accuracy is `78.18%` (Macro-F1 `0.8606`, unclassified rate `20.0%`) because `classifier.py` uses word-only TF-IDF on a tiny 61-item training list. |
| `PY-NLP-002` | `nlp_classification_test` | `M04` | Anti-Leakage Audit of `TransactionNLPClassifier.evaluate()` | **FAIL** | 22 | **CONFIRMED DEFECT (`FND-PY-NLP-002`):** `classifier.py:143` evaluates on `TRAINING_CORPUS` (`100%` train-test overlap, reporting in-sample Macro-F1 `1.0` vs held-out `0.8606`). |
| `PY-NLP-003` | `nlp_classification_test` | `M04` | NLP Low-Confidence Threshold (`< 0.65`) & Adversarial/Empty Input Handling | **FAIL** | 13 | **CONFIRMED DEFECT (`FND-PY-NLP-003`):** `classifier.py:137` uses `top_conf < 0.50` (and `nlp.rs:78` uses `< 0.60`) instead of the documented `< 0.65` threshold (`"GAJI MANDIRI"` with confidence `0.5277` is falsely marked `is_low_confidence = False`). |
| `PY-ML-001` | `ml_training_evaluation_test` | `M05` | LightGBM & XGBoost Deterministic Training, Artifact Serialization & Metric Formula Verification | **PASS** | 372 | Verified deterministic training (`seed=42`), `.joblib` serialization in `ml_service/artifacts/`, and exact agreement with independent `sklearn.metrics` oracle. |
| `PY-ML-002` | `ml_training_evaluation_test` | `M05` | Train/Evaluation Separation & Temporal Out-of-Time Split Audit | **FAIL** | 271 | **CONFIRMED DEFECT (`FND-PY-ML-002`):** `trainer.py:88-116` fits and evaluates on the exact same `(X, y)` matrix (`100%` overlap, reporting in-sample ROC-AUC `1.0000` vs true out-of-sample `0.9052`). |
| `PY-ML-003` | `model_comparison_test` | `M05` | Baseline Logistic Regression Training Support in Python ML Service | **FAIL** | 319 | **CONFIRMED DEFECT (`FND-PY-ML-003`):** `trainer.py` imports `LogisticRegression` on line 6 but never implements it; `main.py:75` silently trains `LightGBM` when `algorithm="Baseline_LogReg"`. |
| `PY-SHAP-001` | `shap_xai_validation` | `M08` | LightGBM TreeSHAP Additive Identity Verification (Log-Odds Margin Space) | **PASS** | 17 | Verified exact TreeSHAP additive identity in log-odds space: `sigmoid(base_value[-4.8197] + sum_shap[-2.2997]) = 0.000809 == predicted_pd`. |
| `PY-SHAP-002` | `shap_xai_validation` | `M08` | SHAP Scale Consistency with Waterfall UI & Dynamic Global Importance Audit | **FAIL** | 92 | **CONFIRMED DEFECT (`FND-PY-SHAP-002`):** Log-odds `base_value = -4.8197` breaks probability-scale UI waterfall, and `explainer.py:89-95` hardcodes `global_importance`. |
| `PY-SHAP-003` | `shap_xai_validation` | `M06` | XGBoost TreeSHAP Explainer Initialization & Non-Zero Attribution Verification | **FAIL** | 29 | **CONFIRMED DEFECT (`FND-SHAP-003`):** `shap.TreeExplainer(xgb_model)` raises `ValueError: could not convert string to float: '[3.75E-2]'` and silently returns `12` zero SHAP values (`0.0`) and `base_value = 0.20`. |
| `PY-PSI-001` | `psi_drift_validation` | `M10` | 10-Bucket PSI Calculation & Threshold Classification Oracle (`Stable`, `Moderate`, `Significant`) | **PASS** | 15 | Verified 10-bucket PSI formula against independent oracle: Identical (`0.0000` `STABLE`), Small (`0.0319` `STABLE`), Moderate (`0.1886` `MODERATE_DRIFT`), Significant (`1.4287` `SIGNIFICANT_DRIFT`). |
| `PY-PSI-002` | `psi_drift_validation` | `M10` | PSI Numerical Stability & Drift Detection Under Missing (`NaN`) Values | **FAIL** | 3 | **CONFIRMED DEFECT (`FND-PY-PSI-002`):** A single `NaN` in baseline causes `np.percentile` to return `NaN` bin edges, zeroing all histogram counts and returning `PSI = 0.0` (`STABLE`) instead of `1.4323` (`SIGNIFICANT_DRIFT`). |
| `PY-FAIR-001` | `fairness_audit` | `M11` | Fairness Metric Oracle (Approval Rate, Disparate Impact, FPR, FNR) & Brier Score Completeness | **FAIL** | 1 | **SPECIFICATION GAP (`FND-PY-FAIR-001`):** Approval Rate, Disparate Impact, FPR, and FNR match independent oracle and `group_cohort` is excluded from model features, but `audit.py` omits per-cohort `brier_score`. |
| `UI-E2E-001` | `frontend_functional` | `M12` | SPA Shell, Research Overview KPI Cards & Backend Telemetry Rendering | **PASS** | 1931 | Headless Chromium verified Sidebar, Header, Academic Prototype badge, and live Overview KPIs (`0` console errors). |
| `UI-E2E-002` | `frontend_functional` | `M01` | Synthetic Data Laboratory Form Controls & Data Dictionary Modal Inspection | **PASS** | 740 | Headless Chromium verified ChaCha8 badge, profile selector, seed input, and Data Dictionary modal. |
| `UI-E2E-003` | `frontend_functional` | `M02` | Customer Explorer Search, 8-Profile Filter & Customer 360 Feature Vector Modal | **PASS** | 2875 | Headless Chromium verified profile filtering (`Stable Income` -> `ALL`) and Customer 360 modal inspection. |
| `UI-E2E-004` | `frontend_functional` | `M04` | Bilingual Transaction NLP Interactive Classification & Confusion Matrix View | **PASS** | 1355 | Headless Chromium verified interactive classification of `'GAJI BULANAN PT MANDIRI SEJAHTERA'` -> `'Salary / Income'`. |
| `UI-E2E-005` | `frontend_functional` | `M07` | Credit Risk Decision Support PD Evaluation & Underwriter Review Table | **PASS** | 1466 | Headless Chromium triggered customer PD evaluation and verified risk category and recommendation rendering. |
| `UI-E2E-006` | `frontend_functional` | `M08` | Explainable AI (XAI) Workspace Local SHAP Waterfall & Global Importance View | **PASS** | 657 | Headless Chromium verified XAI Workspace rendering of local SHAP waterfall and global feature ranking. |
| `UI-E2E-007` | `frontend_functional` | `M09` | Dynamic Risk Monitoring Event Simulation & PSI Drift Surveillance View | **PASS** | 646 | Headless Chromium verified Dynamic Monitoring event controls, PD trajectory, and PSI drift table. |
| `UI-E2E-008` | `frontend_functional` | `M05` | Model Lab, Benchmark Comparison, Fairness Audit, Experiment History & System Diagnostics Navigation | **PASS** | 2636 | Headless Chromium navigated across all 5 remaining research/governance modules and verified data rendering. |
| `UI-E2E-009` | `frontend_functional` | `M12` | Autonomous QA & Audit Dashboard UI, 12-Module Matrix, Remediation Modal & Responsive Viewport | **PASS** | 2821 | Headless Chromium verified the new QA & Audit Center across desktop (`1440x900`) and mobile (`390x844`) viewports with `0` console errors and `0` failed network requests. |

---

## 4. Prioritized Remediation Roadmap (All Patches Held in `AWAITING_APPROVAL`)

In strict compliance with Rule 7 and Rule 13, **zero production business logic files were modified**. Every defect has a minimal, surgical patch stored in `qa_findings.proposed_patch_json` and inspectable in the **QA & Audit Center** UI modal (`Inspect Evidence & Patch`).

1. **Priority 1 (`CRITICAL` — Fix First):**
   - **`FND-SYNTH-005` (`backend/src/generator/engine.rs:189,371`):** Prefix `customer_code` and `account_number` with a deterministic short code derived from the dataset ID or seed (or offset by existing max index) so generating a second cohort does not fail with `UNIQUE constraint failed: synthetic_customers.customer_code`.
   - **`FND-MON-002` & `FND-MON-001` (`backend/src/api/monitoring.rs:88-137`):** When simulating `INCOME_DROP` and `EXPENSE_SURGE`, scale or insert corresponding `CREDIT`/`DEBIT` rows in `bank_transactions` so `FeatureCalculator` recomputes `avg_monthly_income`, `monthly_expense`, `net_cash_flow`, and `expense_to_income_ratio`. For `MISSED_UTILITY`, degrade multiple billing cycles (or adjust delinquent utility history proportionate to `magnitude_pct`) so tree-based models reflect the delinquency shock.
2. **Priority 2 (`HIGH` — Statistical & XAI Integrity):**
   - **`FND-SHAP-003` (`ml_service/app/xai/explainer.py:19-25`):** Compute XGBoost TreeSHAP contributions via `model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True)` so XGBoost explanations do not crash on `base_score = '[3.75E-2]'` and return all zeros.
   - **`FND-PY-SHAP-002` & `FND-UI-001` (`ml_service/app/xai/explainer.py` & `frontend/src/components/ShapWaterfall.tsx`):** Align the SHAP waterfall scale between Python log-odds output and the frontend probability waterfall (`[0, 1]`), and compute `global_importance` dynamically from `np.mean(np.abs(shap_values), axis=0)`.
   - **`FND-PY-ML-002` & `FND-PY-ML-003` (`ml_service/app/models/trainer.py` & `main.py`):** Evaluate models on a stratified holdout split (`train_test_split`) rather than 100% in-sample on the training matrix, and implement the `Baseline_LogReg` (`StandardScaler` + `LogisticRegression`) training branch.
   - **`FND-API-003` (`backend/src/api/models.rs`):** Delegate `POST /api/models/train` to the Python ML microservice, verify `.joblib` artifact creation, and persist experiment records into `model_experiments`.
   - **`FND-SEC-001` & `FND-API-001` (`backend/src/api/customers.rs:31-75`):** Replace `format!` SQL string interpolation with `sqlx::QueryBuilder` parameterized bindings and apply the active `WHERE` filters to the pagination `COUNT(*)` query.
3. **Priority 3 (`MEDIUM` / `LOW` — Governance, NLP, PSI & Schema Hygiene):**
   - **`FND-PY-PSI-002` (`ml_service/app/monitoring/drift.py:12`):** Filter `np.isfinite` values before calling `np.percentile` so a single `NaN` does not yield `PSI = 0.0` (`STABLE`).
   - **`FND-PY-NLP-001..003` (`ml_service/app/nlp/classifier.py` & `backend/src/api/nlp.rs`):** Unify the low-confidence threshold at `< 0.65`, add character n-grams (`char_wb` `(3,5)`) to TF-IDF, and evaluate on a held-out test split.
   - **`FND-FEAT-002` (`backend/src/features/calculator.rs:106-111`):** Return `0.5` (`neutral_0.5`) when `utilities.is_empty()`.
   - **`FND-RISK-002` (`backend/src/api/assessments.rs:284-305`):** Reject empty/whitespace underwriter justifications with HTTP 400 and map `REQUEST_DATA` to `DATA_REQUESTED`.
   - **`FND-AUD-001..002` & `FND-DB-001..002`:** Log `REASSESSMENT_TRIGGERED` in `monitoring.rs`, add SQLite `BEFORE UPDATE`/`BEFORE DELETE` immutability triggers on `audit_logs`, populate `transaction_classifications`, `model_experiments`, and `drift_reports`, and normalize `DATABASE_URL` in `.env`.

---

## 5. Deliverable 12: Test Execution Documentation

### 5.1 Running Individual Suites or Complete Audit via REST API
With the Rust backend running on `http://127.0.0.1:8240`:
```powershell
# Trigger a Complete System Audit in the background worker
Invoke-RestMethod -Uri "http://127.0.0.1:8240/api/qa/runs/trigger" `
  -Method Post -ContentType "application/json" `
  -Body '{"suite_mode":"complete_system_audit","triggered_by":"MANUAL_CLI"}'

# Poll overview status
Invoke-RestMethod -Uri "http://127.0.0.1:8240/api/qa/overview"

# Export full Markdown report
Invoke-RestMethod -Uri "http://127.0.0.1:8240/api/qa/reports/export?format=markdown" `
  -OutFile "backend/data/qa_evidence/latest_audit_report.md"
```

### 5.2 Supported 19 Execution Modes (`suite_mode`)
- `smoke_test`
- `frontend_functional`
- `rust_api_test`
- `database_integrity`
- `synthetic_data_validation`
- `feature_engineering_validation`
- `nlp_classification_test`
- `ml_training_evaluation_test`
- `model_comparison_test`
- `credit_risk_assessment_test`
- `shap_xai_validation`
- `dynamic_risk_monitoring_test`
- `psi_drift_validation`
- `fairness_audit`
- `experiment_reproducibility_test`
- `audit_trail_integrity_test`
- `security_test`
- `performance_test`
- `complete_system_audit`

### 5.3 Running Standalone Test Oracles Directly from CLI
```powershell
# 1. Run Rust Integration & Autonomous QA Engine Tests (isolated ephemeral SQLite DBs)
cd backend
cargo test --test integration_tests -- --nocapture

# 2. Run Python Mathematical & Statistical Oracles (11 test suites, JSON output)
cd ../ml_service
python tests/qa_oracles.py --json

# 3. Run Headless Chromium Playwright E2E Functional Audit (9 browser suites across all UI pages)
cd ../frontend
node e2e/run_playwright_audit.mjs
```

---

## 6. Deliverable 13: Configuration & Scheduling Documentation

### 6.1 Database & Evidence Isolation
- **Primary Research Database (Untouched by Destructive Tests):** `backend/data/credit_risk.db`
- **Dedicated QA Persistence Database:** `backend/data/qa_audit.db` (Initialized automatically via [`backend/migrations/20261105_qa_schema.sql`](file:///c:/Users/taufi/Documents/Projects/Credit%20Risk%20Dynamics%20&%20Explainable%20AI/backend/migrations/20261105_qa_schema.sql) with WAL mode and foreign keys enabled)
- **Ephemeral Isolated Test Databases:** `backend/data/qa_temp/qa_iso_<uuid>.db` (Created per test suite by `IsolatedTestEnv` in [`backend/src/qa/oracles.rs`](file:///c:/Users/taufi/Documents/Projects/Credit%20Risk%20Dynamics%20&%20Explainable%20AI/backend/src/qa/oracles.rs) and automatically unlinked upon suite completion)
- **Evidence Artifacts Directory:** `backend/data/qa_evidence/run_<run_id>_summary.json` and `latest_audit_report.md`

### 6.2 Built-In Autonomous Schedules (`qa_schedules`)
Seeded automatically on startup in `qa_audit.db` and configurable via the **QA & Audit Center -> Schedules** tab or `PUT /api/qa/schedules`:
1. **`startup_smoke`** (`smoke_test`): Runs automatically on backend boot.
2. **`startup_initial_full_audit`** (`complete_system_audit`): Runs automatically on first boot when `qa_runs` is empty so empirical audit evidence is immediately populated without manual user intervention.
3. **`daily_audit`** (`complete_system_audit`): Interval `86,400` seconds (24 hours).
4. **`weekly_comprehensive_audit`** (`complete_system_audit`): Interval `604,800` seconds (7 days).
5. **`commit_regression_watch`** (`complete_system_audit`): Triggers when the detected Git commit SHA changes.

---

## 7. Deliverable 14: Recovery & Troubleshooting Guide

### 7.1 Interrupted Run Recovery After Application Restart
- Whenever `QaEngine::init_and_start` boots in [`backend/src/qa/mod.rs`](file:///c:/Users/taufi/Documents/Projects/Credit%20Risk%20Dynamics%20&%20Explainable%20AI/backend/src/qa/mod.rs), `recover_interrupted_runs()` scans `qa_runs` for any records left in `RUNNING` or `QUEUED` state from an unclean process termination and transitions them to `INTERRUPTED` with timestamp and recovery notes.

### 7.2 Exclusive Suite Locking & Duplicate Run Prevention
- `QaEngine::enqueue_run` maintains an in-memory `active_suites: Mutex<HashSet<String>>` lock. Attempting to trigger a duplicate concurrent run of the same `suite_mode` (or while `complete_system_audit` is active) returns HTTP `409 Conflict`.

### 7.3 Cooperative Cancellation & Execution Timeouts
- Active runs can be cancelled at any time via `POST /api/qa/runs/:id/cancel` (or the **Cancel Active Run** button in the UI), which signals an `AtomicBool` cancellation token checked between every test step.
- Every suite execution is wrapped in a hard `tokio::time::timeout(Duration::from_secs(180))` guard so a hung external dependency can never block the worker indefinitely.

---

## 8. Deliverable 15: Regression Testing Instructions

1. **Before Applying a Fix:** Open the **QA & Audit Center** (`:3240`), select the target finding (`FND-...`), click **Inspect Evidence & Patch**, review the proposed diff and rollback instructions, and click **Approve Proposal** (which logs an `APPROVED` entry in `qa_remediation_logs`).
2. **Apply the Approved Code Change:** Edit the target file according to the approved diff.
3. **Run Targeted Regression Suite:** Trigger the specific suite mode in **QA & Audit Center** (e.g., `dynamic_risk_monitoring_test` for `FND-MON-002` or `shap_xai_validation` for `FND-SHAP-003`) or run `complete_system_audit`.
4. **Compare Baseline vs Post-Fix Run:** Open the **Run Comparison (`Diff`)** tab in the **QA & Audit Center** (or call `GET /api/qa/runs/compare?base_run_id=<before>&target_run_id=<after>`) to verify:
   - The target test case transitioned from `FAIL` -> `PASS` (`fixed_tests`).
   - Zero previously passing tests transitioned from `PASS` -> `FAIL` (`regressed_tests == 0`).
   - All `is_synthetic = 1` provenance invariants remain intact.
