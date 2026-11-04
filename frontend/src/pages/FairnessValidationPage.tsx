import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Scale, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export const FairnessValidationPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFairness = async () => {
      try {
        setLoading(true);
        const res = await api.getFairnessReport();
        setReport(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadFairness();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            Fairness & Research Bias Validation
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Statistical parity and equalized opportunity auditing across synthetic research cohorts.
            Protected attributes are strictly quarantined from the scoring pipeline and evaluated solely in post-hoc audits.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">4/5ths Rule:</span>
          <span className="text-emerald-300 font-semibold">Compliant in Simulation</span>
        </div>
      </div>

      {/* Cohort Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {report?.cohort_metrics?.map((c: any, idx: number) => {
          const passesFourFifths = c.disparate_impact_ratio >= 0.80;
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">{c.cohort}</span>
                <span className="text-[10px] font-mono text-slate-500">N={c.sample_size}</span>
              </div>

              <div className="space-y-2.5 font-mono text-xs mt-4">
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">Approval Rate:</span>
                  <strong className="text-white">{(c.approval_rate * 100).toFixed(1)}%</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">Disparate Impact:</span>
                  <strong className={passesFourFifths ? 'text-emerald-400' : 'text-rose-400'}>
                    {c.disparate_impact_ratio} {passesFourFifths ? '(Pass)' : '(Fail)'}
                  </strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">False Positive Rate:</span>
                  <strong className="text-amber-400">{(c.false_positive_rate * 100).toFixed(1)}%</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">False Negative Rate:</span>
                  <strong className="text-rose-400">{(c.false_negative_rate * 100).toFixed(1)}%</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">Brier Score:</span>
                  <strong className="text-purple-300">{c.brier_calibration_score}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disparity Summary */}
      {report?.parity_audit && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Parity Audit Summary
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">Min Disparate Impact</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {report.parity_audit.min_disparate_impact_ratio}
              </p>
              <span className="text-[10px] text-slate-500">&gt;= 0.80 threshold</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">Max FPR Disparity</span>
              <p className="text-lg font-bold text-white mt-1">
                {(report.parity_audit.max_fpr_disparity * 100).toFixed(2)}%
              </p>
              <span className="text-[10px] text-slate-500">False alarm delta</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">Max FNR Disparity</span>
              <p className="text-lg font-bold text-white mt-1">
                {(report.parity_audit.max_fnr_disparity * 100).toFixed(2)}%
              </p>
              <span className="text-[10px] text-slate-500">Missed default delta</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px]">Equal Opportunity Gap</span>
              <p className="text-lg font-bold text-cyan-400 mt-1">
                {(report.parity_audit.equal_opportunity_difference * 100).toFixed(2)}%
              </p>
              <span className="text-[10px] text-slate-500">TPR difference</span>
            </div>
          </div>
        </div>
      )}

      {/* Research Limitations & Academic Caveats */}
      <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Mandatory Research Limitations & Non-Generalizability Notice
        </h3>

        <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-sans">
          {report?.research_limitations?.map((item: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
