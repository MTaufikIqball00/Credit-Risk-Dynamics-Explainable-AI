import React from 'react';
import { ShapContribution } from '../types';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface ShapWaterfallProps {
  baseValue: number;
  finalPd: number;
  contributions: ShapContribution[];
}

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({
  baseValue,
  finalPd,
  contributions,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            SHAP Waterfall Local Attribution Plot
            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
              TreeExplainer
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Breakdown of feature contributions shifting the baseline expectation to the final estimated PD.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/80"></span>
            <span className="text-rose-400">+ Elevates PD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/80"></span>
            <span className="text-emerald-400">- Reduces PD</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Baseline Output Bar */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <span className="w-48 truncate font-medium text-slate-400">Baseline Expectation E[f(x)]</span>
          <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-slate-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(baseValue * 100, 100)}%` }}
            ></div>
          </div>
          <span className="w-20 text-right font-bold text-slate-200">{(baseValue * 100).toFixed(1)}%</span>
        </div>

        {/* Feature Contribution Bars */}
        {contributions.map((c, idx) => {
          const isRiskUp = c.direction === 'INCREASES_RISK';
          const absContr = Math.abs(c.contribution);
          const barWidth = Math.min(absContr * 180, 100);

          return (
            <div
              key={idx}
              className="flex items-center gap-3 text-xs font-mono p-2 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              <div className="w-48 truncate flex items-center gap-1.5">
                {isRiskUp ? (
                  <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="text-slate-300 truncate" title={c.feature}>
                  {c.feature}
                </span>
              </div>

              <div className="w-24 text-[11px] text-slate-500 text-right truncate">
                val: {typeof c.value === 'number' ? c.value.toLocaleString() : c.value}
              </div>

              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                  {isRiskUp ? (
                    <div
                      className="bg-rose-500/80 h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  ) : (
                    <div
                      className="bg-emerald-500/80 h-full rounded-full transition-all ml-auto"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  )}
                </div>
              </div>

              <span
                className={`w-20 text-right font-bold ${
                  isRiskUp ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {c.contribution > 0 ? `+${(c.contribution * 100).toFixed(1)}%` : `${(c.contribution * 100).toFixed(1)}%`}
              </span>
            </div>
          );
        })}

        {/* Final Model Output */}
        <div className="flex items-center gap-3 text-xs font-mono text-white bg-brand-950/40 p-3 rounded-lg border border-brand-500/30 mt-4">
          <span className="w-48 font-bold text-brand-300">Final Predicted PD f(x)</span>
          <div className="flex-1 bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                finalPd > 0.35 ? 'bg-rose-500' : finalPd > 0.15 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(finalPd * 100, 100)}%` }}
            ></div>
          </div>
          <span className="w-20 text-right text-sm font-extrabold text-brand-200">
            {(finalPd * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
        <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-slate-300">Methodological Note:</span> SHAP values depict mathematical game-theoretic attribution to the tree output score. They represent association within the synthetic dataset, not physical causal mechanisms.
        </p>
      </div>
    </div>
  );
};
