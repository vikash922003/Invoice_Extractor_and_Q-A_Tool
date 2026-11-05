import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Health
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  // Documents
  uploadDocuments: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const res = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getDocuments: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/documents', { params });
    return res.data.data;
  },

  getDocumentById: async (id: string) => {
    const res = await api.get(`/documents/${id}`);
    return res.data.data;
  },

  getDocumentStatus: async (id: string) => {
    const res = await api.get(`/documents/${id}/status`);
    return res.data.data;
  },

  retryDocument: async (id: string) => {
    const res = await api.post(`/documents/${id}/retry`);
    return res.data;
  },

  getFileUrl: (id: string) => `/api/v1/documents/${id}/file`,

  // Invoices
  getInvoices: async (params?: any) => {
    const res = await api.get('/invoices', { params });
    return res.data.data;
  },

  getInvoiceById: async (id: string) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data.data;
  },

  getStats: async () => {
    const res = await api.get('/invoices/stats');
    return res.data.data;
  },

  getFilters: async () => {
    const res = await api.get('/invoices/filters');
    return res.data.data;
  },

  // Q&A
  askQuestion: async (question: string, invoiceId?: string) => {
    const res = await api.post('/qa/ask', { question, invoice_id: invoiceId || undefined });
    return res.data.data;
  },

  getQAHistory: async () => {
    const res = await api.get('/qa/history');
    return res.data.data;
  },

  // Evaluation
  getEvaluationReport: async () => {
    const res = await api.get('/evaluation/report');
    return res.data.data;
  },

  runEvaluation: async () => {
    const res = await api.post('/evaluation/run');
    return res.data.data;
  },
};
