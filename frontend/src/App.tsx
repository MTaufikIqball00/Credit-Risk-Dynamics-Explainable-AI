import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { SyntheticLabPage } from './pages/SyntheticLabPage';
import { CustomerExplorerPage } from './pages/CustomerExplorerPage';
import { NlpIntelligencePage } from './pages/NlpIntelligencePage';
import { CreditAssessmentPage } from './pages/CreditAssessmentPage';
import { XaiWorkspacePage } from './pages/XaiWorkspacePage';
import { DynamicMonitoringPage } from './pages/DynamicMonitoringPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import { FairnessValidationPage } from './pages/FairnessValidationPage';
import { ExperimentHistoryPage } from './pages/ExperimentHistoryPage';
import { QaAuditDashboardPage } from './pages/QaAuditDashboardPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [currentNav, setCurrentNav] = useState<NavItemKey>('overview');
  const [assessmentCustId, setAssessmentCustId] = useState<string>('');
  const [xaiAssessmentId, setXaiAssessmentId] = useState<string>('');

  const titles: Record<NavItemKey, { title: string; subtitle: string }> = {
    overview: {
      title: 'Research Overview',
      subtitle: 'Executive dashboard tracking synthetic portfolios, active model performance, and alerts.',
    },
    synthetic_lab: {
      title: 'Synthetic Data Laboratory',
      subtitle: 'Deterministic generation of academic credit datasets with strict leakage isolation.',
    },
    customer_explorer: {
      title: 'Synthetic Customer Explorer',
      subtitle: 'Deep profile inspection across 8 financial scenarios and longitudinal transaction series.',
    },
    nlp_intelligence: {
      title: 'Transaction NLP Intelligence',
      subtitle: 'Natural language classification of Indonesian & English banking transaction descriptions.',
    },
    credit_assessment: {
      title: 'Credit Risk Decision Support',
      subtitle: 'Multi-feature PD scoring, risk categorization, and underwriter manual review simulation.',
    },
    xai_workspace: {
      title: 'Explainable AI (XAI) Workspace',
      subtitle: 'TreeSHAP waterfall attribution and global feature importance diagnostics.',
    },
    dynamic_monitoring: {
      title: 'Dynamic Risk Monitoring & Drift',
      subtitle: 'Temporal event shock simulation, automated reassessments, and PSI drift surveillance.',
    },
    model_lab: {
      title: 'Model Research Laboratory',
      subtitle: 'LightGBM and XGBoost training, hyperparameter tuning, and probabilistic calibration.',
    },
    model_comparison: {
      title: 'Model Benchmark Comparison',
      subtitle: 'Side-by-side discrimination and calibration trade-off analysis across model families.',
    },
    fairness_validation: {
      title: 'Fairness & Research Validation',
      subtitle: 'Demographic parity and error rate disparity auditing across synthetic research cohorts.',
    },
    experiments: {
      title: 'Experiment & Audit Trail',
      subtitle: 'Immutable record of model training runs, reassessment triggers, and committee overrides.',
    },
    qa_audit: {
      title: 'Autonomous QA & Empirical Audit Center',
      subtitle: 'Independent mathematical oracles, isolated database testing, root-cause forensics, and controlled remediation governance.',
    },
    settings: {
      title: 'System Settings & Diagnostics',
      subtitle: 'Port allocations, health endpoints, database schema integrity, and research governance.',
    },
  };

  const handleSelectCustomerForAssessment = (customerId: string) => {
    setAssessmentCustId(customerId);
    setCurrentNav('credit_assessment');
  };

  const handleNavigateToXai = (assessmentId: string) => {
    setXaiAssessmentId(assessmentId);
    setCurrentNav('xai_workspace');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar currentNav={currentNav} onSelectNav={setCurrentNav} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          pageTitle={titles[currentNav].title}
          pageSubtitle={titles[currentNav].subtitle}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {currentNav === 'overview' && (
            <OverviewPage onNavigate={setCurrentNav} />
          )}
          {currentNav === 'synthetic_lab' && <SyntheticLabPage />}
          {currentNav === 'customer_explorer' && (
            <CustomerExplorerPage
              onSelectCustomerForAssessment={handleSelectCustomerForAssessment}
            />
          )}
          {currentNav === 'nlp_intelligence' && <NlpIntelligencePage />}
          {currentNav === 'credit_assessment' && (
            <CreditAssessmentPage
              initialCustomerId={assessmentCustId}
              onNavigateToXai={handleNavigateToXai}
            />
          )}
          {currentNav === 'xai_workspace' && (
            <XaiWorkspacePage initialAssessmentId={xaiAssessmentId} />
          )}
          {currentNav === 'dynamic_monitoring' && <DynamicMonitoringPage />}
          {currentNav === 'model_lab' && <ModelLabPage />}
          {currentNav === 'model_comparison' && <ModelComparisonPage />}
          {currentNav === 'fairness_validation' && <FairnessValidationPage />}
          {currentNav === 'experiments' && <ExperimentHistoryPage />}
          {currentNav === 'qa_audit' && <QaAuditDashboardPage />}
          {currentNav === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};
