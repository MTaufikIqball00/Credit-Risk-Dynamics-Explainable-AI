import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CreditAssessment, SyntheticCustomer } from '../types';
import { ShieldAlert, Play, CheckCircle2, AlertTriangle, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';
import { Modal } from '../components/Modal';
import { NavItemKey } from '../components/Sidebar';

interface CreditAssessmentPageProps {
  initialCustomerId?: string;
  onNavigateToXai?: (assessmentId: string) => void;
}

export const CreditAssessmentPage: React.FC<CreditAssessmentPageProps> = ({
  initialCustomerId,
  onNavigateToXai,
}) => {
  const [customers, setCustomers] = useState<SyntheticCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [assessments, setAssessments] = useState<CreditAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activeAssessmentResult, setActiveAssessmentResult] = useState<any>(null);

  // Review modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState<string>('');
  const [reviewerRole, setReviewerRole] = useState('Senior Risk Underwriter');
  const [reviewAction, setReviewAction] = useState('OVERRIDE');
  const [overrideDecision, setOverrideDecision] = useState('CAUTION_FLAGGED');
  const [justification, setJustification] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, aRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getAssessments(),
      ]);
      setCustomers(cRes.customers || []);
      setAssessments(aRes.assessments || []);

      if (!selectedCustomerId && cRes.customers && cRes.customers.length > 0) {
        setSelectedCustomerId(cRes.customers[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  const handleRunAssessment = async () => {
    if (!selectedCustomerId) return;

    try {
      setEvaluating(true);
      const res = await api.evaluateCustomer(selectedCustomerId);
      setActiveAssessmentResult(res);
      loadData();
    } catch (e: any) {
      alert(`Assessment Error: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert('Mandatory justification note required for audit compliance.');
      return;
    }

    try {
      setSubmittingReview(true);
      await api.reviewAssessment(reviewTargetId, {
        reviewer_role: reviewerRole,
        action: reviewAction,
        override_decision: reviewAction === 'OVERRIDE' ? overrideDecision : undefined,
        justification: justification.trim(),
      });
      setReviewModalOpen(false);
      setJustification('');
      loadData();
    } catch (e: any) {
      alert(`Review Error: ${e.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const currentSelectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Credit Decision Support Assessment
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Simulates loan underwriting evaluation. Calculates calibrated Probability of Default (PD), risk categories,
            and model uncertainty, while preserving complete human reviewer override capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-slate-500">Evaluation Engine:</span>
          <span className="text-rose-300 font-semibold">LightGBM-Research-v2.0</span>
        </div>
      </div>

      {/* Assessment Evaluation Runner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
          Select Customer for Risk Assessment
        </h3>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} - {c.simulation_profile} (Rp {Math.round(c.monthly_income).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunAssessment}
            disabled={evaluating || !selectedCustomerId}
            className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition-all shrink-0"
          >
            {evaluating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {evaluating ? 'Evaluating Multi-Feature Model...' : 'Run Risk Assessment'}
          </button>
        </div>

        {currentSelectedCustomer && (
          <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <div>
              <span>Stated Expenses: </span>
              <strong className="text-white">
                Rp {Math.round(currentSelectedCustomer.stated_monthly_expenses).toLocaleString()}
              </strong>
            </div>
            <div>
              <span>Credit Obligations: </span>
              <strong className="text-amber-400">
                Rp {Math.round(currentSelectedCustomer.credit_obligation_amount).toLocaleString()}
              </strong>
            </div>
            <div>
              <span>Credit Lines: </span>
              <strong className="text-slate-200">{currentSelectedCustomer.existing_credit_lines} lines</strong>
            </div>
            <div>
              <span>Cohort: </span>
              <strong className="text-indigo-400">{currentSelectedCustomer.synthetic_cohort}</strong>
            </div>
          </div>
        )}

        {/* Active Assessment Result Banner */}
        {activeAssessmentResult && (
          <div className="mt-5 p-5 rounded-xl bg-slate-950 border border-brand-500/30 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-brand-300">
                Assessment Generated: {activeAssessmentResult.assessment_id}
              </span>
              {onNavigateToXai && (
                <button
                  onClick={() => onNavigateToXai(activeAssessmentResult.assessment_id)}
                  className="px-3 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-sans flex items-center gap-1.5"
                >
                  Inspect in XAI Workspace <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Probability of Default</span>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {(activeAssessmentResult.output.probability_of_default * 100).toFixed(1)}%
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Category</span>
                <p className="text-base font-bold mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      activeAssessmentResult.output.risk_category === 'LOW'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : activeAssessmentResult.output.risk_category === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {activeAssessmentResult.output.risk_category}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Recommendation</span>
                <p className="text-xs font-bold text-slate-200 mt-2">
                  {activeAssessmentResult.output.recommendation}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Data Completeness</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  {(activeAssessmentResult.output.data_completeness * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assessments History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Assessment History & Underwriter Reviews ({assessments.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Assessment ID</th>
                <th className="pb-3 font-semibold">Customer ID</th>
                <th className="pb-3 font-semibold text-right">PD Score</th>
                <th className="pb-3 font-semibold text-center">Risk Category</th>
                <th className="pb-3 font-semibold">Recommendation</th>
                <th className="pb-3 font-semibold text-center">Review Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30">
                  <td className="py-3 font-bold text-slate-200">
                    {a.id.substring(0, 8)}...
                  </td>
                  <td className="py-3 text-slate-400">{a.customer_id.substring(0, 8)}...</td>
                  <td className="py-3 text-right font-bold text-white">
                    {(a.probability_of_default * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.risk_category === 'LOW'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : a.risk_category === 'MODERATE'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {a.risk_category}
                    </span>
                  </td>
                  <td className="py-3 text-[11px] text-slate-300">{a.recommendation}</td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        a.review_status === 'OVERRIDDEN'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : a.review_status === 'REVIEWED_APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {a.review_status}
                    </span>
                  </td>
                  <td className="py-3 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setReviewTargetId(a.id);
                        setReviewModalOpen(true);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3 text-brand-400" />
                      Override / Review
                    </button>
                    {onNavigateToXai && (
                      <button
                        onClick={() => onNavigateToXai(a.id)}
                        className="px-2 py-1 rounded bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-[11px] font-sans"
                      >
                        XAI
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Review / Decision Override Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Simulate Underwriter Manual Review & Decision Override"
        subtitle="Simulate committee review or decision override with mandatory audit trail."
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-medium text-slate-400 mb-1">Reviewer Role</label>
            <select
              value={reviewerRole}
              onChange={(e) => setReviewerRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="Senior Risk Underwriter">Senior Risk Underwriter</option>
              <option value="Credit Risk Committee">Credit Risk Committee</option>
              <option value="Compliance & Model Auditor">Compliance & Model Auditor</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">Review Action</label>
            <select
              value={reviewAction}
              onChange={(e) => setReviewAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="OVERRIDE">DECISION OVERRIDE (Manual Committee Veto)</option>
              <option value="CONFIRM">CONFIRM MODEL RECOMMENDATION</option>
              <option value="REQUEST_DATA">REQUEST SECONDARY DATA / ESCALATE</option>
            </select>
          </div>

          {reviewAction === 'OVERRIDE' && (
            <div>
              <label className="block font-medium text-slate-400 mb-1">New Overridden Decision</label>
              <select
                value={overrideDecision}
                onChange={(e) => setOverrideDecision(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="APPROVE_SUPPORTED">APPROVE_SUPPORTED (Exception Granted)</option>
                <option value="CAUTION_FLAGGED">CAUTION_FLAGGED (Manual Rejection)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-400 mb-1">
              Audit Justification Notes (Mandatory)
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide documented policy rationale for audit trail..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono text-xs"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold"
            >
              {submittingReview ? 'Recording...' : 'Commit Review & Audit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
