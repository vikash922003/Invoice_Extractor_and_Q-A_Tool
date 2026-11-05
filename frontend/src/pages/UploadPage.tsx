import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Clock 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

export const UploadPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Poll recent documents for real-time status updates
  const { data: docData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => apiClient.getDocuments({ limit: 20 }),
    refetchInterval: 3000,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => apiClient.uploadDocuments(files),
    onSuccess: () => {
      setSelectedFiles([]);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recentInvoices'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Upload failed');
    }
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiClient.retryDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setErrorMessage(null);

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setErrorMessage(`File "${file.name}" has an unsupported format. Supported: PDF, PNG, JPG, JPEG, WEBP`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds the 10MB file size limit.`);
        return;
      }
      newFiles.push(file);
    }

    if (selectedFiles.length + newFiles.length > 20) {
      setErrorMessage('Maximum 20 files can be uploaded per batch.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleUploadSubmit = () => {
    if (selectedFiles.length === 0) return;
    uploadMutation.mutate(selectedFiles);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Invoices & Receipts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload up to 20 documents simultaneously (PDF, PNG, JPG, JPEG, WEBP). Documents are queued, deduplicated via SHA-256, and processed independently.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-sky-500 bg-sky-50/60 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="text-slate-800 font-semibold text-base">
            Drag & drop invoice files here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sky-600 hover:text-sky-800 underline underline-offset-2 font-bold"
            >
              browse from disk
            </button>
          </div>
          <p className="text-xs text-slate-400">
            PDF, PNG, JPG, JPEG, WEBP • Max 10MB per file • Up to 20 files per batch
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Staged Files Ready for Upload */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">
              Ready to Upload ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
            </h3>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear Selection
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleUploadSubmit}
              disabled={uploadMutation.isPending}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow transition flex items-center"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading & Queuing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Start Batch Processing
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Documents Ingestion Pipeline Live Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ingested Documents Pipeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live state machine tracking: QUEUED → PROCESSING → EXTRACTED / VALIDATION_FAILED / FAILED</p>
          </div>
          <span className="text-xs text-slate-400 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Auto-refreshing every 3s
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Filename</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Type / Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Uploaded At</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Processing Details</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {docsLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading ingestion queue...
                  </td>
                </tr>
              ) : docData?.documents?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No documents uploaded yet. Drop files above to start extraction.
                  </td>
                </tr>
              ) : (
                docData?.documents?.map((doc: any) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 text-xs truncate max-w-xs block">
                          {doc.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {doc.mime_type.split('/')[1]?.toUpperCase()} • {(doc.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <StatusBadge status={doc.processing_status} />
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                      {doc.processing_error ? (
                        <span className="text-rose-600 font-medium truncate block" title={doc.processing_error}>
                          {doc.processing_error}
                        </span>
                      ) : doc.processing_status === 'EXTRACTED' ? (
                        <span className="text-emerald-600">Extraction and validation succeeded</span>
                      ) : doc.processing_status === 'VALIDATION_FAILED' ? (
                        <span className="text-amber-700">Extracted with financial rule discrepancies</span>
                      ) : (
                        <span className="text-slate-400">Awaiting worker turn...</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {['FAILED', 'VALIDATION_FAILED'].includes(doc.processing_status) && (
                        <button
                          onClick={() => retryMutation.mutate(doc._id)}
                          disabled={retryMutation.isPending}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition inline-flex items-center"
                          title="Retry Extraction"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </button>
                      )}
                      <a
                        href={apiClient.getFileUrl(doc._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-100 transition inline-flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </a>
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
