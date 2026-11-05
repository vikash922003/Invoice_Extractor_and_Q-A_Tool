import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'processing' | 'validation';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'processing' }) => {
  const s = (status || '').toUpperCase();

  if (type === 'validation' || s === 'PASS' || s === 'FAIL') {
    if (s === 'PASS') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
          PASS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500"></span>
        FAIL
      </span>
    );
  }

  // Processing status
  switch (s) {
    case 'QUEUED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <svg className="w-2.5 h-2.5 mr-1 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          QUEUED
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <svg className="w-2.5 h-2.5 mr-1 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          PROCESSING
        </span>
      );
    case 'EXTRACTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
          EXTRACTED
        </span>
      );
    case 'VALIDATION_FAILED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
          VALIDATION FAILED
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500"></span>
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
          {status}
        </span>
      );
  }
};
