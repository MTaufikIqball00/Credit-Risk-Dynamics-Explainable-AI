import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { History, RefreshCw, FileText, Code2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export const ExperimentHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [lRes, eRes] = await Promise.all([
        api.getAuditLogs(100),
        api.getExperiments(),
      ]);
      setLogs(lRes.logs || []);
      setExperiments(eRes.experiments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            Experiment Reproducibility & Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Immutable log of all model training runs, hyperparameter commits, dynamic reassessments,
            and human committee decision overrides.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 shrink-0"
          title="Refresh Trail"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* System Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Regulatory & Underwriting Audit Events ({logs.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Action Type</th>
                <th className="pb-3 font-semibold">Entity</th>
                <th className="pb-3 font-semibold">Actor</th>
                <th className="pb-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 text-slate-500 text-[11px]">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.action_type === 'DECISION_OVERRIDDEN'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : l.action_type === 'MODEL_TRAINED'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : l.action_type === 'DATASET_GENERATED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-brand-500/20 text-brand-300'
                      }`}
                    >
                      {l.action_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400 font-sans text-xs">{l.entity_name}</td>
                  <td className="py-2.5 text-slate-300 font-sans text-xs">{l.actor}</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => {
                        try {
                          setSelectedLogDetails(JSON.parse(l.details));
                        } catch {
                          setSelectedLogDetails({ raw: l.details });
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans inline-flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-brand-400" />
                      Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Details */}
      <Modal
        isOpen={!!selectedLogDetails}
        onClose={() => setSelectedLogDetails(null)}
        title="Audit Event Payload"
        subtitle="Cryptographically reproducible parameter capture."
      >
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto text-xs font-mono text-cyan-400 max-h-96">
          <pre>{JSON.stringify(selectedLogDetails, null, 2)}</pre>
        </div>
      </Modal>
    </div>
  );
};
