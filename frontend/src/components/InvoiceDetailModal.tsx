import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  FileCode, 
  Calendar, 
  Building, 
  Hash, 
  DollarSign, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from './StatusBadge';

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoiceId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'validation' | 'attempts' | 'preview'>('details');

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => apiClient.getInvoiceById(invoiceId!),
    enabled: Boolean(invoiceId),
  });

  if (!invoiceId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {data?.invoice?.invoice_number || 'Invoice Details'}
                </h3>
                {data?.invoice?.validation_status && (
                  <StatusBadge status={data.invoice.validation_status} type="validation" />
                )}
              </div>
              <p className="text-xs text-slate-500">
                {data?.invoice?.vendor_name || 'Loading details...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to={`/qa?invoiceId=${invoiceId}`}
              onClick={onClose}
              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition border border-sky-200"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
              Ask About Invoice
            </Link>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white space-x-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'details'
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Line Items & Summary
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`py-3 text-sm font-medium border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'validation'
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Financial Validation</span>
            {data?.invoice?.validation_errors?.length > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] bg-rose-100 text-rose-700 rounded-full font-bold">
                {data.invoice.validation_errors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'attempts'
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Extraction Audit ({data?.extraction_attempts?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'preview'
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Original File Preview
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading && (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-sm text-slate-500">Loading invoice breakdown...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
              Failed to load invoice details: {(error as any).message}
            </div>
          )}

          {data?.invoice && (
            <>
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Vendor</span>
                      <span className="text-sm font-semibold text-slate-800 flex items-center mt-0.5">
                        <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {data.invoice.vendor_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Invoice Date</span>
                      <span className="text-sm font-semibold text-slate-800 flex items-center mt-0.5">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {data.invoice.invoice_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Currency</span>
                      <span className="text-sm font-semibold text-slate-800 flex items-center mt-0.5">
                        <DollarSign className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {data.invoice.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Original Document</span>
                      <a
                        href={apiClient.getFileUrl(data.invoice.document_id?._id || data.invoice.document_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-sky-600 hover:text-sky-800 flex items-center mt-1 truncate"
                      >
                        <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate">{data.invoice.document_id?.original_filename || 'Download'}</span>
                      </a>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Extracted Line Items</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">#</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Description</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Qty</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Unit Price</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-sm">
                          {data.line_items?.map((item: any, idx: number) => (
                            <tr key={item._id || idx} className="hover:bg-slate-50/70">
                              <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-slate-800 font-medium">{item.description}</td>
                              <td className="px-4 py-2.5 text-right text-slate-600">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-right text-slate-600">
                                {data.invoice.currency} {Number(item.unit_price).toFixed(2)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                {data.invoice.currency} {Number(item.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Summary Breakdown */}
                  <div className="flex justify-end">
                    <div className="w-full md:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-medium">{data.invoice.currency} {Number(data.invoice.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Tax Amount:</span>
                        <span className="font-medium">{data.invoice.currency} {Number(data.invoice.tax).toFixed(2)}</span>
                      </div>
                      {data.invoice.cgst != null && data.invoice.sgst != null && (
                        <div className="text-xs text-slate-400 pl-3 border-l-2 border-slate-200 space-y-1">
                          <div className="flex justify-between">
                            <span>CGST:</span>
                            <span>{data.invoice.currency} {Number(data.invoice.cgst).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST:</span>
                            <span>{data.invoice.currency} {Number(data.invoice.sgst).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                        <span>Total:</span>
                        <span>{data.invoice.currency} {Number(data.invoice.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCIAL VALIDATION */}
              {activeTab === 'validation' && (
                <div className="space-y-6">
                  <div className={`p-4 rounded-xl border ${
                    data.invoice.validation_status === 'PASS'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center space-x-2 font-bold text-base">
                      {data.invoice.validation_status === 'PASS' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Financial Validation Passed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                          <span>Financial Validation Failed</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-slate-600">
                      Validated independently using BigNumber.js decimal-safe rules with a 0.05 monetary tolerance.
                    </p>
                  </div>

                  {/* Validation Errors List */}
                  {data.invoice.validation_errors?.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900">Validation Errors ({data.invoice.validation_errors.length})</h4>
                      {data.invoice.validation_errors.map((err: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-200 text-rose-900">
                              {err.code}
                            </span>
                            <span className="text-xs text-rose-700 font-medium">Field: {err.field}</span>
                          </div>
                          <p className="text-sm text-rose-900">{err.message}</p>
                          {err.expected !== undefined && (
                            <div className="text-xs text-rose-800 grid grid-cols-3 gap-2 pt-1 font-mono">
                              <div>Expected: <span className="font-bold">{err.expected}</span></div>
                              <div>Extracted: <span className="font-bold">{err.extracted}</span></div>
                              <div>Difference: <span className="font-bold">{err.diff}</span></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 flex items-center">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 mr-2" />
                      All financial rules (Line items sum vs Subtotal, Subtotal + Tax vs Total, Tax components) passed cleanly.
                    </div>
                  )}

                  {/* Suspicious Fields */}
                  {data.invoice.suspicious_fields?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                        Suspicious Fields Flagged ({data.invoice.suspicious_fields.length})
                      </h4>
                      {data.invoice.suspicious_fields.map((sus: any, idx: number) => (
                        <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                          <span className="font-semibold">{sus.field}:</span> {sus.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AUDIT ATTEMPTS */}
              {activeTab === 'attempts' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">LLM Extraction Attempts History</h4>
                  {data.extraction_attempts?.map((attempt: any) => (
                    <div key={attempt._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">Attempt #{attempt.attempt_number} ({attempt.provider})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          attempt.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {attempt.status}
                        </span>
                      </div>
                      {attempt.error_message && (
                        <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                          {attempt.error_message}
                        </div>
                      )}
                      {attempt.raw_response && (
                        <div>
                          <span className="text-[11px] text-slate-400 font-mono block mb-1">Raw Model Output:</span>
                          <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto max-h-48">
                            {attempt.raw_response}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: FILE PREVIEW */}
              {activeTab === 'preview' && (
                <div className="h-96 border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center">
                  <iframe
                    src={apiClient.getFileUrl(data.invoice.document_id?._id || data.invoice.document_id)}
                    className="w-full h-full"
                    title="Invoice Document Preview"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
