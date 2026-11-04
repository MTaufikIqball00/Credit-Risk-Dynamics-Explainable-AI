import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Activity, Play, TrendingUp, AlertTriangle, ShieldCheck, RefreshCw, BarChart2 } from 'lucide-react';
import { SyntheticCustomer } from '../types';

export const DynamicMonitoringPage: React.FC = () => {
  const [customers, setCustomers] = useState<SyntheticCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [eventType, setEventType] = useState('INCOME_DROP');
  const [magnitudePct, setMagnitudePct] = useState(35);
  const [simulating, setSimulating] = useState(false);
  const [lastReassessment, setLastReassessment] = useState<any>(null);

  const [timelineData, setTimelineData] = useState<any>(null);
  const [driftReport, setDriftReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, dRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getDriftReport(),
      ]);
      setCustomers(cRes.customers || []);
      setDriftReport(dRes);

      const firstId = cRes.customers && cRes.customers.length > 0 ? cRes.customers[0].id : '';
      if (!selectedCustomerId && firstId) {
        setSelectedCustomerId(firstId);
        loadTimeline(firstId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (custId: string) => {
    try {
      const t = await api.getMonitoringTimeline(custId);
      setTimelineData(t);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    try {
      setSimulating(true);
      const res = await api.simulateTemporalEvent({
        customer_id: selectedCustomerId,
        event_type: eventType,
        magnitude_pct: magnitudePct,
      });
      setLastReassessment(res);
      loadTimeline(selectedCustomerId);
    } catch (err: any) {
      alert(`Simulation Error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            Dynamic Risk Monitoring & Event Reassessment
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Temporal surveillance lab. Simulates life-event shocks (income cuts, expense surges, utility defaults),
            recalculates behavioral features, and triggers dynamic Bayesian risk score adjustments without artificial drifts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-slate-500">Event Principle:</span>
          <span className="text-amber-300 font-semibold">Score changes ONLY on new data</span>
        </div>
      </div>

      {/* Temporal Simulation Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-amber-400" />
          Inject Synthetic Temporal Event
        </h3>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                loadTimeline(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} - {c.simulation_profile}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="INCOME_DROP">INCOME_DROP (Payroll Reduction)</option>
              <option value="EXPENSE_SURGE">EXPENSE_SURGE (Living Cost Shock)</option>
              <option value="MISSED_UTILITY">MISSED_UTILITY (65 DPD Delinquency)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Magnitude (%)</label>
            <input
              type="number"
              min="5"
              max="90"
              value={magnitudePct}
              onChange={(e) => setMagnitudePct(parseInt(e.target.value) || 35)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={simulating || !selectedCustomerId}
              className="w-full px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition-all"
            >
              {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {simulating ? 'Reassessing Model...' : 'Simulate Shock & Reassess'}
            </button>
          </div>
        </form>

        {/* Dynamic Reassessment Result Card */}
        {lastReassessment && (
          <div className="mt-5 p-5 rounded-xl bg-slate-950 border border-amber-500/30 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-amber-300">
                Reassessment Triggered: {lastReassessment.reassessment.id}
              </span>
              <span className="text-[11px] text-slate-400">
                {lastReassessment.reassessment.trigger_reason}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Prior PD</span>
                <p className="text-lg font-bold text-slate-300 mt-1">
                  {(lastReassessment.reassessment.prior_pd * 100).toFixed(1)}%
                </p>
                <span className="text-[10px] text-slate-500">
                  {lastReassessment.reassessment.prior_risk_category}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">New Adjusted PD</span>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {(lastReassessment.reassessment.new_pd * 100).toFixed(1)}%
                </p>
                <span className="text-[10px] text-amber-400 font-bold">
                  {lastReassessment.reassessment.new_risk_category}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">PD Delta Shift</span>
                <p
                  className={`text-lg font-extrabold mt-1 ${
                    lastReassessment.reassessment.pd_delta > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {lastReassessment.reassessment.pd_delta > 0 ? '+' : ''}
                  {(lastReassessment.reassessment.pd_delta * 100).toFixed(1)}%
                </p>
                <span className="text-[10px] text-slate-500">Risk Delta</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Severity Status</span>
                <p className="text-xs mt-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    {lastReassessment.severity} ALERT
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historical PD Timeline & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            Customer Risk Score Timeline & Reassessments
          </h3>

          <div className="space-y-3 font-mono text-xs">
            {timelineData?.assessment_timeline?.length > 0 ? (
              timelineData.assessment_timeline.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[10px]">Step {idx + 1}</span>
                    <span className="font-bold text-white">PD: {(item.probability_of_default * 100).toFixed(1)}%</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.risk_category === 'LOW'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.risk_category === 'MODERATE'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {item.risk_category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.assessed_at).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No prior assessments found for this customer.
              </div>
            )}
          </div>
        </div>

        {/* Population Drift PSI Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Data Drift (PSI)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Population Stability Index tracking distribution shifts against research baseline.
          </p>

          <div className="space-y-3 font-mono text-xs">
            {driftReport?.feature_drift_metrics?.map((d: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{d.feature}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      d.status === 'STABLE'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    PSI: {d.psi}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">{d.interpretation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
