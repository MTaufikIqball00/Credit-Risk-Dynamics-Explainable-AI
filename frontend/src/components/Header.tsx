import React from 'react';
import { ShieldCheck, Activity, Terminal, Radio } from 'lucide-react';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, pageSubtitle }) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-sm font-bold text-white tracking-tight">{pageTitle}</h2>
        <p className="text-[11px] text-slate-400">{pageSubtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Rust API :8240</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Python ML :8241</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
          <Radio className="w-3 h-3 text-brand-400" />
          <span>UI Port :3240</span>
        </div>

        <div className="px-2.5 py-1 rounded bg-brand-500/20 border border-brand-500/30 text-brand-300 text-[11px] font-mono font-medium">
          SYNTHETIC ONLY
        </div>
      </div>
    </header>
  );
};
