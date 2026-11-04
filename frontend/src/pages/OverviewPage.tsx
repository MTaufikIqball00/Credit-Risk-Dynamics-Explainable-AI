import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  Users,
  CreditCard,
  Layers,
  AlertTriangle,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { NavItemKey } from '../components/Sidebar';

interface OverviewPageProps {
  onNavigate: (nav: NavItemKey) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getOverview();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const metrics = data?.metrics || {
    total_synthetic_customers: 0,
    total_transactions: 0,
    total_datasets: 0,
    total_assessments: 0,
    default_rate_pct: 0,
    active_monitoring_alerts: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-slate-900 border border-brand-500/20 rounded-xl p-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-mono mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
            Research-Grade Credit Risk Architecture
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            AI Dynamic Credit Risk Research & Monitoring Platform
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Academic prototype orchestrating Rust backend APIs, Python LightGBM/XGBoost modeling,
            HuggingFace NLP transaction categorization, SHAP explainable AI, and dynamic event-driven risk monitoring.
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => onNavigate('credit_assessment')}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              Run Risk Assessment <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('synthetic_lab')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
            >
              Synthetic Data Lab
            </button>
            <button
              onClick={loadOverview}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-xs border border-slate-700/50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Synthetic Customers</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {metrics.total_synthetic_customers.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Simulated profiles</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Transactions</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {metrics.total_transactions.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Bilingual time-series</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Research Datasets</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {metrics.total_datasets}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Deterministic seeds</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Assessments</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {metrics.total_assessments}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">PD evaluations</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Default Rate</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2 font-mono">
            {metrics.default_rate_pct}%
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Ground truth distress</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Dynamic Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2 font-mono">
            {metrics.active_monitoring_alerts}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">High severity triggers</p>
        </div>
      </div>

      {/* Model & Architecture Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
            Active Model Registry
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
              Operational
            </span>
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Champion: LightGBM-Research-v2.0</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ROC-AUC: 0.892 | PR-AUC: 0.841</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-brand-500/20 text-brand-300 font-mono font-bold">
                Active
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-300">Benchmark: XGBoost-Research-v1.8</p>
                <p className="text-[11px] text-slate-500 mt-0.5">ROC-AUC: 0.884 | Brier: 0.104</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono">
                Challenger
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-300">NLP: Indo-FinBERT + TF-IDF</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Macro F1: 0.939 | 11 Classes</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono">
                Hybrid
              </span>
            </div>
          </div>
        </div>

        {/* Recent Dynamic Monitoring Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Monitoring Stream
            </h3>
            <button
              onClick={() => onNavigate('dynamic_monitoring')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              View Monitoring Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {data?.recent_monitoring_events?.length > 0 ? (
              data.recent_monitoring_events.map((evt: any) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        evt.event_severity === 'CRITICAL'
                          ? 'bg-rose-500 animate-pulse'
                          : evt.event_severity === 'HIGH'
                          ? 'bg-amber-500'
                          : 'bg-brand-500'
                      }`}
                    ></span>
                    <div>
                      <span className="font-semibold text-slate-200">{evt.event_type}</span>
                      <span className="text-slate-500 text-[11px] ml-2 font-sans">{evt.description}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.triggered_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No recent temporal monitoring events recorded. Run dynamic event simulations in Monitoring Lab.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
