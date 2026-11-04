import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Settings, ShieldCheck, Terminal, Server, RefreshCw, CheckCircle, Database, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const res = await api.getHealth();
      setHealth(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            System Health, Ports & Governance Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live diagnostic inspector for distributed microservice ports, database schema integrity,
            runtime dependencies, and research governance constraints.
          </p>
        </div>

        <button
          onClick={loadHealth}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 shrink-0"
          title="Refresh Health"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Port Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Frontend UI</span>
            <span className="w-2 h-2 rounded-full bg-brand-400"></span>
          </div>
          <div className="text-xl font-bold font-mono text-white">Port 3240</div>
          <p className="text-[11px] text-slate-500 mt-1">Vite + React + Tailwind</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Rust Backend</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">Port 8240</div>
          <p className="text-[11px] text-slate-500 mt-1">Axum + Tokio + SQLx</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Python ML Service</span>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400">Port 8241</div>
          <p className="text-[11px] text-slate-500 mt-1">FastAPI + LightGBM + SHAP</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Database Storage</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">SQLite (WAL)</div>
          <p className="text-[11px] text-slate-500 mt-1">18 Relational Schemas Active</p>
        </div>
      </div>

      {/* Live Health Status Card */}
      {health && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <span className="font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Live Health Verification Response
            </span>
            <span className="text-[10px] text-slate-500">{health.timestamp}</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Service Status:</span>
              <strong className="text-emerald-400">{health.status}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Backend Core Engine:</span>
              <span className="text-slate-200">{health.engine}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-500">Database Driver:</span>
              <span className="text-cyan-300">{health.database}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Research Policy:</span>
              <span className="text-amber-400 text-right">{health.disclaimer}</span>
            </div>
          </div>
        </div>
      )}

      {/* Governance & Disclaimers */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          Academic Prototype Governance Framework
        </h3>

        <div className="space-y-3 text-xs text-slate-400 leading-relaxed font-sans">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs mb-1">1. Synthetic Isolation Policy</h4>
            <p className="text-[11px]">
              No real consumer or customer financial records are ever ingested into this platform. All accounts, transactions,
              running balances, utility records, and loan obligations are mathematically generated via deterministic PRNG algorithms.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs mb-1">2. Non-Binding Lending Decisions</h4>
            <p className="text-[11px]">
              Probability of Default (PD) outputs and recommendations are experimental simulations designed for econometric research,
              model comparison, and explainable AI transparency testing. They cannot be used as legally binding credit underwriting decisions.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs mb-1">3. Zero Bureau Connection</h4>
            <p className="text-[11px]">
              This software maintains no connections to banking switches, credit bureaus (SLIK/OJK/Pefindo), or production payment gateways.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
