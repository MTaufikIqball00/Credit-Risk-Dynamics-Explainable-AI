# Empirical QA & Autonomous Audit Report and Operations Manual
**Project:** AI Dynamic Credit Risk Research & Monitoring Platform  
**Audit System:** Autonomous QA Engine (`backend/src/qa/*`, `ml_service/tests/qa_oracles.py`, `frontend/e2e/run_playwright_audit.mjs`, `frontend/src/pages/QaAuditDashboardPage.tsx`)  
**Baseline Run ID:** `5bc9735a-5123-40d6-bef8-c6783931cb57` (`23/47` PASS — `REQUIRES CORRECTION`)  
**Latest Verified Post-Fix Run ID:** `cb9c4547-51bf-4746-921b-9f5f1ffda829` (`47/47` PASS — `complete_system_audit` + `frontend_functional` Headless Chromium E2E)  
**Audit Conclusion:** **`HEALTHY` (`47/47` PASS, `100.0%` Pass Rate, `0` Failed, `0` Not Implemented, `0` Regressions)**

---

## 1. Executive Summary — Before vs After Empirical Comparison

All **24** empirical defects and specification gaps identified during the baseline audit (`5bc9735a-5123-40d6-bef8-c6783931cb57`) plus all Priority 1–4 enhancements (Vercel Showcase Mode parity, Counterfactual What-If Simulator, dedicated Feature Engineering module, interactive ROC/Calibration & Longitudinal PD Trajectory SVG charts, GitHub Actions CI, and Docker Compose containerization) have been implemented and empirically verified.

| Audit Metric | Baseline (`5bc9735a...`) | Post-Fix (`cb9c4547...`) | Delta |
|---|---:|---:|---:|
| **Overall Health Verdict** | `CRITICAL_FAILURES` | **`HEALTHY`** | Resolved |
| **Total Executed Assertions** | `47` | **`47`** | `0` |
| **Passed (`PASS`)** | `23` (`48.9%`) | **`47` (`100.0%`)** | **`+24` (`+51.1%` total / `+63.2%` Rust+Py)** |
| **Failed (`FAIL`)** | `23` | **`0`** | **`-23`** |
| **Not Implemented (`NOT_IMPLEMENTED`)** | `1` (`FEAT-003`) | **`0`** | **`-1`** |
| **Blocked (`BLOCKED`)** | `0` | **`0`** | `0` |
| **Regressions (`PASS` -> `FAIL`)** | — | **`0`** | **Zero Regression Verified** |
| **Rust `cargo test` Integration Suite** | `4/4` PASS | **`4/4` PASS** | Maintained |
| **Rust `cargo clippy --all-targets -- -D warnings`** | — | **`0` warnings / `0` errors** | Clean |
| **Python `pytest` + Mathematical Oracles** | `3/12` Oracles PASS | **`5/5` Unit + `12/12` Oracles PASS** | **`+9` Oracles Fixed** |
| **Frontend `tsc` + `vite build`** | `1516` modules | **`1519` modules (`0` errors)** | Clean |
| **Playwright Full-Stack E2E (`:3240` + `:8240` + `:8241`)** | `9/9` PASS | **`9/9` PASS (`0` console/page/NaN errors)** | Verified across 14 modules |
| **Playwright Vercel Showcase E2E (No Backend)** | Broken contracts / 404 spam | **`9/9` PASS (`0` console/page/NaN/404 errors)** | 100% Standalone Parity |

---

## 2. Verified Remediation Summary (All 24 Baseline Findings Resolved)

### Priority 1 — Portfolio & Vercel Showcase Mode Parity
- **[`frontend/src/api/mockData.ts`](frontend/src/api/mockData.ts) & [`frontend/src/api/client.ts`](frontend/src/api/client.ts):**
  - Synchronized every single mock response contract with the actual React page expectations across all 14 views (`OverviewPage`, `SyntheticLabPage`, `CustomerExplorerPage`, `FeatureEngineeringPage`, `NlpIntelligencePage`, `CreditAssessmentPage`, `XaiWorkspacePage`, `DynamicMonitoringPage`, `ModelLabPage`, `ModelComparisonPage`, `FairnessValidationPage`, `ExperimentHistoryPage`, `QaAuditDashboardPage`, `SettingsPage`).
  - Standardized all 8 official synthetic customer profile names (`Stable Income`, `Variable Income`, `Irregular Income`, `High Expense Burden`, `Consistent Payment`, `Irregular Payment`, `Thin-file Customer`, `No Credit History`), added `utility_payments` on Customer 360 detail, and made `profile`, `cohort`, and `search` filters work completely in-memory.
  - Added stateful in-memory persistence during Showcase sessions (new synthetic datasets, customer evaluations, underwriter overrides, dynamic shock simulations mutating PD & timeline, QA schedule toggles, and remediation approvals).
  - Implemented smart showcase mode detection (`VITE_SHOWCASE_MODE` or single `/api/health` JSON probe auto-lock) eliminating 404/HTML rewrite polling spam on Vercel static hosting.
  - Enabled client-side `Blob` downloads for QA `JSON`, `CSV`, and `Markdown` exports in Showcase mode.
