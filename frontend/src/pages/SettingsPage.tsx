import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Key, 
  Server, 
  Database, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';
import { apiClient } from '../api/client';

export const SettingsPage: React.FC = () => {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: apiClient.getHealth,
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & API Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review integration boundaries, environment configuration, and service connectivity.
        </p>
      </div>

      {/* Integration Boundary / API Key Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Gemini LLM Integration</h3>
              <p className="text-xs text-slate-500">Multimodal document understanding & safe query planning</p>
            </div>
          </div>

          <div>
            {isLoading ? (
              <span className="text-xs text-slate-400">Checking...</span>
            ) : health?.gemini_configured ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Active & Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Key Pending in .env
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <p>
            The backend reads <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">GEMINI_API_KEY</code> from backend environment variables.
            Free tier API keys can be generated from Google AI Studio.
          </p>
          <div className="flex items-center space-x-2 pt-1 font-mono text-[11px] text-slate-500">
            <span>Configured Model:</span>
            <span className="font-bold text-slate-800">{health?.gemini_model || 'gemini-1.5-flash'}</span>
          </div>
          <div className="pt-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-800"
            >
              Get a free Google Gemini API Key
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>

      {/* Backend & Database Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">MERN Stack Architecture</h3>
            <p className="text-xs text-slate-500">MongoDB database, Express backend, React frontend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block font-semibold">Backend Engine</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">Express + TypeScript</span>
            <span className="text-[10px] text-emerald-600 font-medium">Node.js v20+</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block font-semibold">Database</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">MongoDB v8.0</span>
            <span className="text-[10px] text-emerald-600 font-medium">Mongoose ODM</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block font-semibold">Storage Location</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">backend/uploads/</span>
            <span className="text-[10px] text-slate-500">SHA-256 Deduplicated</span>
          </div>
        </div>
      </div>

      {/* Financial Validation Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Financial Validation Engine Rules</h3>
            <p className="text-xs text-slate-500">Deterministic decimal-safe arithmetic via BigNumber.js</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block">Rule A: Line Items Subtotal Mismatch</span>
            <span>Verifies |sum(line_items.amount) - subtotal| &le; 0.05</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block">Rule B: Total Financial Mismatch</span>
            <span>Verifies |(subtotal + tax) - total| &le; 0.05</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block">Rule C: Split Tax Verification</span>
            <span>Verifies |(CGST + SGST) - tax| &le; 0.05 when components are present</span>
          </div>
        </div>
      </div>
    </div>
  );
};
