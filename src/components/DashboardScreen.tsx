import React from 'react';
import {
  BarChart3,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DashboardSummary } from '../types';
import { formatCurrency } from '../utils/format';

interface DashboardScreenProps {
  summary: DashboardSummary;
}

const ROOT_COLORS = ['#3b82f6', '#f97316', '#10b981', '#6366f1', '#06b6d4', '#ec4899', '#84cc16'];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ summary }) => {
  // Chart data for Root-wise pending
  const rootChartData = summary.rootPending.map((item, index) => ({
    name: item.root,
    pending: item.pendingAmount,
    total: item.totalAmount,
    paid: item.paidAmount,
    color: ROOT_COLORS[index % ROOT_COLORS.length],
  }));

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-700" />
          Analytics & Distribution Report
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Live financial summary and route balance analytics
        </p>
      </div>

      {/* Top High-level Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Bill Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Billed
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(summary.totalBillAmount)}
          </p>
          <p className="text-xs text-slate-400">Across {summary.totalBills} total invoices</p>
        </div>

        {/* Total Amount Paid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Collected
          </p>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalAmountPaid)}
          </p>
          <p className="text-xs text-emerald-600 font-medium">
            Collection Efficiency: {summary.collectionRate}%
          </p>
        </div>

        {/* Total Pending Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Outstanding
          </p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalPendingAmount)}
          </p>
          <p className="text-xs text-red-600 font-medium">
            {summary.pendingBillsCount + summary.partPaidBillsCount} bills with balance
          </p>
        </div>
      </div>

      {/* Bill Counts Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Bills</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary.totalBills}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-red-600 uppercase">Pending Bills</div>
          <div className="text-xl font-bold text-red-600 mt-1">{summary.pendingBillsCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-orange-500 uppercase">Part Paid Bills</div>
          <div className="text-xl font-bold text-orange-500 mt-1">{summary.partPaidBillsCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-emerald-600 uppercase">Paid Bills</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{summary.paidBillsCount}</div>
        </div>
      </div>

      {/* Root-Wise Pending Amount Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            Root-wise Outstanding Balance Chart
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Comparison of pending collections by distribution route</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rootChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value)), 'Pending Amount']}
                labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
              />
              <Bar dataKey="pending" name="Pending Amount" radius={[6, 6, 0, 0]}>
                {rootChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Root Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            Root Summary Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">Root</th>
                <th className="p-3.5 text-right">Bills</th>
                <th className="p-3.5 text-right">Total Billed</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5 text-right">Pending Amount</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.rootPending.map((item) => (
                <tr key={item.root} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{item.root}</td>
                  <td className="p-3.5 text-right text-slate-600">{item.billCount}</td>
                  <td className="p-3.5 text-right font-medium text-slate-800">
                    {formatCurrency(item.totalAmount)}
                  </td>
                  <td className="p-3.5 text-right font-medium text-emerald-600">
                    {formatCurrency(item.paidAmount)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-red-600">
                    {formatCurrency(item.pendingAmount)}
                  </td>
                  <td className="p-3.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.pendingAmount === 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {item.pendingAmount === 0 ? 'Settled' : `${item.pendingCount} Pending`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
