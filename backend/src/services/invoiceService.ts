import mongoose from 'mongoose';
import { InvoiceModel, DocumentModel, InvoiceLineItemModel, ExtractionAttemptModel } from '../models/index.js';

export interface IInvoiceFilterParams {
  vendor?: string;
  invoiceNumber?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  validationStatus?: 'PASS' | 'FAIL';
  processingStatus?: string;
  currency?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class InvoiceService {
  /**
   * Search and filter invoices with pagination and sorting
   */
  public async getInvoices(params: IInvoiceFilterParams): Promise<any> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const query: any = {};

    // Vendor filter or search
    if (params.vendor) {
      query.vendor_name = { $regex: params.vendor.trim(), $options: 'i' };
    }

    if (params.invoiceNumber) {
      query.invoice_number = { $regex: params.invoiceNumber.trim(), $options: 'i' };
    }

    // General search across vendor or invoice number
    if (params.search) {
      const s = params.search.trim();
      query.$or = [
        { vendor_name: { $regex: s, $options: 'i' } },
        { invoice_number: { $regex: s, $options: 'i' } }
      ];
    }

    // Date range filter
    if (params.dateFrom || params.dateTo) {
      query.invoice_date_parsed = {};
      if (params.dateFrom) {
        query.invoice_date_parsed.$gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        query.invoice_date_parsed.$lte = new Date(params.dateTo);
      }
    }

    // Validation status filter
    if (params.validationStatus) {
      query.validation_status = params.validationStatus;
    }

    // Currency filter
    if (params.currency) {
      query.currency = params.currency;
    }

    // Sorting
    const sortField = params.sortBy || 'invoice_date_parsed';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortDirection };

    // Query invoices with populated document
    const [invoices, total] = await Promise.all([
      InvoiceModel.find(query)
        .populate('document_id', 'original_filename mime_type file_size processing_status processing_error uploaded_at')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      InvoiceModel.countDocuments(query)
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single invoice with populated document, line items, and audit attempts
   */
  public async getInvoiceById(invoiceId: string): Promise<any> {
    const invoice = await InvoiceModel.findById(invoiceId).populate('document_id');
    if (!invoice) return null;

    const [lineItems, attempts] = await Promise.all([
      InvoiceLineItemModel.find({ invoice_id: invoice._id }),
      ExtractionAttemptModel.find({ document_id: invoice.document_id }).sort({ attempt_number: 1 })
    ]);

    return {
      invoice,
      line_items: lineItems,
      extraction_attempts: attempts
    };
  }

  /**
   * Get dashboard statistics
   */
  public async getDashboardStats(): Promise<any> {
    const [
      totalDocuments,
      queuedDocuments,
      processingDocuments,
      failedDocuments,
      totalInvoices,
      passedValidation,
      failedValidation,
      spendByCurrency
    ] = await Promise.all([
      DocumentModel.countDocuments(),
      DocumentModel.countDocuments({ processing_status: 'QUEUED' }),
      DocumentModel.countDocuments({ processing_status: 'PROCESSING' }),
      DocumentModel.countDocuments({ processing_status: 'FAILED' }),
      InvoiceModel.countDocuments(),
      InvoiceModel.countDocuments({ validation_status: 'PASS' }),
      InvoiceModel.countDocuments({ validation_status: 'FAIL' }),
      InvoiceModel.aggregate([
        {
          $group: {
            _id: '$currency',
            totalSpend: { $sum: '$total' },
            totalTax: { $sum: '$tax' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      total_documents: totalDocuments,
      queued_documents: queuedDocuments,
      processing_documents: processingDocuments,
      failed_documents: failedDocuments,
      total_invoices: totalInvoices,
      validation_passed: passedValidation,
      validation_failed: failedValidation,
      spend_by_currency: spendByCurrency
    };
  }

  /**
   * Get distinct filter values for frontend dropdowns
   */
  public async getDistinctFilters(): Promise<any> {
    const [vendors, currencies] = await Promise.all([
      InvoiceModel.distinct('vendor_name'),
      InvoiceModel.distinct('currency')
    ]);

    return {
      vendors: vendors.sort(),
      currencies: currencies.sort()
    };
  }
}
