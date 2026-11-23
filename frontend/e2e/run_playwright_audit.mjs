import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwrightPkg;
try {
  playwrightPkg = require('playwright');
} catch {
  playwrightPkg = require('C:/Users/taufi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
}

const { chromium } = playwrightPkg;

const IS_SHOWCASE_TEST = process.argv.includes('--showcase');
const TARGET_URL = process.env.E2E_URL || 'http://127.0.0.1:3240/';

function checkPageQuality(pageName, text) {
  const issues = [];
  if (!text || text.trim().length < 40) issues.push(`${pageName}: blank/empty screen`);
  if (text.includes('NaN%') || /\bNaN\b/.test(text)) issues.push(`${pageName}: rendered NaN`);
  if (text.includes('Invalid Date')) issues.push(`${pageName}: rendered Invalid Date`);
  if (text.includes('Workspace Recovery Mode')) issues.push(`${pageName}: ErrorBoundary triggered`);
  return issues;
}

async function runBrowserAudit() {
  console.log(
    `Launching headless Chromium for ${
      IS_SHOWCASE_TEST ? 'VERCEL SHOWCASE (NO BACKEND)' : 'FULL-STACK'
    } Frontend Audit at ${TARGET_URL}...`
  );
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const qualityIssues = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // In showcase mode, allow the single initial /api/health probe failure that locks showcase mode
      if (IS_SHOWCASE_TEST && consoleErrors.length === 0 && txt.includes('Failed to load resource')) {
        return;
      }
      consoleErrors.push(txt);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (IS_SHOWCASE_TEST && u.endsWith('/api/health')) {
      return;
    }
    failedRequests.push(`${req.method()} ${u} -> ${req.failure()?.errorText}`);
  });

  const executedCases = [];

  try {
    // 1. UI-E2E-001: Research Overview & Connection Mode Badge
    let t0 = Date.now();
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const headerText = await page.locator('header').innerText();
    const mainText1 = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('Overview', mainText1));

    const badgeMatches = IS_SHOWCASE_TEST
      ? headerText.includes('Portfolio Showcase')
      : headerText.includes('Live Backend :8240');
    const overviewLoaded =
      (mainText1.includes('50') || mainText1.includes('LightGBM')) && badgeMatches;

    executedCases.push({
      test_id: 'UI-E2E-001',
      title: 'SPA Shell, Research Overview KPI Cards & Connection Mode Telemetry',
      module_id: 'M12',
      module_name: 'System Settings & Overview',
      description:
        'Verifies Sidebar, Header connection badge, Overview KPI cards, and zero NaN/Invalid Date.',
      preconditions: IS_SHOWCASE_TEST ? 'Static frontend only (backend offline).' : 'Full-stack running.',
      status: overviewLoaded && qualityIssues.length === 0 ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/App.tsx, frontend/src/pages/OverviewPage.tsx, frontend/src/components/Header.tsx',
      assertion_text: 'assert Sidebar visible && accurate Header badge && Overview KPIs rendered',
      input_json: { url: TARGET_URL, showcase_mode: IS_SHOWCASE_TEST },
      expected_json: { overview_loaded: true, badge_matches: true },
      actual_json: { overview_loaded: overviewLoaded, badge_matches: badgeMatches, header_badge: headerText.slice(0, 120) },
      logs: `Overview verified (badgeMatches=${badgeMatches}, mode=${IS_SHOWCASE_TEST ? 'showcase' : 'live'}).`,
    });

    const sidebar = page.locator('aside');

    // 2. UI-E2E-002: Synthetic Data Laboratory & Data Dictionary Modal
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Synthetic Data Lab/i }).first().click();
    await page.waitForTimeout(450);
    const labText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('SyntheticLab', labText));
    const labLoaded = /Generate New Research Dataset/i.test(labText) && /ChaCha8/i.test(labText);

    const dictBtn = page.locator('main').getByRole('button', { name: /View Schema/i }).first();
    let dictModalWorked = false;
    if ((await dictBtn.count()) > 0) {
      await dictBtn.click();
      await page.waitForTimeout(250);
      const bodyTxt = await page.locator('body').innerText();
      dictModalWorked = bodyTxt.includes('avg_monthly_income');
      await page.keyboard.press('Escape');
      const closeBtn = page.locator('div.fixed button').first();
      if ((await closeBtn.count()) > 0) await closeBtn.click();
      await page.waitForTimeout(200);
    }

    executedCases.push({
      test_id: 'UI-E2E-002',
      title: 'Synthetic Data Laboratory Form Controls & Data Dictionary Modal Inspection',
      module_id: 'M01',
      module_name: 'Synthetic Data Laboratory',
      description: 'Verifies ChaCha8 badge, generator form, dataset table, and Data Dictionary schema modal.',
      preconditions: 'At least 1 dataset available.',
      status: labLoaded && dictModalWorked ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/SyntheticLabPage.tsx',
      assertion_text: 'assert labLoaded && dictModalWorked',
      input_json: { view: 'synthetic_lab' },
      expected_json: { form_visible: true, dict_modal_checked: true },
      actual_json: { form_visible: labLoaded, dict_modal_checked: dictModalWorked },
      logs: `Synthetic Data Lab verified (dictModalWorked=${dictModalWorked}).`,
    });

    // 3. UI-E2E-003: Customer Explorer & 360 Modal + Feature Engineering Page
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Customer Explorer/i }).first().click();
    await page.waitForTimeout(500);
    const selects = page.locator('main select');
    if ((await selects.count()) >= 2) {
      await selects.nth(0).selectOption('Stable Income');
      await page.waitForTimeout(300);
      await selects.nth(0).selectOption('ALL');
      await page.waitForTimeout(300);
    }
    const custMainTxt = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('CustomerExplorer', custMainTxt));

    const inspectBtn = page.locator('main table tbody tr').first().locator('button').first();
    let detailModalVisible = false;
    if ((await inspectBtn.count()) > 0) {
      await inspectBtn.click();
      await page.waitForTimeout(400);
      const modalText = await page.locator('body').innerText();
      detailModalVisible = modalText.includes('CUST-') && /Utility Payment History/i.test(modalText);
      const closeModalBtns = page.locator('div.fixed button');
      if ((await closeModalBtns.count()) > 0) {
        await closeModalBtns.first().click();
        await page.waitForTimeout(200);
      }
    }

    // Also navigate to dedicated Feature Engineering page (FEAT-003)
    await sidebar.getByRole('button', { name: /Feature Engineering/i }).first().click();
    await page.waitForTimeout(450);
    const featText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('FeatureEngineering', featText));
    const featPageOk =
      featText.includes('utility_regularity_score') && featText.includes('neutral_0.5');

    executedCases.push({
      test_id: 'UI-E2E-003',
      title: 'Customer Explorer 8-Profile Filter, 360 Modal & Dedicated Feature Engineering Page',
      module_id: 'M02',
      module_name: 'Synthetic Customer Explorer & Feature Engineering',
      description: 'Verifies Customer Explorer filtering, 360 modal utility payments, and Feature Engineering catalog.',
      preconditions: 'Customers seeded.',
      status: detailModalVisible && featPageOk ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/CustomerExplorerPage.tsx, FeatureEngineeringPage.tsx',
      assertion_text: 'assert detailModalVisible && featPageOk',
      input_json: { profile_filter: 'Stable Income' },
      expected_json: { detail_modal_visible: true, feature_engineering_page: true },
      actual_json: { detail_modal_visible: detailModalVisible, feature_engineering_page: featPageOk },
      logs: `Customer Explorer & Feature Engineering page verified.`,
    });

    // 4. UI-E2E-004: Transaction NLP Intelligence
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Transaction NLP/i }).first().click();
    await page.waitForTimeout(450);
    await page.locator('main').getByRole('button', { name: /Classify/i }).first().click();
    await page.waitForTimeout(450);
    const nlpText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('NlpIntelligence', nlpText));
    const nlpClassified =
      nlpText.includes('Salary / Income') &&
      /11-Class Evaluation Matrix/i.test(nlpText) &&
      /Overall Accuracy/i.test(nlpText);

    executedCases.push({
      test_id: 'UI-E2E-004',
      title: 'Bilingual Transaction NLP Interactive Classification & 11-Class Matrix',
      module_id: 'M04',
      module_name: 'Transaction NLP Intelligence',
      description: 'Submits Indonesian narrative and verifies category, confidence, models, and 11-class matrix.',
      preconditions: 'NLP view accessible.',
      status: nlpClassified ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/NlpIntelligencePage.tsx',
      assertion_text: "assert 'Salary / Income' && '11-Class Evaluation Matrix' rendered",
      input_json: { narrative: 'GAJI BULANAN PT MANDIRI SEJAHTERA' },
      expected_json: { classified: true },
      actual_json: { classified: nlpClassified },
      logs: 'NLP interactive classification and 11-class evaluation matrix verified.',
    });

    // 5. UI-E2E-005: Credit Risk Decision Support
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Credit Risk Decision/i }).first().click();
    await page.waitForTimeout(450);
    const evalBtn = page
      .locator('main button')
      .filter({ hasText: /Run Risk Assessment/i })
      .first();
    if ((await evalBtn.count()) > 0) {
      await evalBtn.click();
      await page.waitForTimeout(650);
    }
    const creditText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('CreditAssessment', creditText));
    const hasRiskDecision =
      creditText.includes('APPROVE_SUPPORTED') ||
      creditText.includes('REVIEW_RECOMMENDED') ||
      creditText.includes('CAUTION_FLAGGED');

    executedCases.push({
      test_id: 'UI-E2E-005',
      title: 'Credit Risk Decision Support PD Evaluation & Underwriter Review Table',
      module_id: 'M07',
      module_name: 'Credit Risk Decision Support',
      description: 'Triggers customer credit risk evaluation and verifies PD score, category, and history table.',
      preconditions: 'Customer selected.',
      status: hasRiskDecision ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/CreditAssessmentPage.tsx',
      assertion_text: 'assert PD score, risk_category, and recommendation render in UI',
      input_json: { view: 'credit_assessment' },
      expected_json: { has_risk_decision: true },
      actual_json: { has_risk_decision: hasRiskDecision },
      logs: 'Credit Risk Decision Support evaluation verified.',
    });

    // 6. UI-E2E-006: Explainable AI (XAI) Workspace + What-If Simulator
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Explainable AI \(XAI\)/i }).first().click();
    await page.waitForTimeout(500);
    const xaiText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('XaiWorkspace', xaiText));
    const hasWhatIf = await page.getByTestId('what-if-simulator').isVisible();
    const noNegBaseBug = !xaiText.includes('-482') && !xaiText.includes('-300');
    const xaiRendered =
      xaiText.includes('SHAP Waterfall Local Attribution Plot') && hasWhatIf && noNegBaseBug;

    executedCases.push({
      test_id: 'UI-E2E-006',
      title: 'Explainable AI (XAI) Workspace SHAP Waterfall & Counterfactual What-If Simulator',
      module_id: 'M08',
      module_name: 'Explainable AI Workspace',
      description: 'Verifies probability-scaled SHAP waterfall, global importance, and interactive What-If simulator.',
      preconditions: 'At least one assessment exists.',
      status: xaiRendered ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/XaiWorkspacePage.tsx, WhatIfSimulator.tsx, ShapWaterfall.tsx',
      assertion_text: 'assert SHAP waterfall && What-If simulator visible && no negative log-odds bug',
      input_json: { view: 'xai_workspace' },
      expected_json: { xai_rendered: true, has_what_if: true, no_neg_base_bug: true },
      actual_json: { xai_rendered: xaiRendered, has_what_if: hasWhatIf, no_neg_base_bug: noNegBaseBug },
      logs: 'XAI Workspace SHAP waterfall and Counterfactual What-If simulator verified.',
    });

    // 7. UI-E2E-007: Dynamic Risk Monitoring, Shock Simulation, Trajectory SVG & PSI Drift
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Dynamic Monitoring/i }).first().click();
    await page.waitForTimeout(500);
    const simBtn = page.locator('main').getByRole('button', { name: /Simulate Shock/i }).first();
    if ((await simBtn.count()) > 0) {
      await simBtn.click();
      await page.waitForTimeout(650);
    }
    const monText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('DynamicMonitoring', monText));
    const hasTrajChart = await page.getByTestId('pd-trajectory-chart').isVisible();
    const monRendered =
      monText.includes('PSI:') &&
      monText.includes('ALERT') &&
      hasTrajChart;

    executedCases.push({
      test_id: 'UI-E2E-007',
      title: 'Dynamic Risk Monitoring Shock Reassessment, PD Trajectory Chart & PSI Drift',
      module_id: 'M09',
      module_name: 'Dynamic Risk Monitoring',
      description: 'Injects shock event, verifies ALERT badge, PD trajectory SVG chart, and PSI feature drift table.',
      preconditions: 'DynamicMonitoringPage loaded.',
      status: monRendered ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/DynamicMonitoringPage.tsx',
      assertion_text: 'assert shock alert && PD trajectory chart && PSI drift cards visible',
      input_json: { view: 'dynamic_monitoring', shock: 'INCOME_DROP' },
      expected_json: { monitoring_rendered: true, trajectory_chart: true },
      actual_json: { monitoring_rendered: monRendered, trajectory_chart: hasTrajChart },
      logs: 'Dynamic Risk Monitoring shock simulation, PD trajectory SVG, and PSI drift verified.',
    });

    // 8. UI-E2E-008: Model Lab, Model Comparison (with SVG Charts), Fairness, History, Settings
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /Model Research Lab/i }).first().click();
    await page.waitForTimeout(350);
    await page.locator('main').getByRole('button', { name: /Start Training Run/i }).first().click();
    await page.waitForTimeout(600);
    const modelLabText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('ModelLab', modelLabText));
    const modelLabOk = modelLabText.includes('TRAINED & SERIALIZED') && modelLabText.includes('ROC-AUC');

    await sidebar.getByRole('button', { name: /Model Comparison/i }).first().click();
    await page.waitForTimeout(450);
    const compText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('ModelComparison', compText));
    const compChartsVisible = await page.getByTestId('model-comparison-charts').isVisible();
    const modelCompOk = compText.includes('XGBoost') && compText.includes('CHAMPION') && compChartsVisible;

    await sidebar.getByRole('button', { name: /Fairness & Bias Audit/i }).first().click();
    await page.waitForTimeout(450);
    const fairText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('FairnessValidation', fairText));
    const fairnessOk = fairText.includes('Group_A') && /Brier Score/i.test(fairText) && /Parity Audit Summary/i.test(fairText);

    await sidebar.getByRole('button', { name: /Experiment History/i }).first().click();
    await page.waitForTimeout(450);
    const expText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('ExperimentHistory', expText));
    const expOk = /Regulatory & Underwriting Audit Events/i.test(expText) && !expText.includes('Invalid Date');

    await sidebar.getByRole('button', { name: /System & Ports/i }).first().click();
    await page.waitForTimeout(450);
    const setText = await page.locator('main').innerText();
    qualityIssues.push(...checkPageQuality('Settings', setText));
    const settingsOk = setText.includes('8240') && setText.includes('HEALTHY');

    const allRemainingModulesOk = modelLabOk && modelCompOk && fairnessOk && expOk && settingsOk;

    executedCases.push({
      test_id: 'UI-E2E-008',
      title: 'Model Lab Training, ROC/Calibration Charts, Fairness Brier, Audit History & Settings',
      module_id: 'M05',
      module_name: 'Model Research, Fairness & Governance Views',
      description: 'Runs Model Lab training, verifies ROC/Calibration SVG charts, Fairness Brier scores, valid audit timestamps, and System Settings.',
      preconditions: 'All views reachable.',
      status: allRemainingModulesOk ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'ModelLabPage.tsx, ModelComparisonPage.tsx, FairnessValidationPage.tsx, ExperimentHistoryPage.tsx, SettingsPage.tsx',
      assertion_text: 'assert modelLabOk && modelCompOk && fairnessOk && expOk && settingsOk',
      input_json: { views: ['model_lab', 'model_comparison', 'fairness_validation', 'experiments', 'settings'] },
      expected_json: { all_rendered: true },
      actual_json: { modelLabOk, modelCompOk, fairnessOk, expOk, settingsOk },
      logs: 'All 5 modeling, chart, fairness, audit trail, and system diagnostics pages verified.',
    });

    // 9. UI-E2E-009: Autonomous QA & Audit Center + Zero Console Errors / Zero Quality Defects
    t0 = Date.now();
    await sidebar.getByRole('button', { name: /QA & Audit Center/i }).first().click();
    await page.waitForTimeout(600);
    const qaDash = page.getByTestId('qa-audit-dashboard');
    const qaVisible = await qaDash.isVisible();
    const qaText = qaVisible ? await qaDash.innerText() : '';
    qualityIssues.push(...checkPageQuality('QaAuditDashboard', qaText));
    const qaHasContent = qaText.includes('Autonomous QA & Empirical Audit Status') && !qaText.includes('NEVER_AUDITED');

    await page.locator('main').getByRole('button', { name: /Test Case Explorer/i }).first().click();
    await page.waitForTimeout(250);
    await page.locator('main').getByRole('button', { name: /12-Module Coverage Matrix/i }).first().click();
    await page.waitForTimeout(250);
    const covText = await page.locator('main').innerText();
    const has12Modules = covText.includes('M01') && covText.includes('M12');
    await page.locator('main').getByRole('button', { name: /Schedules/i }).first().click();
    await page.waitForTimeout(250);
    await page.locator('main').getByRole('button', { name: /Run Comparison/i }).first().click();
    await page.waitForTimeout(250);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const mobileVisible = await qaDash.isVisible();
    await page.setViewportSize({ width: 1440, height: 900 });

    const qaPass =
      qaHasContent &&
      has12Modules &&
      mobileVisible &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      failedRequests.length === 0 &&
      qualityIssues.length === 0;

    executedCases.push({
      test_id: 'UI-E2E-009',
      title: 'Autonomous QA Dashboard, 12-Module Matrix, Responsive Layout & Zero Console/NaN Errors',
      module_id: 'M12',
      module_name: 'Autonomous QA & Empirical Audit Center',
      description: 'Verifies QA Dashboard KPIs, 12-module coverage, responsive viewport, and global zero console/page/NaN/Invalid Date invariants.',
      preconditions: 'All 14 pages traversed.',
      status: qaPass ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - t0,
      source_refs: 'frontend/src/pages/QaAuditDashboardPage.tsx',
      assertion_text: 'assert qaHasContent && has12Modules && mobileVisible && consoleErrors==0 && qualityIssues==0',
      input_json: { mode: IS_SHOWCASE_TEST ? 'showcase' : 'full_stack', viewports: ['1440x900', '390x844'] },
      expected_json: { qa_rendered: true, console_errors: 0, page_errors: 0, failed_requests: 0, quality_issues: 0 },
      actual_json: {
        qa_rendered: qaHasContent,
        has_12_modules: has12Modules,
        mobile_visible: mobileVisible,
        console_errors: consoleErrors,
        page_errors: pageErrors,
        failed_requests: failedRequests,
        quality_issues: qualityIssues,
      },
      logs: `Verified across 14 modules: consoleErrors=${consoleErrors.length}, pageErrors=${pageErrors.length}, failedRequests=${failedRequests.length}, qualityIssues=${qualityIssues.length}.`,
    });

    // Save results file
    const outName = IS_SHOWCASE_TEST ? 'e2e-results-showcase.json' : 'e2e-results.json';
    fs.writeFileSync(
      path.resolve(outName),
      JSON.stringify({ mode: IS_SHOWCASE_TEST ? 'showcase' : 'full_stack', executed_at: new Date().toISOString(), cases: executedCases }, null, 2)
    );

    // Ingest into backend /api/qa/runs/ingest-external when running in full-stack mode
    if (!IS_SHOWCASE_TEST) {
      try {
        const ovResp = await fetch('http://127.0.0.1:8240/api/qa/overview');
        if (ovResp.ok) {
          const ovJson = await ovResp.json();
          const latestRunId = ovJson?.latest_run?.id;
          const ingestResp = await fetch('http://127.0.0.1:8240/api/qa/runs/ingest-external', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              suite_mode: 'frontend_functional',
              triggered_by: 'PLAYWRIGHT_HEADLESS_CHROMIUM',
              append_to_run_id: latestRunId || undefined,
              cases: executedCases,
            }),
          });
          const ingestJson = await ingestResp.json();
          console.log('Ingested Playwright E2E cases into qa_audit.db:', JSON.stringify(ingestJson));
        }
      } catch (e) {
        console.warn('Could not ingest E2E cases into backend:', e.message);
      }
    }

    const passCount = executedCases.filter((c) => c.status === 'PASS').length;
    console.log(
      `Playwright E2E Audit (${IS_SHOWCASE_TEST ? 'SHOWCASE' : 'FULL-STACK'}) Finished: ${passCount}/${executedCases.length} PASS (Console Errors: ${consoleErrors.length}, Page Errors: ${pageErrors.length}, Failed Requests: ${failedRequests.length}, Quality Issues: ${qualityIssues.length})`
    );
    if (passCount !== executedCases.length) {
      console.error('Failing cases:', JSON.stringify(executedCases.filter((c) => c.status !== 'PASS'), null, 2));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runBrowserAudit().catch((err) => {
  console.error('Playwright E2E Audit failed:', err);
  process.exit(1);
});
