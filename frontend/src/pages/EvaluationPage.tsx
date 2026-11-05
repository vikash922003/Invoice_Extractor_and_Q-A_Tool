import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  Terminal, 
  ShieldCheck 
} from 'lucide-react';
import { apiClient } from '../api/client';

export const EvaluationPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['evaluationReport'],
    queryFn: apiClient.getEvaluationReport,
  });

  const runMutation = useMutation({
    mutationFn: apiClient.runEvaluation,
    onSuccess: (data) => {
      queryClient.setQueryData(['evaluationReport'], data);
    }
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accuracy Evaluation Framework</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated benchmarking tool comparing LLM-extracted fields against ground-truth <code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded text-xs font-mono">expected_values.json</code>.
          </p>
        </div>
        <div>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow transition flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? 'Evaluating Test Suite...' : 'Run Extraction Benchmark'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Loading benchmark data...</p>
        </div>
      )}

      {/* When no report yet */}
      {!isLoading && !report && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
          <Terminal className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Evaluation Report Generated Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Run the benchmark above or execute <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-800">npm run evaluate:extraction</code> in your terminal.
          </p>
          <button
            onClick={() => runMutation.mutate()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow"
          >
            Run Benchmark Now
          </button>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Top Overall Score Card */}
          <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-mono text-sky-400 tracking-wider uppercase">Ground Truth Benchmark</span>
              <h2 className="text-xl font-bold mt-1">Accuracy Benchmark Results</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated against {report.total_invoices_tested} sample invoices with 0.05 monetary tolerance.
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <span className="text-3xl font-extrabold text-sky-400 font-mono">
                  {report.overall_field_accuracy}%
                </span>
                <span className="text-xs text-slate-400 block font-medium">Overall Precision</span>
              </div>
            </div>
          </div>

          {/* Field-by-Field Accuracy Bars */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Per-Field Accuracy Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(report.fields || {}).map(([key, field]: [string, any]) => (
                <div key={key} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                    <span className="capitalize text-slate-700 font-mono">{key.replace('_', ' ')}</span>
                    <span className="text-slate-900 font-bold">
                      {field.accuracy_percentage}% ({field.matched}/{field.total})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        field.accuracy_percentage >= 90
                          ? 'bg-emerald-500'
                          : field.accuracy_percentage >= 60
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${field.accuracy_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Invoices Audit Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Sample Invoices Extraction & Validation Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit each test file against ground truth and verify expected financial validation outcomes.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {report.invoices?.map((inv: any, idx: number) => {
                const passedValCheck = inv.validation_passed === inv.expected_validation_passed;

                return (
                  <div key={idx} className="p-5 hover:bg-slate-50/50 transition space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        {passedValCheck ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                        <div>
                          <span className="text-sm font-bold text-slate-900">{inv.filename}</span>
                          <span className="text-xs text-slate-400 block font-mono">
                            Expected: {inv.expected?.vendor_name} ({inv.expected?.invoice_number})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-500 font-medium">Financial Validation:</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          inv.expected_validation_passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          Expected {inv.expected_validation_passed ? 'PASS' : 'FAIL'}
                        </span>
                        <span>→</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          inv.validation_passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          Result {inv.validation_passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    </div>

                    {/* Discrepancies List */}
                    {inv.discrepancies?.length > 0 ? (
                      <div className="pl-8 text-xs space-y-1">
                        <span className="font-semibold text-rose-700 block">Discrepancies:</span>
                        {inv.discrepancies.map((d: string, dIdx: number) => (
                          <p key={dIdx} className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-100">
                            • {d}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="pl-8 text-xs text-emerald-600 font-medium flex items-center">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        All fields matched ground truth with 100% precision within tolerance.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
