import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MessageSquareText, Sparkles, Send, CheckCircle2, AlertTriangle, Layers, BarChart2 } from 'lucide-react';

export const NlpIntelligencePage: React.FC = () => {
  const [inputText, setInputText] = useState('GAJI BULANAN PT MANDIRI SEJAHTERA');
  const [singleResult, setSingleResult] = useState<any>(null);
  const [loadingSingle, setLoadingSingle] = useState(false);

  const [models, setModels] = useState<any[]>([]);
  const [evalData, setEvalData] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const loadNlpMeta = async () => {
      try {
        setLoadingMeta(true);
        const [mRes, eRes] = await Promise.all([
          api.getNlpModels(),
          api.getNlpEvaluation(),
        ]);
        setModels(mRes.models || []);
        setEvalData(eRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMeta(false);
      }
    };
    loadNlpMeta();
  }, []);

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setLoadingSingle(true);
      const res = await api.classifyNlp([inputText.trim()]);
      if (res.predictions && res.predictions.length > 0) {
        setSingleResult(res.predictions[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSingle(false);
    }
  };

  const sampleQueries = [
    "GAJI BULANAN MANDIRI",
    "TAGIHAN LISTRIK PLN BULANAN",
    "TRSF QRIS PENJUALAN TOKO SETTLEMENT",
    "ANGSURAN KPR BANK BTN CICILAN",
    "BELANJA SUPERINDO HYPERMART",
    "NETFLIX DIGITAL SUBSCRIPTION",
    "TARIK TUNAI ATM BERSAMA",
    "UNKNOWN TRANSFER CODE 99120"
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-indigo-400" />
            Transaction NLP Intelligence Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Bilingual Indonesian & English natural language understanding for unstructured transaction narratives.
            Classifies raw text into 11 verified accounting categories with calibrated confidence and low-confidence flags.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-slate-500">Language Scope:</span>
          <span className="text-indigo-300 font-semibold">ID / EN Banking Tokens</span>
        </div>
      </div>

      {/* Interactive Testing Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Interactive Description Classification
        </h3>

        <form onSubmit={handleClassify} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter transaction narrative (e.g. ANGSURAN KPR BANK BTN)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
              disabled={loadingSingle}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {loadingSingle ? 'Inferring...' : 'Classify'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span>Try sample tokens:</span>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(q);
                  api.classifyNlp([q]).then((res) => {
                    if (res.predictions && res.predictions.length > 0) {
                      setSingleResult(res.predictions[0]);
                    }
                  });
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-mono text-[10px]"
              >
                {q}
              </button>
            ))}
          </div>
        </form>

        {/* Inference Result Card */}
        {singleResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Input Narrative</span>
              <p className="text-sm font-bold text-white mt-0.5">"{singleResult.text}"</p>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Predicted Category</span>
                <p className="text-sm font-bold text-indigo-400 mt-0.5">{singleResult.category}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</span>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">
                  {(singleResult.confidence * 100).toFixed(1)}%
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reliability Flag</span>
                <p className="text-xs mt-1">
                  {singleResult.is_low_confidence ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      LOW CONFIDENCE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      HIGH CONFIDENCE
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model Architectures Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((m) => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                {m.name}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
                {m.status}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">{m.architecture}</p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px]">Macro F1</span>
                <p className="font-bold text-emerald-400 mt-0.5">{(m.f1_macro * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Accuracy</span>
                <p className="font-bold text-white mt-0.5">{(m.accuracy * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Latency</span>
                <p className="font-bold text-brand-300 mt-0.5">{m.latency_ms} ms</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-Class Performance Table */}
      {evalData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                11-Class Evaluation Matrix
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{evalData.evaluation_dataset}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">
                Overall Accuracy: <strong className="text-white font-bold">{(evalData.metrics.overall_accuracy * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-slate-400">
                Unclassified Rate: <strong className="text-amber-400 font-bold">{(evalData.metrics.unclassified_rate * 100).toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Precision</th>
                  <th className="pb-3 font-semibold text-right">Recall</th>
                  <th className="pb-3 font-semibold text-right">F1-Score</th>
                  <th className="pb-3 font-semibold text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {evalData.per_class_performance?.map((cls: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-bold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      {cls.category}
                    </td>
                    <td className="py-2.5 text-right text-emerald-400">{(cls.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-cyan-400">{(cls.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-brand-300 font-bold">{(cls.f1 * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-slate-400">{cls.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
