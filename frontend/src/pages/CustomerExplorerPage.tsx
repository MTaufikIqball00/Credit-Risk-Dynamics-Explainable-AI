import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SyntheticCustomer } from '../types';
import { Users, Search, ArrowRight, ShieldAlert, CheckCircle, Clock, Zap } from 'lucide-react';
import { Modal } from '../components/Modal';

interface CustomerExplorerPageProps {
  onSelectCustomerForAssessment?: (customerId: string) => void;
}

export const CustomerExplorerPage: React.FC<CustomerExplorerPageProps> = ({
  onSelectCustomerForAssessment,
}) => {
  const [customers, setCustomers] = useState<SyntheticCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState('ALL');
  const [cohortFilter, setCohortFilter] = useState('ALL');
  const [selectedCustDetail, setSelectedCustDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        search: search.trim() || undefined,
        profile: profileFilter !== 'ALL' ? profileFilter : undefined,
        cohort: cohortFilter !== 'ALL' ? cohortFilter : undefined,
        limit: 50,
      });
      setCustomers(res.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [profileFilter, cohortFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers();
  };

  const openCustomerDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const detail = await api.getCustomerDetail(id);
      setSelectedCustDetail(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer code (e.g. CUST-00001)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value="ALL">All Profiles (8)</option>
            <option value="Stable Income">Stable Income</option>
            <option value="Variable Income">Variable Income</option>
            <option value="Irregular Income">Irregular Income</option>
            <option value="High Expense Burden">High Expense Burden</option>
            <option value="Consistent Payment">Consistent Payment</option>
            <option value="Irregular Payment">Irregular Payment</option>
            <option value="Thin-file Customer">Thin-file Customer</option>
            <option value="No Credit History">No Credit History</option>
          </select>

          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value="ALL">All Cohorts</option>
            <option value="Group_A">Group_A (Audit 1)</option>
            <option value="Group_B">Group_B (Audit 2)</option>
            <option value="Group_C">Group_C (Audit 3)</option>
          </select>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Code</th>
                <th className="pb-3 font-semibold">Simulation Profile</th>
                <th className="pb-3 font-semibold">Employment</th>
                <th className="pb-3 font-semibold text-right">Income</th>
                <th className="pb-3 font-semibold text-right">Expenses</th>
                <th className="pb-3 font-semibold text-right">Obligations</th>
                <th className="pb-3 font-semibold text-center">Cohort</th>
                <th className="pb-3 font-semibold text-center">Ground Truth</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30">
                  <td className="py-3 font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                    {c.customer_code}
                  </td>
                  <td className="py-3 font-sans font-medium text-slate-200">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] border border-slate-700">
                      {c.simulation_profile}
                    </span>
                  </td>
                  <td className="py-3 font-sans text-slate-400 text-[11px]">{c.employment_type}</td>
                  <td className="py-3 text-right text-emerald-400 font-bold">
                    Rp {Math.round(c.monthly_income).toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    Rp {Math.round(c.stated_monthly_expenses).toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-amber-400">
                    Rp {Math.round(c.credit_obligation_amount).toLocaleString()}
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px]">
                      {c.synthetic_cohort}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    {c.is_defaulted === 1 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                        DEFAULTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        NON-DEFAULT
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => openCustomerDetail(c.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-brand-600 hover:text-white text-slate-300 text-[11px] font-sans inline-flex items-center gap-1 transition-all"
                    >
                      360 Profile <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Detail Modal */}
      <Modal
        isOpen={!!selectedCustDetail}
        onClose={() => setSelectedCustDetail(null)}
        title={selectedCustDetail?.customer?.customer_code || 'Customer Profile'}
        subtitle={`Synthetic Profile: ${selectedCustDetail?.customer?.simulation_profile} | Cohort: ${selectedCustDetail?.customer?.synthetic_cohort}`}
      >
        {selectedCustDetail && (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-950/40 border border-brand-500/30">
              <div>
                <p className="text-xs font-bold text-white">Credit Decision Support Ready</p>
                <p className="text-[11px] text-slate-400">Run model inference and SHAP local waterfall</p>
              </div>
              <button
                onClick={() => {
                  if (onSelectCustomerForAssessment) {
                    onSelectCustomerForAssessment(selectedCustDetail.customer.id);
                  }
                  setSelectedCustDetail(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Assess Risk Now
              </button>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px]">Monthly Income</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  Rp {Math.round(selectedCustDetail.customer.monthly_income).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px]">Monthly Expenses</span>
                <p className="text-sm font-bold text-slate-200 mt-1">
                  Rp {Math.round(selectedCustDetail.customer.stated_monthly_expenses).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px]">Credit Obligations</span>
                <p className="text-sm font-bold text-amber-400 mt-1">
                  Rp {Math.round(selectedCustDetail.customer.credit_obligation_amount).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Utility Payments */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Utility Payment History ({selectedCustDetail.utility_payments?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedCustDetail.utility_payments?.map((u: any) => (
                  <div
                    key={u.id}
                    className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-white">{u.utility_type}</span>
                      <span className="text-slate-500 ml-2">Period: {u.billing_period}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300">Rp {Math.round(u.bill_amount).toLocaleString()}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          u.payment_status === 'ON_TIME'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : u.payment_status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {u.payment_status} ({u.days_past_due} DPD)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bank Transactions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recent Bank Transactions (Sampled)
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedCustDetail.transactions?.slice(0, 15).map((t: any) => (
                  <div
                    key={t.id}
                    className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between"
                  >
                    <div className="truncate max-w-[240px]">
                      <span
                        className={`font-bold mr-2 ${
                          t.direction === 'CREDIT' ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {t.direction === 'CREDIT' ? '+' : '-'}
                      </span>
                      <span className="text-slate-200">{t.raw_description}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-white">Rp {Math.round(t.amount).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(t.transaction_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
