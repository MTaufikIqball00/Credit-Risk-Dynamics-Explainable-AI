import React, { useEffect, useState } from 'react';
import { scoreFeaturesLocally } from '../api/client';
import { Sliders, RotateCcw, Sparkles, ArrowRight } from 'lucide-react';

interface WhatIfSimulatorProps {
  initialFeatures?: {
    payment_burden_ratio?: number;
    expense_to_income_ratio?: number;
    utility_regularity_score?: number;
    net_cash_flow?: number;
    income_variability?: number;
    data_completeness_score?: number;
  };
  baselinePd?: number;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  initialFeatures,
  baselinePd,
}) => {
  const defaultDti = initialFeatures?.payment_burden_ratio ?? 0.2;
  const defaultExp = initialFeatures?.expense_to_income_ratio ?? 0.5;
  const defaultUtil = initialFeatures?.utility_regularity_score ?? 0.9;
  const defaultCf = initialFeatures?.net_cash_flow ?? 6000000;
  const defaultVar = initialFeatures?.income_variability ?? 0.15;

  const [dti, setDti] = useState<number>(defaultDti);
  const [expRatio, setExpRatio] = useState<number>(defaultExp);
  const [utilReg, setUtilReg] = useState<number>(defaultUtil);
  const [netCashFlow, setNetCashFlow] = useState<number>(defaultCf);
  const [incVar, setIncVar] = useState<number>(defaultVar);

  useEffect(() => {
    setDti(defaultDti);
    setExpRatio(defaultExp);
    setUtilReg(defaultUtil);
    setNetCashFlow(defaultCf);
    setIncVar(defaultVar);
  }, [defaultDti, defaultExp, defaultUtil, defaultCf, defaultVar]);

  const baseScored = scoreFeaturesLocally({
    payment_burden_ratio: defaultDti,
    expense_to_income_ratio: defaultExp,
    utility_regularity_score: defaultUtil,
    net_cash_flow: defaultCf,
    income_variability: defaultVar,
    data_completeness_score: initialFeatures?.data_completeness_score ?? 1.0,
  });

  const simScored = scoreFeaturesLocally({
    payment_burden_ratio: dti,
    expense_to_income_ratio: expRatio,
    utility_regularity_score: utilReg,
    net_cash_flow: netCashFlow,
    income_variability: incVar,
    data_completeness_score: initialFeatures?.data_completeness_score ?? 1.0,
  });

  const refBasePd = typeof baselinePd === 'number' && Number.isFinite(baselinePd) ? baselinePd : baseScored.probability_of_default;
  // Preserve calibrated baseline anchor while showing exact counterfactual sensitivity delta
  const sensitivityDelta = simScored.probability_of_default - baseScored.probability_of_default;
  const counterfactualPd = Math.max(0.01, Math.min(0.98, refBasePd + sensitivityDelta));
  const pdDelta = counterfactualPd - refBasePd;

  const cfCat =
    counterfactualPd < 0.12
      ? 'LOW'
      : counterfactualPd < 0.35
      ? 'MODERATE'
      : counterfactualPd < 0.65
      ? 'HIGH'
      : 'VERY_HIGH';
  const cfRec =
    counterfactualPd < 0.12
      ? 'APPROVE_SUPPORTED'
      : counterfactualPd < 0.35
      ? 'REVIEW_RECOMMENDED'
      : 'CAUTION_FLAGGED';

  const handleReset = () => {
    setDti(defaultDti);
    setExpRatio(defaultExp);
    setUtilReg(defaultUtil);
    setNetCashFlow(defaultCf);
    setIncVar(defaultVar);
  };

  return (
    <div
      className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-4"
      data-testid="what-if-simulator"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Counterfactual "What-If" Credit Risk Simulator
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Perturb key behavioral signals to inspect local PD sensitivity and decision boundary crossings (Model sensitivity only — non-causal).
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Baseline
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Sliders */}
        <div className="lg:col-span-7 space-y-3.5 text-xs font-mono">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-amber-400" /> Payment Burden Ratio (DTI)
              </span>
              <span className="font-bold text-amber-300">{(dti * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              aria-label="Payment Burden Ratio"
              min={0}
              max={0.85}
              step={0.01}
              value={dti}
              onChange={(e) => setDti(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Expense-to-Income Ratio</span>
              <span className="font-bold text-cyan-300">{(expRatio * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              aria-label="Expense to Income Ratio"
              min={0.2}
              max={1.15}
              step={0.01}
              value={expRatio}
              onChange={(e) => setExpRatio(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Utility Regularity Score</span>
              <span className="font-bold text-emerald-300">{(utilReg * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              aria-label="Utility Regularity Score"
              min={0.1}
              max={1.0}
              step={0.02}
              value={utilReg}
              onChange={(e) => setUtilReg(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Monthly Net Cash Flow</span>
              <span className="font-bold text-brand-300">
                Rp {Math.round(netCashFlow).toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              aria-label="Monthly Net Cash Flow"
              min={-5000000}
              max={25000000}
              step={250000}
              value={netCashFlow}
              onChange={(e) => setNetCashFlow(parseFloat(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Income Variability (CV)</span>
              <span className="font-bold text-indigo-300">{(incVar * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              aria-label="Income Variability"
              min={0.02}
              max={0.65}
              step={0.01}
              value={incVar}
              onChange={(e) => setIncVar(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        {/* Counterfactual Outcome Summary */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Baseline PD</div>
              <div className="text-lg font-bold text-slate-300">
                {(refBasePd * 100).toFixed(1)}%
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase">Counterfactual PD</div>
              <div className="text-2xl font-extrabold text-white" data-testid="what-if-pd-output">
                {(counterfactualPd * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">PD Shift</div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  pdDelta > 0.001
                    ? 'text-rose-400'
                    : pdDelta < -0.001
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {pdDelta >= 0 ? '+' : ''}
                {(pdDelta * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">Risk Tier</div>
              <div className="mt-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    cfCat === 'LOW'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : cfCat === 'MODERATE'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {cfCat}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-500">Simulated Recommendation</div>
            <div className="text-xs font-bold text-indigo-300 mt-0.5">{cfRec}</div>
          </div>

          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
            Simulated counterfactual demonstrates score responsiveness under synthetic feature perturbations. Not an automated underwriting commitment.
          </p>
        </div>
      </div>
    </div>
  );
};
