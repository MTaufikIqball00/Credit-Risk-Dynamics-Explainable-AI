import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ResearchDataset } from '../types';
import { Database, Play, CheckCircle, RefreshCw, FileText, Code2, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

export const SyntheticLabPage: React.FC = () => {
  const [datasets, setDatasets] = useState<ResearchDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDict, setSelectedDict] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [profileType, setProfileType] = useState('small');
  const [customerCount, setCustomerCount] = useState(50);
  const [randomSeed, setRandomSeed] = useState(42);
  const [message, setMessage] = useState<string | null>(null);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.getDatasets();
      setDatasets(res.datasets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleProfileChange = (p: string) => {
    setProfileType(p);
    if (p === 'small') setCustomerCount(50);
    else if (p === 'medium') setCustomerCount(150);
    else if (p === 'large') setCustomerCount(500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setMessage(null);
      const res = await api.generateDataset({
        name: name.trim() || undefined,
        profile_type: profileType,
        customer_count: customerCount,
        random_seed: randomSeed,
      });
      setMessage(`Successfully generated synthetic dataset with ${res.summary.customers_generated} customers!`);
      setName('');
      loadDatasets();
    } catch (err: any) {
      setMessage(`Generation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-400" />
            Synthetic Data Laboratory
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Controlled environment for generating deterministic, reproducible research datasets.
            Equipped with 8 experimental simulation profiles, bilingual transaction histories, and zero target leakage.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-slate-500">PRNG Engine:</span>
          <span className="text-brand-300 font-semibold">ChaCha8 (Deterministic)</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          message.includes('error') ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
        }`}>
          {message.includes('error') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      {/* Generator Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
          Generate New Research Dataset
        </h3>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Dataset Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Experiment-Run-Alpha"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Profile Size</label>
            <select
              value={profileType}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            >
              <option value="small">Small Dataset (N=50)</option>
              <option value="medium">Medium Dataset (N=150)</option>
              <option value="large">Large Dataset (N=500)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Customer Count</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={customerCount}
              onChange={(e) => setCustomerCount(parseInt(e.target.value) || 50)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Deterministic Seed</label>
            <input
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(parseInt(e.target.value) || 42)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              * Automatically simulates 6 months of bank transactions, utility bills, running balances, and feature snapshots.
            </span>

            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {generating ? 'Simulating Transactions...' : 'Generate Dataset'}
            </button>
          </div>
        </form>
      </div>

      {/* Dataset History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available Research Datasets ({datasets.length})
          </h3>
          <button
            onClick={loadDatasets}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            title="Reload Datasets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Dataset Name</th>
                <th className="pb-3 font-semibold">Profile</th>
                <th className="pb-3 font-semibold">Customers</th>
                <th className="pb-3 font-semibold">Seed</th>
                <th className="pb-3 font-semibold">Version</th>
                <th className="pb-3 font-semibold">Created At</th>
                <th className="pb-3 font-semibold text-right">Data Dictionary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {datasets.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/30">
                  <td className="py-3 font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {d.name}
                  </td>
                  <td className="py-3 uppercase text-[11px] text-slate-400">{d.profile_type}</td>
                  <td className="py-3 text-brand-300 font-bold">{d.customer_count}</td>
                  <td className="py-3 text-slate-400">{d.random_seed}</td>
                  <td className="py-3 text-slate-400">{d.generator_version}</td>
                  <td className="py-3 text-[11px] text-slate-500">
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        try {
                          setSelectedDict(JSON.parse(d.data_dictionary));
                        } catch {
                          setSelectedDict({ raw: d.data_dictionary });
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3 text-brand-400" />
                      View Schema
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Dictionary Modal */}
      <Modal
        isOpen={!!selectedDict}
        onClose={() => setSelectedDict(null)}
        title="Dataset Schema & Data Dictionary"
        subtitle="Rigorous definition of target variables, leakage safeguards, and features."
      >
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-400 max-h-96">
          <pre>{JSON.stringify(selectedDict, null, 2)}</pre>
        </div>
      </Modal>
    </div>
  );
};