- **[`frontend/src/components/Header.tsx`](frontend/src/components/Header.tsx):** Dynamically displays `Live Backend :8240` + `Python ML :8241` when connected vs `Portfolio Showcase (Simulated)` when running statically.
- **[`frontend/src/components/ErrorBoundary.tsx`](frontend/src/components/ErrorBoundary.tsx) & [`frontend/src/App.tsx`](frontend/src/App.tsx):** Added global React `ErrorBoundary` recovery wrapper.

### Priority 2 — Backend, ML, XAI, Database & Security Remediations
| Finding(s) | File(s) Modified | Root Fix Implemented | Verified By |
|---|---|---|---|
| `FND-SYNTH-005` | `backend/src/generator/engine.rs` | Dataset-scoped `cohort_tag` (`&dataset_id[..6].to_uppercase()`) namespaces `customer_code` (`CUST-<TAG>-00001`) and `account_number` (`SYNTH-<TAG>-0001`) without consuming ChaCha8 PRNG state. | `SYNTH-001`, `SYNTH-005` (`PASS`) |
| `FND-MON-001`, `FND-MON-002` | `backend/src/api/monitoring.rs`, `ml_service/app/models/trainer.py` | `INCOME_DROP` and `EXPENSE_SURGE` now scale `bank_transactions` CREDIT/DEBIT rows and running balances; `MISSED_UTILITY` injects proportional multi-utility delinquent cycles; aligned synthetic training probability calibration with chronic utility delinquency; 4-decimal `pd_delta` precision. | `MON-001`, `MON-002`, `MON-003` (`PASS`) |
| `FND-FEAT-002` | `backend/src/features/calculator.rs` | Empty `utilities` slice now returns `0.5` matching documented `missing_policy: "neutral_0.5"`. | `FEAT-001`, `FEAT-002` (`PASS`) |
| `FND-SHAP-003`, `FND-PY-SHAP-002`, `FND-UI-001` | `ml_service/app/xai/explainer.py`, `backend/src/ml_client/client.rs`, `frontend/src/components/ShapWaterfall.tsx` | Native C++ XGBoost TreeSHAP via `booster.predict(xgb.DMatrix(X), pred_contribs=True)`; exact probability-space additive projection (`base_prob + sum(phi_i) == PD` preserving margin signs); dynamic `mean(|SHAP|)` global importance per model; safe `[0, 100]%` clamping in `ShapWaterfall.tsx`. | `PY-SHAP-001`, `PY-SHAP-002`, `PY-SHAP-003`, `UI-001` (`PASS`) |
| `FND-API-003`, `FND-PY-ML-002`, `FND-PY-ML-003` | `ml_service/app/models/trainer.py`, `ml_service/app/main.py`, `backend/src/ml_client/client.rs`, `backend/src/api/models.rs` | Stratified 75/25 holdout evaluation (`train_eval_overlap = 0.0`); real `Baseline_LogReg` (`StandardScaler` + `LogisticRegression`) training & `/api/models/compare`; Rust `POST /api/models/train` delegates to Python, writes `.joblib` artifacts, and records `model_experiments`. | `API-003`, `PY-ML-001`, `PY-ML-002`, `PY-ML-003` (`PASS`) |
| `FND-PY-NLP-001..003` | `ml_service/app/nlp/classifier.py`, `backend/src/ml_client/client.rs`, `backend/src/api/nlp.rs` | `FeatureUnion` (`word (1,2)` + `char_wb (3,5)`) TF-IDF + L2 LogisticRegression on expanded strictly-disjoint bilingual corpus (`0` overlap, `>= 94.5%` held-out accuracy); unified `< 0.65` low-confidence threshold across Python & Rust; `evaluate()` uses stratified holdout split (`0%` overlap); persists `transaction_classifications`. | `PY-NLP-001`, `PY-NLP-002`, `PY-NLP-003`, `DB-001` (`PASS`) |
| `FND-PY-PSI-002` | `ml_service/app/monitoring/drift.py`, `backend/src/api/monitoring.rs` | Filters `np.isfinite` values before `np.percentile` so `NaN` values never blind drift detection; persists `drift_reports` in SQLite. | `PY-PSI-001`, `PY-PSI-002`, `DB-001` (`PASS`) |
| `FND-PY-FAIR-001` | `ml_service/app/fairness/audit.py`, `backend/src/api/fairness.rs` | Added per-cohort `brier_calibration_score` and `parity_audit` summary across Python & Rust. | `PY-FAIR-001` (`PASS`) |
| `FND-API-001`, `FND-SEC-001` | `backend/src/api/customers.rs` | Replaced `format!` SQL string interpolation with parameterized `sqlx::QueryBuilder` bindings on both `SELECT` and filtered `COUNT(*)`. | `API-001`, `SEC-001` (`PASS`) |
| `FND-RISK-002` | `backend/src/api/assessments.rs` | Rejects empty/whitespace justifications with HTTP `400 Bad Request`; maps `REQUEST_DATA` -> `DATA_REQUESTED`, `ESCALATE` -> `ESCALATED`, `OVERRIDE` -> `OVERRIDDEN`. | `RISK-001`, `RISK-002` (`PASS`) |
| `FND-DB-001`, `FND-DB-002`, `FND-AUD-001`, `FND-AUD-002`, `FND-SEC-002` | `backend/migrations/20261104_init.sql`, `backend/src/db/mod.rs`, `backend/src/config.rs`, `backend/src/api/mod.rs`, `ml_service/app/main.py`, `.env`, `.env.example` | Enforced SQLite WAL + `foreign_keys(true)`; added `BEFORE UPDATE` & `BEFORE DELETE` immutability triggers on `audit_logs`; logged `REASSESSMENT_TRIGGERED` in `monitoring.rs`; populated `transaction_classifications`, `model_experiments`, `drift_reports`; normalized `DATABASE_URL=sqlite://data/credit_risk.db?mode=rwc`; restricted CORS origins via `CORS_ALLOWED_ORIGINS`. | `DB-001`, `DB-002`, `AUD-001`, `AUD-002`, `SEC-002` (`PASS`) |

