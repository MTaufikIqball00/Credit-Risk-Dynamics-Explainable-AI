import React, { useState } from 'react';
import { api } from '../api/client';
import { Cpu, Play, CheckCircle2, BarChart3, Sliders, RefreshCw } from 'lucide-react';

export const ModelLabPage: React.FC = () => {
  const [algorithm, setAlgorithm] = useState<'LightGBM' | 'XGBoost'>('LightGBM');
  const [learningRate, setLearningRate] = useState(0.05);
  const [nEstimators, setNEstimators] = useState(100);
  const [maxDepth, setMaxDepth] = useState(4);
  const [randomSeed, setRandomSeed] = useState(42);

  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTraining(true);
      const res = await api.trainModel({
        algorithm,
        random_seed: randomSeed,
        hyperparameters: {
          learning_rate: learningRate,
          n_estimators: nEstimators,
          max_depth: maxDepth,
        },
      });
      setResult(res);
    } catch (err: any) {
      alert(`Training Error: ${err.message}`);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-400" />
            Credit Risk Model Research Laboratory
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Train, tune, and calibrate tree-based gradient boosted models (LightGBM & XGBoost) on synthetic behavioral datasets.
            Evaluates comprehensive probabilistic performance beyond mere accuracy.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-slate-500">Evaluation Strategy:</span>
          <span className="text-brand-300 font-semibold">Temporal Out-of-Time CV</span>
        </div>
      </div>

      {/* Training Configuration Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-400" />
          Model Training Configuration
        </h3>

        <form onSubmit={handleTrain} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            >
              <option value="LightGBM">LightGBM (Gradient Boosting)</option>
              <option value="XGBoost">XGBoost (Extreme Boosting)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Learning Rate</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value) || 0.05)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">N Estimators</label>
            <input
              type="number"
              min="20"
              max="500"
              value={nEstimators}
              onChange={(e) => setNEstimators(parseInt(e.target.value) || 100)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Max Depth</label>
            <input
              type="number"
              min="2"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value) || 4)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Random Seed</label>
            <input
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(parseInt(e.target.value) || 42)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div className="md:col-span-5 flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              * Splits training features out-of-time with no data leakage. Computes ROC-AUC, PR-AUC, and Brier calibration score.
            </span>
            <button
              type="submit"
              disabled={training}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow transition-all"
            >
              {training ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {training ? 'Training Model & Computing SHAP...' : 'Start Training Run'}
            </button>
          </div>
        </form>
      </div>

      {/* Training Results Presentation */}
      {result && (
        <div className="bg-slate-900 border border-brand-500/30 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-brand-300">
                Trained: {result.version_tag} ({result.algorithm})
              </span>
              <p className="text-[11px] text-slate-400">Model Version ID: {result.model_version_id}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              TRAINED & SERIALIZED
            </span>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">ROC-AUC</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{result.evaluation.roc_auc}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">PR-AUC</span>
              <p className="text-lg font-bold text-cyan-400 mt-0.5">{result.evaluation.pr_auc}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">F1-Score</span>
              <p className="text-lg font-bold text-brand-300 mt-0.5">{result.evaluation.f1_score}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">Precision</span>
              <p className="text-lg font-bold text-white mt-0.5">{result.evaluation.precision}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">Recall</span>
              <p className="text-lg font-bold text-white mt-0.5">{result.evaluation.recall}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">Brier Score</span>
              <p className="text-lg font-bold text-purple-400 mt-0.5">{result.evaluation.brier_score}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">Log Loss</span>
              <p className="text-lg font-bold text-slate-300 mt-0.5">{result.evaluation.log_loss}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
