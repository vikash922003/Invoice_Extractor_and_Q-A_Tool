import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ExternalLink, 
  FileText, 
  Compass, 
  Building, 
  Calendar,
  Globe,
  FileCheck2,
  X,
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../api/client';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

const GLOBAL_SUGGESTIONS = [
  'What was cost of laptop and RAM specifications?',
  'What is our total expenditure in INR across all invoices?',
  'Which invoice failed financial validation and why?',
  'How much did we spend on Google LLC?',
  'Show highest-value invoice in the database',
  'Which invoices are missing a tax line?'
];

const INVOICE_SUGGESTIONS = [
  'List all line items with quantity, unit price, and amount',
  'What is the tax breakdown (CGST, SGST, Total Tax)?',
  'Did this invoice pass financial validation?',
  'What is the most expensive item on this invoice?',
  'Summarize this invoice for accounts payable'
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  queryType?: string;
  citations?: any[];
  scopedInvoiceId?: string;
  scopedInvoiceLabel?: string;
  timestamp: string;
}

export const QAPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlInvoiceId = searchParams.get('invoiceId') || '';

  const [scopeMode, setScopeMode] = useState<'global' | 'specific'>(urlInvoiceId ? 'specific' : 'global');
  const [selectedScopeInvoiceId, setSelectedScopeInvoiceId] = useState<string>(urlInvoiceId);
  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Load all invoices for selector
  const { data: invoicesData } = useQuery({
    queryKey: ['invoicesListForQA'],
    queryFn: () => apiClient.getInvoices({ limit: 100 }),
    staleTime: 30000
  });

  const allInvoices: any[] = invoicesData?.invoices || [];

  // Update selected scope if URL param changes
  useEffect(() => {
    if (urlInvoiceId) {
      setScopeMode('specific');
      setSelectedScopeInvoiceId(urlInvoiceId);
    }
  }, [urlInvoiceId]);

  const activeScopedInvoice = allInvoices.find(inv => inv._id === selectedScopeInvoiceId);

  // Load previous history on initial load
  useQuery({
    queryKey: ['qaHistory'],
    queryFn: async () => {
      const history = await apiClient.getQAHistory();
      if (history && history.length > 0 && messages.length === 0) {
        const loaded: ChatMessage[] = [];
        history.slice(0, 5).reverse().forEach((item: any) => {
          loaded.push({
            id: `${item._id}-q`,
            sender: 'user',
            text: item.question,
            scopedInvoiceId: item.target_invoice_id,
            timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          loaded.push({
            id: `${item._id}-a`,
            sender: 'assistant',
            text: item.answer,
            queryType: item.query_type,
            citations: item.citations,
            scopedInvoiceId: item.target_invoice_id,
            timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        });
        setMessages(loaded);
      }
      return history;
    },
    staleTime: 60000
  });

  const askMutation = useMutation({
    mutationFn: ({ q, targetId }: { q: string; targetId?: string }) => apiClient.askQuestion(q, targetId),
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: data.answer,
        queryType: data.query_type,
        citations: data.citations || [],
        scopedInvoiceId: data.target_invoice_id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    },
    onError: (err: any) => {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `Error processing question: ${err.response?.data?.message || err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputQuestion.trim();
    if (!q || askMutation.isPending) return;

    const isSpecific = scopeMode === 'specific' && Boolean(selectedScopeInvoiceId);
    const targetId = isSpecific ? selectedScopeInvoiceId : undefined;
    const label = isSpecific && activeScopedInvoice
      ? `#${activeScopedInvoice.invoice_number} (${activeScopedInvoice.vendor_name})`
      : undefined;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      scopedInvoiceId: targetId,
      scopedInvoiceLabel: label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    askMutation.mutate({ q, targetId });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputQuestion(suggestion);
  };

  const clearScope = () => {
    setScopeMode('global');
    setSelectedScopeInvoiceId('');
    setSearchParams({});
  };

  const activeSuggestions = scopeMode === 'specific' && selectedScopeInvoiceId
    ? INVOICE_SUGGESTIONS
    : GLOBAL_SUGGESTIONS;

  return (
    <div className="space-y-4 max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Header & Scope Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Ask Your Invoices</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Natural-language querying powered by Gemini. Ask across your entire invoice repository or target a specific invoice.
            </p>
          </div>

          {/* Scope Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setScopeMode('global');
                setSelectedScopeInvoiceId('');
                setSearchParams({});
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scopeMode === 'global'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Invoices (Global)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeMode('specific');
                if (!selectedScopeInvoiceId && allInvoices.length > 0) {
                  setSelectedScopeInvoiceId(allInvoices[0]._id);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scopeMode === 'specific'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Specific Invoice</span>
            </button>
          </div>
        </div>

        {/* Invoice Selector (Active when in 'specific' mode) */}
        {scopeMode === 'specific' && (
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 mt-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-xs font-bold text-sky-900 shrink-0">Target Invoice:</span>
              <div className="relative flex-1">
                <select
                  value={selectedScopeInvoiceId}
                  onChange={(e) => {
                    setSelectedScopeInvoiceId(e.target.value);
                    if (e.target.value) setSearchParams({ invoiceId: e.target.value });
                    else setSearchParams({});
                  }}
                  className="w-full text-xs font-medium bg-white border border-sky-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs truncate"
                >
                  <option value="">-- Select an invoice to query --</option>
                  {allInvoices.map((inv: any) => (
                    <option key={inv._id} value={inv._id}>
                      {inv.vendor_name} — #{inv.invoice_number} ({inv.currency} {inv.total}) [{inv.validation_status}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedScopeInvoiceId && (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceId(selectedScopeInvoiceId)}
                  className="text-xs text-sky-700 hover:text-sky-900 font-semibold underline flex items-center"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Details
                </button>
                <button
                  type="button"
                  onClick={clearScope}
                  className="text-xs text-slate-500 hover:text-slate-700 p-1 hover:bg-sky-100/50 rounded"
                  title="Switch back to global mode"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested Questions Pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suggested:</span>
        {activeSuggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSuggestionClick(s)}
            className="text-xs px-3 py-1 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 rounded-full transition shadow-2xs flex items-center"
          >
            <Compass className="w-3 h-3 mr-1.5 text-sky-500 shrink-0" />
            <span className="truncate max-w-[280px]">{s}</span>
          </button>
        ))}
      </div>

      {/* Chat Thread Container */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-y-auto space-y-6 shadow-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {scopeMode === 'specific' && activeScopedInvoice
                ? `Ask Anything About Invoice #${activeScopedInvoice.invoice_number}`
                : 'Ask Anything Across All Invoices'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {scopeMode === 'specific' && activeScopedInvoice
                ? `Query ${activeScopedInvoice.vendor_name}'s line items, taxes, quantities, or verify arithmetic consistency.`
                : 'Inquire about vendor spending, tax totals, monthly expenditure, or find invoices that failed validation.'}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-bl-none shadow-xs'
                }`}
              >
                {/* Assistant Query Type Header */}
                {msg.sender === 'assistant' && msg.queryType && (
                  <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-slate-200 text-[10px] text-slate-500 font-mono">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                      msg.queryType === 'INVOICE_SPECIFIC'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {msg.queryType === 'INVOICE_SPECIFIC' ? 'INVOICE-SPECIFIC AUDIT' : msg.queryType}
                    </span>
                    <span>Safe Parameterized Execution</span>
                  </div>
                )}

                {/* Scoped Badge for User Questions */}
                {msg.sender === 'user' && msg.scopedInvoiceLabel && (
                  <div className="text-[10px] text-sky-100 pb-1 mb-1 border-b border-sky-500 flex items-center space-x-1 font-mono">
                    <FileCheck2 className="w-3 h-3" />
                    <span>Scoped to {msg.scopedInvoiceLabel}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Structured Source Citations */}
                {msg.sender === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Cited Source Invoices ({msg.citations.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.citations.map((cite, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setSelectedInvoiceId(cite.invoice_id)}
                          className="text-left p-2.5 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 rounded-xl transition group shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 group-hover:text-sky-600">
                            <span className="truncate">{cite.vendor_name}</span>
                            <span className="font-mono text-[11px] text-slate-500">{cite.invoice_number}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span>{cite.invoice_date}</span>
                            <span className="font-bold text-slate-700">
                              {cite.currency} {cite.total != null ? Number(cite.total).toFixed(2) : ''}
                            </span>
                          </div>
                          {cite.evidence_snippet && (
                            <p className="text-[10px] text-slate-400 mt-1 truncate italic">
                              "{cite.evidence_snippet}"
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))
        )}

        {askMutation.isPending && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></div>
            <span>
              {scopeMode === 'specific' && activeScopedInvoice
                ? `Analyzing Invoice #${activeScopedInvoice.invoice_number} line items & validation rules...`
                : 'Generating query plan & analyzing invoice repository...'}
            </span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <input
          type="text"
          value={inputQuestion}
          onChange={e => setInputQuestion(e.target.value)}
          placeholder={
            scopeMode === 'specific' && activeScopedInvoice
              ? `Ask about #${activeScopedInvoice.invoice_number} (${activeScopedInvoice.vendor_name}, ${activeScopedInvoice.currency} ${activeScopedInvoice.total})...`
              : 'Ask a question about your invoices (e.g. Total spend with AWS in INR, laptop cost)...'
          }
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || askMutation.isPending}
          className="px-5 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-2xl shadow font-semibold flex items-center transition shrink-0"
        >
          <Send className="w-4 h-4 mr-1.5" />
          Ask
        </button>
      </form>

      {/* Invoice Detail Modal when Citation is clicked */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