### Priority 3 & 4 — Advanced Features, Interactive Visuals & DevOps
- **Dedicated Feature Engineering Module (`FEAT-003` -> `PASS`):** Created [`frontend/src/pages/FeatureEngineeringPage.tsx`](frontend/src/pages/FeatureEngineeringPage.tsx) and registered it in `Sidebar.tsx` and `App.tsx` with the 12-feature mathematical dictionary, 8-profile distribution cards, and on-demand snapshot recomputation.
- **Counterfactual "What-If" Credit Simulator:** Created [`frontend/src/components/WhatIfSimulator.tsx`](frontend/src/components/WhatIfSimulator.tsx) embedded in `XaiWorkspacePage.tsx`, enabling live interactive perturbation of DTI, Expense Ratio, Utility Regularity, Net Cash Flow, and Income Variability in both Full-Stack and Vercel Showcase modes.
- **Interactive SVG Charts:** Added ROC Discrimination & Probabilistic Calibration Reliability SVG curves in `ModelComparisonPage.tsx` and Longitudinal PD Trajectory SVG chart (with 12% / 35% / 65% risk tier bands) in `DynamicMonitoringPage.tsx`.
- **CI/CD & Containerization:** Added [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`backend/Dockerfile`](backend/Dockerfile), [`ml_service/Dockerfile`](ml_service/Dockerfile), [`frontend/Dockerfile`](frontend/Dockerfile), [`docker-compose.yml`](docker-compose.yml), and hardened [`.gitignore`](.gitignore) (ignoring `.env`, `*.db-wal`, `*.db-shm`, runtime logs).

---

## 3. Standalone Verification & Execution Commands

```powershell
# 1. Rust Unit/Integration Tests & Strict Clippy Check
cargo test --manifest-path backend/Cargo.toml
cargo clippy --manifest-path backend/Cargo.toml --all-targets -- -D warnings

# 2. Python Unit Tests & 12 Mathematical Oracles
python -m pytest ml_service/tests/test_ml_service.py ml_service/tests/qa_oracles.py -v
python ml_service/tests/qa_oracles.py --json

# 3. Frontend Production TypeScript + Vite Build
cd frontend && npm run build

# 4. Playwright Headless Chromium E2E (Full-Stack Mode — requires services running)
cd frontend && node e2e/run_playwright_audit.mjs

# 5. Playwright Headless Chromium E2E (Vercel Showcase Mode — no backend required)
cd frontend && npx vite preview --port 3245 --host 127.0.0.1
# In another shell:
$env:E2E_URL="http://127.0.0.1:3245/"; node frontend/e2e/run_playwright_audit.mjs --showcase
```

---

## 4. Deployment Guides (Vercel Showcase & Docker Full-Stack)

### A. Vercel Static Portfolio Showcase Deployment (Zero Backend)
1. Connect the repository in Vercel and set **Root Directory** to `frontend`.
2. Build Command: `npm run build` | Output Directory: `dist`.
3. Optional Environment Variable: `VITE_SHOWCASE_MODE=true` (even without it, the app auto-detects static hosting on the first `/api/health` check and locks into Showcase mode with zero 404 polling noise).
4. `frontend/vercel.json` handles SPA rewrites cleanly.

### B. Full-Stack Container Deployment (Docker Compose)
```bash
docker compose up --build -d
```
- **Frontend UI:** `http://localhost:3240`
- **Rust Axum Backend API:** `http://localhost:8240` (`GET /api/health`)
- **Python FastAPI ML & XAI Microservice:** `http://localhost:8241` (`GET /health`)
- **Persistent Volumes:** `./data` (SQLite WAL `credit_risk.db` & `qa_audit.db`) and `./artifacts` (`.joblib` trained models).

### C. Local Windows Launcher
- Start all 3 services: `start.bat`
- Stop all 3 services gracefully: `stop.bat`
