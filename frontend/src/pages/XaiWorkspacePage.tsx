import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CreditAssessment } from '../types';
import { Sparkles, HelpCircle, Layers, BarChart3, AlertCircle } from 'lucide-react';
import { ShapWaterfall } from '../components/ShapWaterfall';

interface XaiWorkspacePageProps {
  initialAssessmentId?: string;
}

export const XaiWorkspacePage: React.FC<XaiWorkspacePageProps> = ({
  initialAssessmentId,
}) => {
  const [assessments, setAssessments] = useState<CreditAssessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(initialAssessmentId || '');
  const [shapData, setShapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadList = async () => {
      try {
        const res = await api.getAssessments();
        const list = res.assessments || [];
        setAssessments(list);

        const target = initialAssessmentId || (list.length > 0 ? list[0].id : '');
        setSelectedAssessmentId(target);
      } catch (e) {
        console.error(e);
      }
    };
    loadList();
  }, [initialAssessmentId]);

  useEffect(() => {
    if (!selectedAssessmentId) return;

    const loadShap = async () => {
      try {
        setLoading(true);
        const data = await api.getShapWorkspace(selectedAssessmentId);
        setShapData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadShap();
  }, [selectedAssessmentId]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            Explainable AI (XAI) Research Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            SHAP (SHapley Additive exPlanations) attribution laboratory. Computes game-theoretic marginal contributions
            for tree ensembles (LightGBM / XGBoost) to unpack individual decision drivers without black-box opacity.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-slate-500">Methodology:</span>
          <span className="text-brand-300 font-semibold">TreeSHAP (Lundberg et al.)</span>
        </div>
      </div>

      {/* Assessment Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <label className="text-xs font-medium text-slate-300 shrink-0">
          Select Assessment to Explain:
        </label>
        <select
          value={selectedAssessmentId}
          onChange={(e) => setSelectedAssessmentId(e.target.value)}
          className="w-full md:w-auto flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
        >
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id.substring(0, 8)}... | PD: {(a.probability_of_default * 100).toFixed(1)}% | {a.risk_category} ({new Date(a.assessed_at).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* SHAP Waterfall and Insights */}
      {shapData && (
        <div className="space-y-6">
          <ShapWaterfall
            baseValue={shapData.base_value}
            finalPd={shapData.probability_of_default}
            contributions={shapData.waterfall_contributions || []}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Importance Rank */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Global Mean |SHAP| Importance
              </h3>

              <div className="space-y-3 font-mono text-xs">
                {shapData.global_importance_rank?.map((item: any, idx: number) => {
                  const featName = Array.isArray(item) ? item[0] : item.feature;
                  const score = Array.isArray(item) ? item[1] : item.importance;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-4 text-slate-500 text-[10px]">{idx + 1}.</span>
                      <span className="w-48 truncate text-slate-300">{featName}</span>
                      <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full"
                          style={{ width: `${Math.min(score * 250, 100)}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right text-brand-300 font-bold">{score}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scientific Explanation Policy */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  XAI Scientific Guidance & Non-Causality
                </h3>
                <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed font-sans">
                  <p>
                    <strong className="text-slate-200">1. Attribution != Causation:</strong> A high positive SHAP value
                    for <code className="text-brand-300 bg-slate-950 px-1 py-0.5 rounded">payment_burden_ratio</code> means
                    that within the model's learned tree split partitions, this customer's value pushed the score upward.
                    It does not prove that changing this single factor in isolation would guarantee non-default.
                  </p>
                  <p>
                    <strong className="text-slate-200">2. Adverse Action Notice Restriction:</strong> No denial letter
                    or adverse action justification should be mechanically synthesized from raw SHAP values without human underwriter concurrence.
                  </p>
                  <p>
                    <strong className="text-slate-200">3. True Feature Values:</strong> All values displayed above are
                    exact mathematical quantities extracted from the customer's historical 6-month transaction series.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-500 font-mono mt-4">
                Assessed Model: {shapData.model_version} | Base Value: {shapData.base_value}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
