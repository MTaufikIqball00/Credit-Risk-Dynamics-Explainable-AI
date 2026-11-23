import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FEATURE_CATALOG_DEFINITIONS } from '../api/mockData';
import { FeatureSnapshot, SyntheticCustomer } from '../types';
import {
  Sliders,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Database,
  Play,
  BarChart3,
} from 'lucide-react';

export const FeatureEngineeringPage: React.FC = () => {
  const [customers, setCustomers] = useState<SyntheticCustomer[]>([]);
  const [snapshots, setSnapshots] = useState<FeatureSnapshot[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [computing, setComputing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [computeMsg, setComputeMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, fRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getFeatures(),
      ]);
      const custs = cRes.customers || [];
      setCustomers(custs);
      setSnapshots(fRes.feature_snapshots || []);
      if (!selectedCustomerId && custs.length > 0) {
        setSelectedCustomerId(custs[0].id);
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

  const handleRecompute = async () => {
    if (!selectedCustomerId) return;
    try {
      setComputing(true);
      setComputeMsg(null);
      const res = await api.computeFeatures(selectedCustomerId);
      setComputeMsg(
        `Computed feature snapshot ${res.feature_snapshot?.id?.slice(0, 8) || 'new'} (version: ${
          res.feature_snapshot?.feature_version || 'v2.1.0-clean'
        }).`
      );
      await loadData();
    } catch (e: any) {
      setComputeMsg(`Error computing features: ${e.message}`);
    } finally {
      setComputing(false);
    }
  };

  const catalogEntries = Object.entries(FEATURE_CATALOG_DEFINITIONS);

  // Aggregate key behavioral indicators across the 8 official profiles
  const profileMap = new Map<
    string,
    { count: number; avgIncome: number; avgExpRatio: number; avgPbr: number; defaultRate: number }
  >();
  for (const c of customers) {
    const cur = profileMap.get(c.simulation_profile) || {
      count: 0,
      avgIncome: 0,
      avgExpRatio: 0,
      avgPbr: 0,
      defaultRate: 0,
    };
    cur.count += 1;
    cur.avgIncome += c.monthly_income;
    cur.avgExpRatio += c.stated_monthly_expenses / Math.max(c.monthly_income, 1);
    cur.avgPbr += c.credit_obligation_amount / Math.max(c.monthly_income, 1);
    cur.defaultRate += c.is_defaulted;
    profileMap.set(c.simulation_profile, cur);
  }
  const profileStats = Array.from(profileMap.entries()).map(([profile, agg]) => ({
    profile,
    count: agg.count,
    avgIncome: agg.avgIncome / agg.count,
    avgExpRatio: agg.avgExpRatio / agg.count,
    avgPbr: agg.avgPbr / agg.count,
    defaultRate: agg.defaultRate / agg.count,
  }));

  return (
    <div className="space-y-6" data-testid="feature-engineering-page">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Behavioral Feature Engineering & Leakage Audit Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Formal registry of all 12 mathematical risk signals computed over 6-month synthetic transaction and utility
            windows. Strictly enforces zero target leakage, zero sensitive proxy attributes, and documented missing-value policies.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Schema:</span>
          <span className="text-cyan-300 font-semibold">v2.1.0-clean (12 Signals)</span>
        </div>
      </div>

      {/* On-Demand Feature Pipeline Runner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              On-Demand Feature Snapshot Recomputation
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} — {c.simulation_profile} ({c.synthetic_cohort})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pt-4 md:pt-5 shrink-0">
            <button
              onClick={handleRecompute}
              disabled={computing || !selectedCustomerId}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all"
            >
              {computing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {computing ? 'Computing Vector...' : 'Compute Feature Snapshot'}
            </button>
          </div>
        </div>
        {computeMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{computeMsg}</span>
          </div>
        )}
      </div>

      {/* 12-Feature Mathematical Specification Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            12-Feature Mathematical Dictionary & Missing-Value Policies
          </h3>
          <span className="text-[11px] font-mono text-emerald-400">
            utility_regularity_score empty fallback = neutral_0.5
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Feature Name</th>
                <th className="pb-3 font-semibold">Domain</th>
                <th className="pb-3 font-semibold">Formula</th>
                <th className="pb-3 font-semibold">Window / Unit</th>
                <th className="pb-3 font-semibold">Missing Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {catalogEntries.map(([name, meta]) => (
                <tr key={name} className="hover:bg-slate-800/30">
                  <td className="py-2.5 font-bold text-cyan-300">{name}</td>
                  <td className="py-2.5 font-sans text-slate-400">{meta.category}</td>
                  <td className="py-2.5 text-slate-200">{meta.formula}</td>
                  <td className="py-2.5 text-slate-400">
                    {meta.window} • {meta.unit}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px]">
                      {meta.missing_policy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Distribution Breakdown Across 8 Official Profiles */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          Behavioral Signal Distribution Across Simulation Profiles ({profileStats.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileStats.map((ps) => (
            <div
              key={ps.profile}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-sans">{ps.profile}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  N={ps.count}
                </span>
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Expense-to-Income Ratio</span>
                    <span className="text-cyan-300">{(ps.avgExpRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, ps.avgExpRatio * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Payment Burden Ratio (DTI)</span>
                    <span className="text-amber-300">{(ps.avgPbr * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min(100, ps.avgPbr * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-1 border-t border-slate-800/70 text-[11px] text-slate-400">
                <span>Avg Income: Rp {Math.round(ps.avgIncome).toLocaleString()}</span>
                <span className={ps.defaultRate > 0.25 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  Distress: {(ps.defaultRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Snapshots Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Latest Computed Feature Snapshots ({snapshots.length})
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading snapshots...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Avg Income</th>
                  <th className="pb-2 text-right">Net Cash Flow</th>
                  <th className="pb-2 text-right">Exp/Inc</th>
                  <th className="pb-2 text-right">DTI</th>
                  <th className="pb-2 text-right">Utility Reg.</th>
                  <th className="pb-2 text-right">Completeness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {snapshots.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2 text-slate-200">{s.customer_id.slice(0, 10)}</td>
                    <td className="py-2 text-right text-emerald-400">
                      Rp {Math.round(s.avg_monthly_income).toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-white">
                      Rp {Math.round(s.net_cash_flow).toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-cyan-300">
                      {(s.expense_to_income_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right text-amber-300">
                      {(s.payment_burden_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right text-brand-300">
                      {(s.utility_regularity_score * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 text-right text-slate-400">
                      {(s.data_completeness_score * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
