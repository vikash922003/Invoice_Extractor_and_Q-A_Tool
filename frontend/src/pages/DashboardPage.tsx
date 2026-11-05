import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  UploadCloud, 
  MessageSquare, 
  ArrowRight, 
  DollarSign, 
  TrendingUp, 
  Clock 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

export const DashboardPage: React.FC = () => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: apiClient.getStats,
    refetchInterval: 5000,
  });

  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: () => apiClient.getInvoices({ limit: 5, sortBy: 'created_at', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Ingestion Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-document extraction, decimal-safe financial validation, and cross-invoice Q&A.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/upload"
            className="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload Invoices
          </Link>
          <Link
            to="/qa"
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <MessageSquare className="w-4 h-4 mr-2 text-sky-600" />
            Ask Invoices
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Documents</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-slate-900">
              {statsLoading ? '...' : stats?.total_documents ?? 0}
            </span>
            <p className="text-xs text-slate-400 mt-1">PDFs & image receipts</p>
          </div>
        </div>

        {/* Card 2: Extracted */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Extracted</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-slate-900">
              {statsLoading ? '...' : stats?.total_invoices ?? 0}
            </span>
            <p className="text-xs text-sky-600 font-medium mt-1">Structured & stored</p>
          </div>
        </div>

        {/* Card 3: Validation Passed */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between bg-emerald-50/20">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Validation Passed</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-emerald-700">
              {statsLoading ? '...' : stats?.validation_passed ?? 0}
            </span>
            <p className="text-xs text-emerald-600 font-medium mt-1">100% financial consistency</p>
          </div>
        </div>

        {/* Card 4: Validation Failed */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between bg-amber-50/20">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Validation Failed</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-amber-700">
              {statsLoading ? '...' : stats?.validation_failed ?? 0}
            </span>
            <p className="text-xs text-amber-600 font-medium mt-1">Subtotal / tax mismatch</p>
          </div>
        </div>

        {/* Card 5: Processing Failures */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between bg-rose-50/20">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Failures</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-extrabold text-rose-700">
              {statsLoading ? '...' : stats?.failed_documents ?? 0}
            </span>
            <p className="text-xs text-rose-600 font-medium mt-1">Malformed / parse error</p>
          </div>
        </div>
      </div>

      {/* Spend by Currency Breakdown */}
      {stats?.spend_by_currency?.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center">
            <DollarSign className="w-4 h-4 mr-1 text-slate-500" />
            Expenditure Summary by Currency
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.spend_by_currency.map((c: any) => (
              <div key={c._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">{c._id} Total Spend</span>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {c._id} {Number(c.totalSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span>Invoices: {c.count}</span>
                  <span>Tax: {c._id} {Number(c.totalTax).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Extracted Invoices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Recently processed documents and validation statuses</p>
          </div>
          <Link
            to="/invoices"
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center"
          >
            View all invoices
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600">Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Validation</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {invoicesLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : recentInvoices?.invoices?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No invoices extracted yet. Upload your first batch of invoices!
                  </td>
                </tr>
              ) : (
                recentInvoices?.invoices?.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{inv.vendor_name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{inv.invoice_number}</td>
                    <td className="px-6 py-3.5 text-slate-600 text-xs">{inv.invoice_date}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                      {inv.currency} {Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <StatusBadge status={inv.validation_status} type="validation" />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedInvoiceId(inv._id)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 hover:bg-sky-100 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
