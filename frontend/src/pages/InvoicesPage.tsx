import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  FileText 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

export const InvoicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [vendor, setVendor] = useState('');
  const [currency, setCurrency] = useState('');
  const [validationStatus, setValidationStatus] = useState<'' | 'PASS' | 'FAIL'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('invoice_date_parsed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Filter options from backend
  const { data: filtersData } = useQuery({
    queryKey: ['invoiceFilters'],
    queryFn: apiClient.getFilters,
  });

  // Query Invoices with real backend filters
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, vendor, currency, validationStatus, dateFrom, dateTo, sortBy, sortOrder, page }],
    queryFn: () => apiClient.getInvoices({
      search,
      vendor,
      currency,
      validationStatus: validationStatus || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setVendor('');
    setCurrency('');
    setValidationStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || vendor || currency || validationStatus || dateFrom || dateTo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Repository</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, inspect extracted line items, and audit financial validations.
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Backend Powered) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search vendor or invoice #..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Vendor Filter */}
          <div>
            <select
              value={vendor}
              onChange={e => { setVendor(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition text-slate-700"
            >
              <option value="">All Vendors</option>
              {filtersData?.vendors?.map((v: string) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Validation Status Filter */}
          <div>
            <select
              value={validationStatus}
              onChange={e => { setValidationStatus(e.target.value as any); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition text-slate-700"
            >
              <option value="">All Validation Statuses</option>
              <option value="PASS">Passed Validation Only</option>
              <option value="FAIL">Failed Validation Only</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div>
            <select
              value={currency}
              onChange={e => { setCurrency(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition text-slate-700"
            >
              <option value="">All Currencies</option>
              {filtersData?.currencies?.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range & Reset Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Invoice Date Range:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 transition"
            >
              <X className="w-3 h-3 mr-1" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th
                  onClick={() => handleSort('vendor_name')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Vendor</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('invoice_number')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Invoice #</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('invoice_date_parsed')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-6 py-3.5 text-left">Currency</th>
                <th className="px-6 py-3.5 text-right">Subtotal</th>
                <th className="px-6 py-3.5 text-right">Tax</th>
                <th
                  onClick={() => handleSort('total')}
                  className="px-6 py-3.5 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-6 py-3.5 text-center">Validation</th>
                <th className="px-6 py-3.5 text-center">Document</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-xs">Querying database...</p>
                  </td>
                </tr>
              ) : data?.invoices?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No invoices matching current filter criteria.
                  </td>
                </tr>
              ) : (
                data?.invoices?.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{inv.vendor_name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{inv.invoice_number}</td>
                    <td className="px-6 py-3.5 text-slate-600 text-xs">{inv.invoice_date}</td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-500">{inv.currency}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600 text-xs">
                      {Number(inv.subtotal).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-600 text-xs">
                      {Number(inv.tax).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                      {inv.currency} {Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <StatusBadge status={inv.validation_status} type="validation" />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <StatusBadge status={inv.document_id?.processing_status || 'EXTRACTED'} />
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedInvoiceId(inv._id)}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg border border-sky-100 transition"
                      >
                        Inspect
                      </button>
                      <a
                        href={apiClient.getFileUrl(inv.document_id?._id || inv.document_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition inline-flex items-center"
                        title="Download Original File"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-semibold text-slate-900">{data.pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-900">{data.pagination.totalPages}</span> ({data.pagination.total} total items)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.pagination.page <= 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 font-medium transition flex items-center"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={data.pagination.page >= data.pagination.totalPages}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 font-medium transition flex items-center"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
