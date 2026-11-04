import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { GitCompare, Award, CheckCircle2, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';

export const ModelComparisonPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComparison = async () => {
      try {
        setLoading(true);
        const res = await api.compareModels();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadComparison();
  }, []);

  const models = data?.comparison || [];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            Credit Risk Model Comparison Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Side-by-side multi-metric benchmark. Evaluates tree-based ensembles against linear baselines
            across discrimination (ROC/PR AUC), probabilistic calibration (Brier Score), inference latency, and SHAP suitability.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Champion:</span>
          <span className="text-brand-300 font-semibold">LightGBM-v2.0</span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {models.map((m: any, idx: number) => {
          const isChampion = m.status === 'CHAMPION';
          return (
            <div
              key={idx}
              className={`bg-slate-900 rounded-xl p-5 border transition-all ${
                isChampion ? 'border-brand-500/40 shadow-lg shadow-brand-500/5' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    isChampion
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {m.status}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{m.algorithm}</span>
              </div>

              <h3 className="text-sm font-bold text-white tracking-tight">{m.model_name}</h3>

              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">ROC-AUC:</span>
                  <strong className="text-emerald-400">{m.roc_auc}</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">PR-AUC:</span>
                  <strong className="text-cyan-400">{m.pr_auc}</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">F1-Score:</span>
                  <strong className="text-brand-300">{m.f1_score}</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">Brier Score:</span>
                  <strong className="text-purple-400">{m.brier_score}</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">Log Loss:</span>
                  <strong className="text-slate-300">{m.log_loss}</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">Latency:</span>
                  <strong className="text-slate-400">{m.inference_latency_ms} ms</strong>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500">SHAP Engine:</span>
                  <strong className="text-indigo-300 text-[10px]">{m.shap_compatibility}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scientific Comparison Guidance */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Evaluation Principles & Anti-Overfitting Safeguards
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed font-sans">
          <div className="space-y-2">
            <p>
              <strong className="text-slate-200">Beyond Simple Accuracy:</strong> In credit default prediction with class imbalance (~15-25% default rate), pure accuracy is misleading. Models are audited on PR-AUC (Area under Precision-Recall Curve) to evaluate tail-risk capture.
            </p>
            <p>
              <strong className="text-slate-200">Probabilistic Calibration:</strong> A model predicting a 30% PD must see approximately 30 defaults out of 100 similarly scored borrowers. The Brier score penalizes uncalibrated overconfidence.
            </p>
          </div>

          <div className="space-y-2">
            <p>
              <strong className="text-slate-200">Explainability Parity:</strong> While deep neural nets achieve similar discrimination, tree models natively support exact polynomial-time TreeSHAP calculations, eliminating approximation uncertainty.
            </p>
            <p>
              <strong className="text-slate-200">Out-of-Time Temporal Split:</strong> Splits enforce that validation sets occur strictly in forward time slices relative to training sets, preventing lookahead bias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
