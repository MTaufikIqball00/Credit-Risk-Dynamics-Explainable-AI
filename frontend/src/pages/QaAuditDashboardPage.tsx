import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Play,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Terminal,
  GitCompare,
  Calendar,
  Wrench,
  Eye,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';

export const QaAuditDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [selectedSuiteMode, setSelectedSuiteMode] = useState<string>('complete_system_audit');
  const [activeTab, setActiveTab] = useState<'findings' | 'explorer' | 'coverage' | 'schedules' | 'compare'>('findings');

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected items for inspection / remediation modal
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [remediationAction, setRemediationAction] = useState<'APPROVE' | 'REJECT' | 'DEFER'>('APPROVE');
  const [remediationRationale, setRemediationRationale] = useState<string>('');
  const [remediationStatusMsg, setRemediationStatusMsg] = useState<string>('');

  // Run comparison state
  const [compareBaseId, setCompareBaseId] = useState<string>('');
  const [compareTargetId, setCompareTargetId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const loadAll = async (preserveSelection = true) => {
    try {
      const [ov, runsRes, schedRes] = await Promise.all([
        api.getQaOverview(),
        api.getQaRuns(),
        api.getQaSchedules(),
      ]);
      setOverview(ov);
      const runList = runsRes.runs || [];
      setRuns(runList);
      setSchedules(schedRes.schedules || []);

      const targetRunId =
        preserveSelection && selectedRunId
          ? selectedRunId
          : ov?.latest_run?.id || (runList[0]?.id ?? '');

      if (targetRunId) {
        if (!selectedRunId || !preserveSelection) {
          setSelectedRunId(targetRunId);
        }
        const [tcRes, fndRes] = await Promise.all([
          api.getQaTestCases({
            run_id: targetRunId,
            module_id: moduleFilter || undefined,
            status: statusFilter || undefined,
            search: searchQuery || undefined,
          }),
          api.getQaFindings({
            run_id: targetRunId,
            severity: severityFilter || undefined,
            module_id: moduleFilter || undefined,
          }),
        ]);
        setTestCases(tcRes.test_cases || []);
        setFindings(fndRes.findings || []);
      }

      if (runList.length >= 2 && !compareBaseId && !compareTargetId) {
        setCompareTargetId(runList[0].id);
        setCompareBaseId(runList[1].id);
      }
    } catch (err) {
      console.error('Failed to load QA Dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(false);
    const timer = setInterval(() => {
      loadAll(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      api
        .getQaTestCases({
          run_id: selectedRunId,
          module_id: moduleFilter || undefined,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        })
        .then((res) => setTestCases(res.test_cases || []))
        .catch(console.error);

      api
        .getQaFindings({
          run_id: selectedRunId,
          severity: severityFilter || undefined,
          module_id: moduleFilter || undefined,
        })
        .then((res) => setFindings(res.findings || []))
        .catch(console.error);
    }
  }, [selectedRunId, severityFilter, moduleFilter, statusFilter, searchQuery]);

  const handleTriggerSuite = async (mode: string) => {
    setTriggering(true);
    try {
      const res = await api.triggerQaRun(mode, 'MANUAL_UI');
      if (res.run_id) {
        setSelectedRunId(res.run_id);
      }
      await loadAll(false);
    } catch (e: any) {
      alert(e.message || 'Could not enqueue QA run');
    } finally {
      setTriggering(false);
    }
  };

  const handleCancelRun = async (runId: string) => {
    try {
      await api.cancelQaRun(runId);
      await loadAll(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRetryRun = async (runId: string) => {
    try {
      const res = await api.retryQaRun(runId);
      if (res.run_id) {
        setSelectedRunId(res.run_id);
      }
      await loadAll(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemediationSubmit = async () => {
    if (!selectedFinding || !remediationRationale.trim()) return;
    try {
      const res = await api.submitRemediationDecision(selectedFinding.id, {
        action: remediationAction,
        actor: 'Principal QA Auditor',
        rationale: remediationRationale,
      });
      setRemediationStatusMsg(
        `Decision recorded: ${res.remediation_status}. ${res.note}`
      );
      setSelectedFinding({
        ...selectedFinding,
        remediation_status: res.remediation_status,
        reviewer_decision_notes: remediationRationale,
      });
      await loadAll(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleSchedule = async (sched: any) => {
    try {
      await api.updateQaSchedule({
        id: sched.id,
        enabled: sched.enabled !== 1,
        interval_seconds: sched.interval_seconds,
        suite_mode: sched.suite_mode,
      });
      await loadAll(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCompareRuns = async () => {
    if (!compareBaseId || !compareTargetId) return;
    try {
      const res = await api.compareQaRuns(compareBaseId, compareTargetId);
      setComparisonResult(res);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const downloadReport = (format: 'json' | 'csv' | 'markdown') => {
    const rid = selectedRunId || overview?.latest_run?.id || '';
    window.open(
      `/api/qa/reports/export?run_id=${encodeURIComponent(rid)}&format=${format}`,
      '_blank'
    );
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
        <span>Loading Autonomous QA & Empirical Audit Engine...</span>
      </div>
    );
  }

  const health = overview?.overall_health || 'NEVER_AUDITED';
  const counts = overview?.summary_counts || {};
  const sevCounts = overview?.open_findings_by_severity || {};
  const worker = overview?.worker_status || {};
  const modes: string[] = overview?.execution_modes || ['complete_system_audit'];

  return (
    <div className="space-y-6 pb-12" data-testid="qa-audit-dashboard">
      {/* SECTION A: EXECUTIVE OVERVIEW & BACKGROUND WORKER CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  health === 'CRITICAL_FAILURES'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                    : health === 'ISSUES_DETECTED'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                }`}
              >
                {health === 'HEALTHY' ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    Autonomous QA & Empirical Audit Status
                  </h2>
                  <span
                    data-testid="qa-overall-health-badge"
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      health === 'CRITICAL_FAILURES'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : health === 'ISSUES_DETECTED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {health}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Isolated QA Store: <code className="text-slate-300">data/qa_audit.db</code> • Ephemeral Test Sandbox: <code className="text-slate-300">data/qa_temp/</code> • Commit:{' '}
                  <code className="text-brand-300">
                    {overview?.latest_run?.commit_sha || 'N/A'}
                  </code>
                </p>
              </div>
            </div>

            {/* Export & Print Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadReport('json')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                title="Export JSON Evidence Bundle"
              >
                <Download className="w-3.5 h-3.5 text-brand-400" />
                JSON
              </button>
              <button
                onClick={() => downloadReport('csv')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                title="Export CSV Test Matrix"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                CSV
              </button>
              <button
                onClick={() => downloadReport('markdown')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                title="Export Markdown Audit Report"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Markdown
              </button>
              <button
                onClick={() => window.print()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                title="Print / Save PDF Audit Report"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                Print PDF
              </button>
            </div>
          </div>

          {/* KPI Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <div className="text-[10px] font-mono uppercase text-slate-400">Total Executed</div>
              <div className="text-xl font-bold text-white mt-1" data-testid="qa-total-tests">
                {counts.latest_total_tests ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Runs: {counts.total_runs ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
              <div className="text-[10px] font-mono uppercase text-emerald-400">Passed</div>
              <div className="text-xl font-bold text-emerald-300 mt-1" data-testid="qa-passed-tests">
                {counts.latest_passed ?? 0}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">
                Pass Rate: {counts.pass_rate_pct ?? 0}%
              </div>
            </div>
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
              <div className="text-[10px] font-mono uppercase text-rose-400">Failed (Defects)</div>
              <div className="text-xl font-bold text-rose-300 mt-1" data-testid="qa-failed-tests">
                {counts.latest_failed ?? 0}
              </div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">
                Confirmed by Oracle
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
              <div className="text-[10px] font-mono uppercase text-amber-400">Spec Gaps</div>
              <div className="text-xl font-bold text-amber-300 mt-1">
                {counts.latest_not_implemented ?? 0}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">
                Blocked: {counts.latest_blocked ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
              <div className="text-[10px] font-mono uppercase text-rose-300">Critical / High</div>
              <div className="text-xl font-bold text-rose-200 mt-1">
                {sevCounts.critical ?? 0} / {sevCounts.high ?? 0}
              </div>
              <div className="text-[10px] text-rose-300/80 mt-0.5">
                Immediate Attention
              </div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20">
              <div className="text-[10px] font-mono uppercase text-indigo-300">Med / Low</div>
              <div className="text-xl font-bold text-indigo-200 mt-1">
                {sevCounts.medium ?? 0} / {sevCounts.low ?? 0}
              </div>
              <div className="text-[10px] text-indigo-300/80 mt-0.5">
                Total Findings: {sevCounts.total ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION B: BACKGROUND TEST OPERATIONS */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-400" />
                Background QA Worker
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  worker.is_running
                    ? 'bg-brand-500/20 text-brand-300 animate-pulse border border-brand-500/40'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {worker.is_running ? 'RUNNING' : 'IDLE'} (Queue: {worker.queue_depth ?? 0})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Executes non-blocking isolated test suites and Python ML mathematical oracles in the background.
            </p>

            <div className="mt-3 space-y-2">
              <label className="block text-[11px] font-mono text-slate-400">
                Select Target Execution Suite Mode (19 Modes):
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Select Target Execution Suite Mode"
                  value={selectedSuiteMode}
                  onChange={(e) => setSelectedSuiteMode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {modes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleTriggerSuite(selectedSuiteMode)}
                  disabled={triggering}
                  data-testid="qa-run-selected-suite-btn"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run Suite
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => handleTriggerSuite('complete_system_audit')}
              disabled={triggering}
              data-testid="qa-trigger-full-audit-btn"
              className="flex-1 py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4" />
              Trigger Full System Audit
            </button>
            {worker.is_running && worker.active_run_id && (
              <button
                onClick={() => handleCancelRun(worker.active_run_id)}
                className="py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold"
              >
                Cancel
              </button>
            )}
            {selectedRunId && (
              <button
                onClick={() => handleRetryRun(selectedRunId)}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
                title="Retry Selected Run"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RUN HISTORY BAR & NAVIGATION TABS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('findings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'findings'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Empirical Findings & Remediation ({findings.length})
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'explorer'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Test Case Explorer ({testCases.length})
          </button>
          <button
            onClick={() => setActiveTab('coverage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'coverage'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            12-Module Coverage Matrix
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'schedules'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'compare'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Run Comparison
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Inspecting Run:</span>
          <select
            aria-label="Inspecting Run"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.status}] {r.suite_mode} — {r.passed_tests}/{r.total_tests} PASS ({r.duration_ms}ms) • {r.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION D: FINDINGS & ROOT CAUSE PANEL */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Filter Findings:</span>
              <select
                aria-label="Filter Findings by Severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <select
                aria-label="Filter Findings by Module"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="">All Modules (M01-M12)</option>
                {(overview?.module_coverage || []).map((m: any) => (
                  <option key={m.module_id} value={m.module_id}>
                    {m.module_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-semibold">{findings.length}</span> empirical findings. All proposed patches require explicit human approval.
            </div>
          </div>

          <div className="space-y-3">
            {findings.map((f) => {
              let patchObj: any = {};
              try {
                patchObj = JSON.parse(f.proposed_patch_json || '{}');
              } catch {
                patchObj = {};
              }
              return (
                <div
                  key={f.id}
                  data-testid={`qa-finding-card-${f.finding_code}`}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            f.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : f.severity === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : f.severity === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {f.classification}
                        </span>
                        <span className="text-xs font-mono text-brand-400 font-semibold">
                          {f.finding_code} ({f.test_id})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          • Module {f.module_id}: {f.affected_feature}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{f.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          f.remediation_status === 'APPROVED_FOR_MANUAL_PATCH'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : f.remediation_status === 'REJECTED'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {f.remediation_status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedFinding(f);
                          setRemediationRationale(f.reviewer_decision_notes || '');
                          setRemediationStatusMsg('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 text-brand-300 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Review & Approve Patch
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                      <div className="font-mono text-[10px] uppercase text-slate-400">
                        Root Cause Analysis (Confidence: {f.confidence_level})
                      </div>
                      <p className="text-slate-200 leading-relaxed">{f.root_cause_analysis}</p>
                      <div className="font-mono text-[10px] uppercase text-slate-400 pt-1">
                        Impact on Research & System Validity
                      </div>
                      <p className="text-slate-300 leading-relaxed">{f.impact}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                      <div className="font-mono text-[10px] uppercase text-emerald-400">
                        Expected Behavior
                      </div>
                      <p className="text-slate-300">{f.expected_behavior}</p>
                      <div className="font-mono text-[10px] uppercase text-rose-400 pt-1">
                        Actual Observed Evidence
                      </div>
                      <p className="text-slate-300 font-mono text-[11px] break-all">
                        {f.actual_behavior}
                      </p>
                      <div className="font-mono text-[10px] uppercase text-brand-400 pt-1">
                        Recommended Correction
                      </div>
                      <p className="text-slate-200">{f.recommended_correction}</p>
                    </div>
                  </div>

                  {patchObj.minimal_patch_diff && (
                    <details className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                      <summary className="cursor-pointer font-mono text-[11px] text-slate-300">
                        View Proposed Minimal Patch Diff & Rollback Plan (Impacted:{' '}
                        {(patchObj.impacted_files || []).join(', ')})
                      </summary>
                      <pre className="mt-2 p-2.5 rounded bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                        {patchObj.minimal_patch_diff}
                      </pre>
                      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-400">
                        <span>
                          <strong className="text-slate-200">Regression Risk:</strong>{' '}
                          {patchObj.regression_risk}
                        </span>
                        <span>
                          <strong className="text-slate-200">Rollback:</strong>{' '}
                          {patchObj.rollback_instructions}
                        </span>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION E: DETAILED TEST EXPLORER */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search test ID, title, source file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 w-64"
                />
              </div>
              <select
                aria-label="Filter Test Cases by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="">All Statuses</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="NOT_IMPLEMENTED">NOT_IMPLEMENTED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
              <select
                aria-label="Filter Test Cases by Module"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="">All Modules</option>
                {(overview?.module_coverage || []).map((m: any) => (
                  <option key={m.module_id} value={m.module_id}>
                    {m.module_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-400">
              Total Matching Assertions: <strong className="text-white">{testCases.length}</strong>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-3 px-4">Test ID</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Suite Mode</th>
                  <th className="py-3 px-4">Title & Empirical Observation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-brand-300 whitespace-nowrap">
                      {tc.test_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {tc.module_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {tc.suite_mode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{tc.title}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xl">
                        {tc.logs}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          tc.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : tc.status === 'FAIL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {tc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {tc.duration_ms} ms
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTestCase(tc)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-brand-400" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION C: 12-MODULE FEATURE COVERAGE MATRIX */}
      {activeTab === 'coverage' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                12-Module Verified Feature Inventory & Empirical Test Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Maps every documented platform capability against actual codebase implementation and executed oracle assertions.
              </p>
            </div>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4">Module ID</th>
                <th className="py-3 px-4">Documented Platform Module</th>
                <th className="py-3 px-4">Implementation Status</th>
                <th className="py-3 px-4">Automated Oracles</th>
                <th className="py-3 px-4">Passed</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Spec Gaps</th>
                <th className="py-3 px-4">Pass Rate</th>
                <th className="py-3 px-4">Audit Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {(overview?.module_coverage || []).map((m: any) => (
                <tr key={m.module_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-brand-300">
                    {m.module_id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{m.module_name}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                    {m.implemented_status}
                  </td>
                  <td className="py-3 px-4 font-mono text-white">
                    {m.automated_tests_count}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400">
                    {m.passed_count}
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-400">{m.failed_count}</td>
                  <td className="py-3 px-4 font-mono text-amber-400">
                    {m.not_implemented_count}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200">
                    {m.pass_rate_pct}%
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        m.status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : m.status === 'DEFECTS_FOUND'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULES PANEL */}
      {activeTab === 'schedules' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Autonomous Background Audit Schedules
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent schedules stored in <code className="text-slate-300">qa_schedules</code> and evaluated every 30s by the Tokio background scheduler.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{s.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-brand-300">
                      {s.schedule_type}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Suite: <span className="text-slate-200">{s.suite_mode}</span> • Cron:{' '}
                    <span className="text-slate-200">{s.cron_expression}</span> ({s.interval_seconds}s)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Next Run: {s.next_run_at || 'On Trigger'} • Last Commit:{' '}
                    {s.last_commit_sha || 'N/A'}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleSchedule(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    s.enabled === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {s.enabled === 1 ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION F: RUN COMPARISON PANEL */}
      {activeTab === 'compare' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Base Run:
              </label>
              <select
                aria-label="Base Run"
                value={compareBaseId}
                onChange={(e) => setCompareBaseId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} — {r.suite_mode} ({r.passed_tests}/{r.total_tests} PASS)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Target Run:
              </label>
              <select
                aria-label="Target Run"
                value={compareTargetId}
                onChange={(e) => setCompareTargetId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} — {r.suite_mode} ({r.passed_tests}/{r.total_tests} PASS)
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompareRuns}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Compare Runs
            </button>
          </div>

          {comparisonResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 font-mono uppercase text-[10px]">
                  Pass Rate & Duration Delta
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {comparisonResult.pass_rate_delta_pct >= 0 ? '+' : ''}
                  {comparisonResult.pass_rate_delta_pct}% Pass Rate
                </div>
                <div className="text-slate-400 mt-1">
                  Duration Delta: {comparisonResult.duration_delta_ms} ms
                </div>
              </div>
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <div className="text-emerald-400 font-mono uppercase text-[10px]">
                  Newly Passing Tests ({comparisonResult.newly_passing?.length || 0})
                </div>
                <div className="text-slate-200 font-mono mt-1">
                  {(comparisonResult.newly_passing || []).join(', ') || 'None'}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/30">
                <div className="text-rose-400 font-mono uppercase text-[10px]">
                  Persistent / New Failures (
                  {(comparisonResult.persistent_failures?.length || 0) +
                    (comparisonResult.newly_failing?.length || 0)}
                  )
                </div>
                <div className="text-slate-200 font-mono mt-1">
                  {[
                    ...(comparisonResult.newly_failing || []),
                    ...(comparisonResult.persistent_failures || []),
                  ].join(', ') || 'None'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TEST CASE EVIDENCE DRILL-DOWN */}
      {selectedTestCase && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-brand-400 font-bold">
                  {selectedTestCase.test_id} • {selectedTestCase.module_name}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedTestCase.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTestCase(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-400">
                  Executed Assertion & Source References
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-brand-300 mt-1">
                  {selectedTestCase.assertion_text}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Source: {selectedTestCase.source_refs} • Commit: {selectedTestCase.commit_sha}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase text-emerald-400">
                    Expected Oracle Output
                  </div>
                  <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto mt-1">
                    {selectedTestCase.expected_json}
                  </pre>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-amber-400">
                    Actual Observed Output
                  </div>
                  <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto mt-1">
                    {selectedTestCase.actual_json}
                  </pre>
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase text-slate-400">
                  Input Payload & Preconditions
                </div>
                <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto mt-1">
                  {selectedTestCase.input_json}
                </pre>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase text-slate-400">
                  Empirical Audit Log
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 mt-1">
                  {selectedTestCase.logs}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAFE REMEDIATION HUMAN APPROVAL WORKFLOW */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-brand-400 font-bold">
                  Controlled Remediation Governance • {selectedFinding.finding_code}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedFinding.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
              >
                CLOSE
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <strong>Non-Destructive Policy:</strong> In accordance with Section 16, AI never silently alters production model predictions, synthetic data behavior, risk thresholds, or audit records. Approving this remediation logs human authorization in <code className="text-amber-100">qa_remediation_logs</code>.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-mono text-[11px] text-slate-300 mb-1">
                  Governance Action:
                </label>
                <select
                  aria-label="Governance Action"
                  value={remediationAction}
                  onChange={(e) => setRemediationAction(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="APPROVE">APPROVE — Authorize Patch for Developer Application</option>
                  <option value="DEFER">DEFER — Acknowledge & Schedule for Future Release</option>
                  <option value="REJECT">REJECT — Keep Current Implementation</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-slate-300 mb-1">
                  Auditor Rationale / Verification Notes (Required):
                </label>
                <textarea
                  rows={3}
                  value={remediationRationale}
                  onChange={(e) => setRemediationRationale(e.target.value)}
                  placeholder="Document why this remediation patch is approved, deferred, or rejected..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              {remediationStatusMsg && (
                <div className="p-2.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs">
                  {remediationStatusMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handleRemediationSubmit}
                  disabled={!remediationRationale.trim()}
                  data-testid="qa-submit-remediation-btn"
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  Record Remediation Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
