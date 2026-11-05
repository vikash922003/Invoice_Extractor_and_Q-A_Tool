import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  UploadCloud, 
  Table, 
  MessageSquare, 
  BarChart2, 
  Settings, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { apiClient } from '../api/client';

export const Navbar: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: apiClient.getHealth,
    refetchInterval: 15000,
  });

  const navItems = [
    { to: '/', label: 'Dashboard', icon: BarChart2 },
    { to: '/upload', label: 'Upload Invoices', icon: UploadCloud },
    { to: '/invoices', label: 'Invoices', icon: Table },
    { to: '/qa', label: 'Ask Your Invoices', icon: MessageSquare },
    { to: '/evaluation', label: 'Accuracy Evaluator', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Invoice Intelligence</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 rounded-md border border-sky-100 uppercase tracking-wider">
                MERN + Gemini
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-2 stroke-[2.2]" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* System Health / API Status */}
          <div className="flex items-center space-x-3">
            {health?.gemini_configured ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Gemini Ready
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Gemini Key Pending
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
