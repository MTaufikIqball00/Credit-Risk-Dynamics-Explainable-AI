import React from 'react';
import {
  BarChart3,
  Database,
  Users,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Activity,
  Cpu,
  GitCompare,
  Scale,
  History,
  Settings,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export type NavItemKey =
  | 'overview'
  | 'synthetic_lab'
  | 'customer_explorer'
  | 'nlp_intelligence'
  | 'credit_assessment'
  | 'xai_workspace'
  | 'dynamic_monitoring'
  | 'model_lab'
  | 'model_comparison'
  | 'fairness_validation'
  | 'experiments'
  | 'qa_audit'
  | 'settings';

interface SidebarProps {
  currentNav: NavItemKey;
  onSelectNav: (key: NavItemKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentNav, onSelectNav }) => {
  const navItems = [
    { key: 'overview', label: 'Research Overview', icon: BarChart3, badge: 'Live' },
    { key: 'synthetic_lab', label: 'Synthetic Data Lab', icon: Database, badge: 'Deterministic' },
    { key: 'customer_explorer', label: 'Customer Explorer', icon: Users, badge: 'Profiles' },
    { key: 'nlp_intelligence', label: 'Transaction NLP', icon: MessageSquareText, badge: 'IndoFin' },
    { key: 'credit_assessment', label: 'Credit Risk Decision', icon: ShieldAlert, badge: 'PD Engine' },
    { key: 'xai_workspace', label: 'Explainable AI (XAI)', icon: Sparkles, badge: 'SHAP' },
    { key: 'dynamic_monitoring', label: 'Dynamic Monitoring', icon: Activity, badge: 'Drift & Events' },
    { key: 'model_lab', label: 'Model Research Lab', icon: Cpu, badge: 'GBDT' },
    { key: 'model_comparison', label: 'Model Comparison', icon: GitCompare, badge: 'Metrics' },
    { key: 'fairness_validation', label: 'Fairness & Bias Audit', icon: Scale, badge: '4/5ths Rule' },
    { key: 'experiments', label: 'Experiment History', icon: History },
    { key: 'qa_audit', label: 'QA & Audit Center', icon: CheckCircle2, badge: 'Autonomous' },
    { key: 'settings', label: 'System & Ports', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-white leading-tight">AI Credit Risk</h1>
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Research Platform</p>
        </div>
      </div>

      <div className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
        Platform Modules
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentNav === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectNav(item.key as NavItemKey)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
              <span className="truncate flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
          <p className="font-semibold flex items-center gap-1.5 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Academic Prototype
          </p>
          <p className="text-[10px] text-amber-400/80 mt-1">
            Synthetic datasets only. No binding real credit decisions.
          </p>
        </div>
      </div>
    </aside>
  );
};
