import mongoose from 'mongoose';
import BigNumber from 'bignumber.js';
import { InvoiceModel, DocumentModel, QAHistoryModel, InvoiceLineItemModel } from '../models/index.js';
import { ILlmProvider } from '../providers/llmProvider.js';
import { GeminiProvider } from '../providers/geminiProvider.js';
import { ICitation, IQAResponse } from '../types/index.js';

interface ISafeQueryPlan {
  action: 'AGGREGATION' | 'FILTER_LIST' | 'DOCUMENT_SEARCH';
  filters?: {
    vendor_name?: string;
    item_description?: string;
    currency?: 'INR' | 'USD' | 'EUR';
    date_from?: string;
    date_to?: string;
    validation_status?: 'PASS' | 'FAIL';
    has_tax_line?: boolean;
    min_total?: number;
    max_total?: number;
  };
  aggregation?: {
    metric: 'sum_total' | 'sum_tax' | 'sum_subtotal' | 'count' | 'max_total' | 'avg_total';
    groupBy?: 'vendor_name' | 'currency' | null;
  };
  search_text?: string;
  sort?: {
    field: 'total' | 'invoice_date' | 'subtotal' | 'tax';
    direction: 1 | -1;
  };
  limit?: number;
}

export class QAService {
  private llmProvider: ILlmProvider;

  constructor(provider?: ILlmProvider) {
    this.llmProvider = provider || new GeminiProvider();
  }

  public setProvider(provider: ILlmProvider) {
    this.llmProvider = provider;
  }

  /**
   * Sanitizes and validates query plan against an allowlist of fields and operators
   */
  private validateAndSanitizePlan(rawPlan: any): ISafeQueryPlan {
    const validActions = ['AGGREGATION', 'FILTER_LIST', 'DOCUMENT_SEARCH'];
    const action = validActions.includes(rawPlan?.action) ? rawPlan.action : 'AGGREGATION';

    const safeFilters: any = {};
    if (rawPlan?.filters && typeof rawPlan.filters === 'object') {
      const f = rawPlan.filters;
      if (typeof f.vendor_name === 'string' && f.vendor_name.trim()) {
        safeFilters.vendor_name = f.vendor_name.trim().replace(/[\$\{\}]/g, ''); // prevent Mongo operator injection
      }
      if (typeof f.item_description === 'string' && f.item_description.trim()) {
        safeFilters.item_description = f.item_description.trim().replace(/[\$\{\}]/g, '');
      }
      if (['INR', 'USD', 'EUR'].includes(f.currency)) {
        safeFilters.currency = f.currency;
      }
      if (typeof f.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.date_from)) {
        safeFilters.date_from = f.date_from;
      }
      if (typeof f.date_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.date_to)) {
        safeFilters.date_to = f.date_to;
      }
      if (['PASS', 'FAIL'].includes(f.validation_status)) {
        safeFilters.validation_status = f.validation_status;
      }
      if (typeof f.has_tax_line === 'boolean') {
        safeFilters.has_tax_line = f.has_tax_line;
      }
      if (typeof f.min_total === 'number' && !isNaN(f.min_total)) {
        safeFilters.min_total = f.min_total;
      }
      if (typeof f.max_total === 'number' && !isNaN(f.max_total)) {
        safeFilters.max_total = f.max_total;
      }
    }

    const safeAgg: any = {
      metric: ['sum_total', 'sum_tax', 'sum_subtotal', 'count', 'max_total', 'avg_total'].includes(rawPlan?.aggregation?.metric)
        ? rawPlan.aggregation.metric
        : 'sum_total',
      groupBy: ['vendor_name', 'currency'].includes(rawPlan?.aggregation?.groupBy)
        ? rawPlan.aggregation.groupBy
        : null
    };

    let safeSort = undefined;
    if (rawPlan?.sort && ['total', 'invoice_date', 'subtotal', 'tax'].includes(rawPlan.sort.field)) {
      safeSort = {
        field: rawPlan.sort.field,
        direction: rawPlan.sort.direction === 1 ? (1 as const) : (-1 as const)
      };
    }

    return {
      action,
      filters: safeFilters,
      aggregation: safeAgg,
      search_text: typeof rawPlan?.search_text === 'string' ? rawPlan.search_text.trim() : undefined,
      sort: safeSort,
      limit: Math.min(50, Math.max(1, Number(rawPlan?.limit) || 10))
    };
  }

  /**
   * Main Q&A answering pipeline
   */
  public async answerQuestion(question: string, targetInvoiceId?: string): Promise<IQAResponse> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new Error('Question cannot be empty');
    }

    // IF TARGET INVOICE ID IS PROVIDED: Run Invoice-Specific Q&A Mode
    if (targetInvoiceId) {
      if (!mongoose.Types.ObjectId.isValid(targetInvoiceId)) {
        throw new Error('Invalid invoice ID format');
      }

      const invoice: any = await InvoiceModel.findById(targetInvoiceId).lean();
      if (!invoice) {
        throw new Error(`Invoice with ID ${targetInvoiceId} not found`);
      }

      const lineItems = await InvoiceLineItemModel.find({ invoice_id: invoice._id }).lean();
      const doc = await DocumentModel.findById(invoice.document_id).lean();

      const lineItemsFormatted = lineItems.length > 0
        ? lineItems.map((it, idx) => `  ${idx + 1}. "${it.description}" | Quantity: ${it.quantity} | Unit Price: ${invoice.currency} ${it.unit_price} | Amount: ${invoice.currency} ${it.amount}`).join('\n')
        : '  (No line items recorded)';

      const validationErrSummary = invoice.validation_errors?.length
        ? invoice.validation_errors.map((e: any) => `- [${e.code}] ${e.message} (Expected: ${e.expected}, Got: ${e.extracted})`).join('\n')
        : 'None (Invoice passed all arithmetic checks)';

      const suspiciousSummary = invoice.suspicious_fields?.length
        ? invoice.suspicious_fields.map((s: any) => `- Field "${s.field}": ${s.reason} (Value: ${s.value})`).join('\n')
        : 'None';

      const context = `
=== SCOPED INVOICE RECORD ===
Vendor Name: ${invoice.vendor_name}
Invoice Number: ${invoice.invoice_number}
Invoice Date: ${invoice.invoice_date}
Currency: ${invoice.currency}
Subtotal: ${invoice.currency} ${invoice.subtotal}
Tax: ${invoice.currency} ${invoice.tax} (CGST: ${invoice.cgst ?? 'N/A'}, SGST: ${invoice.sgst ?? 'N/A'}, Tax Line Present: ${invoice.has_tax_line})
Total: ${invoice.currency} ${invoice.total}
Financial Validation Status: ${invoice.validation_status}
Validation Errors:
${validationErrSummary}
Suspicious Warnings:
${suspiciousSummary}

Line Items (${lineItems.length}):
${lineItemsFormatted}

Raw Document Content:
${doc?.extracted_raw_text ? doc.extracted_raw_text.slice(0, 2000) : 'None'}
==============================

Instructions: The user has specifically selected and asked about this single invoice (#${invoice.invoice_number} from ${invoice.vendor_name}). Answer their question thoroughly, citing the specific figures, line items, taxes, quantities, or validation results from this invoice.
`;

      const answer = await this.llmProvider.synthesizeAnswer(trimmedQuestion, context);

      const snippet = `Invoice #${invoice.invoice_number} | Vendor: ${invoice.vendor_name} | Total: ${invoice.currency} ${invoice.total} | Status: ${invoice.validation_status}`;
      const citation: ICitation = {
        invoice_id: invoice._id.toString(),
        document_id: invoice.document_id.toString(),
        invoice_number: invoice.invoice_number,
        vendor_name: invoice.vendor_name,
        invoice_date: invoice.invoice_date,
        total: invoice.total,
        currency: invoice.currency,
        evidence_snippet: snippet
      };

      const response: IQAResponse = {
        question: trimmedQuestion,
        answer,
        query_type: 'INVOICE_SPECIFIC',
        citations: [citation],
        target_invoice_id: targetInvoiceId,
        query_plan: {
          action: 'FILTER_LIST',
          filters: { invoice_id: targetInvoiceId },
          scoped_vendor: invoice.vendor_name,
          scoped_invoice_number: invoice.invoice_number
        },
        confidence: 'HIGH'
      };

      await QAHistoryModel.create(response);
      return response;
    }

    // Step 1: Query Planner
    let rawPlan: any;
    try {
      rawPlan = await this.llmProvider.planQuery(trimmedQuestion, 'Invoice Schema');
    } catch (planErr) {
      console.warn('LLM query planning failed, falling back to heuristic query:', planErr);
      rawPlan = { action: 'AGGREGATION', filters: {}, aggregation: { metric: 'sum_total' } };
    }

    const plan = this.validateAndSanitizePlan(rawPlan);

    // Automatic item detection if not caught by LLM planner
    if (!plan.filters?.item_description && !plan.search_text) {
      const qLower = trimmedQuestion.toLowerCase();
      const productKeywords = [
        'laptop', 'notebook', 'macbook', 'computer', 'pc', 'monitor', 'screen',
        'keyboard', 'mouse', 'docking', 'ram', 'ssd', 'cable', 'hdmi', 'desk',
        'chair', 'consulting', 'catering', 'food', 'meal', 'lunch', 'storage',
        'server', 'instance', 'license', 'subscription', 'software', 'hardware'
      ];
      for (const kw of productKeywords) {
        if (qLower.includes(kw)) {
          if (!plan.filters) plan.filters = {};
          plan.filters.item_description = kw;
          if (plan.action === 'AGGREGATION' && !qLower.includes('total') && !qLower.includes('how much') && !qLower.includes('sum')) {
            plan.action = 'FILTER_LIST';
          }
          break;
        }
      }
    }

    // Step 2: Route execution to Structured Aggregation or Document Retrieval
    let context = '';
    let citations: ICitation[] = [];
    let queryType: 'STRUCTURED_AGGREGATION' | 'DOCUMENT_RETRIEVAL' | 'HYBRID' = 'STRUCTURED_AGGREGATION';

    if (plan.action === 'DOCUMENT_SEARCH' && plan.search_text) {
      queryType = 'DOCUMENT_RETRIEVAL';
      const searchResults = await this.executeDocumentSearch(plan.search_text);
      context = searchResults.context;
      citations = searchResults.citations;
    } else {
      const structuredResult = await this.executeStructuredQuery(plan);
      context = structuredResult.context;
      citations = structuredResult.citations;
    }

    // Fallback: If structured query found nothing, attempt a broad document search
    if ((!context || citations.length === 0) && trimmedQuestion.length > 3) {
      const fallbackSearch = await this.executeDocumentSearch(trimmedQuestion);
      if (fallbackSearch.citations.length > 0) {
        context = fallbackSearch.context;
        citations = fallbackSearch.citations;
        queryType = 'HYBRID';
      }
    }

    // If still no context or documents found
    if (!context || (citations.length === 0 && !context.includes('Aggregation Results'))) {
      const emptyAnswer = `The available invoice data is insufficient to answer the question: "${trimmedQuestion}". No matching invoices or records were found in the database.`;
      const response: IQAResponse = {
        question: trimmedQuestion,
        answer: emptyAnswer,
        query_type: 'UNANSWERABLE',
        citations: [],
        query_plan: plan
      };
      await QAHistoryModel.create(response);
      return response;
    }

    // Step 3: Natural language synthesis with citations
    const answer = await this.llmProvider.synthesizeAnswer(trimmedQuestion, context);

    // Refine citations: if multiple citations exist, prioritize only the ones mentioned or matched
    let refinedCitations = citations;
    if (citations.length > 1) {
      const ansLower = answer.toLowerCase();
      const relevant = citations.filter(c => 
        ansLower.includes(c.invoice_number.toLowerCase()) || 
        ansLower.includes(c.vendor_name.toLowerCase())
      );
      if (relevant.length > 0) {
        refinedCitations = relevant;
      }
    }

    const finalResponse: IQAResponse = {
      question: trimmedQuestion,
      answer,
      query_type: queryType,
      citations: refinedCitations,
      query_plan: plan,
      confidence: refinedCitations.length > 0 ? 'HIGH' : 'MEDIUM'
    };

    // Save to QAHistory
    await QAHistoryModel.create(finalResponse);

    return finalResponse;
  }

  /**
   * Executes safe parameterized aggregation against MongoDB
   */
  private async executeStructuredQuery(plan: ISafeQueryPlan): Promise<{ context: string; citations: ICitation[] }> {
    const matchStage: any = {};

    if (plan.filters?.vendor_name) {
      matchStage.vendor_name = { $regex: plan.filters.vendor_name, $options: 'i' };
    }
    if (plan.filters?.currency) {
      matchStage.currency = plan.filters.currency;
    }
    if (plan.filters?.validation_status) {
      matchStage.validation_status = plan.filters.validation_status;
    }
    if (plan.filters?.has_tax_line !== undefined) {
      matchStage.has_tax_line = plan.filters.has_tax_line;
    }
    if (plan.filters?.date_from || plan.filters?.date_to) {
      matchStage.invoice_date_parsed = {};
      if (plan.filters.date_from) {
        matchStage.invoice_date_parsed.$gte = new Date(plan.filters.date_from);
      }
      if (plan.filters.date_to) {
        matchStage.invoice_date_parsed.$lte = new Date(plan.filters.date_to);
      }
    }
    if (plan.filters?.min_total !== undefined || plan.filters?.max_total !== undefined) {
      matchStage.total = {};
      if (plan.filters.min_total !== undefined) matchStage.total.$gte = plan.filters.min_total;
      if (plan.filters.max_total !== undefined) matchStage.total.$lte = plan.filters.max_total;
    }

    // Line item search matching
    const searchTarget = plan.filters?.item_description || plan.search_text;
    if (searchTarget) {
      const terms = searchTarget.trim().split(/\s+/).filter(w => w.length > 1);
      if (terms.length > 0) {
        // Try matching all terms first
        const allRegex = new RegExp(terms.map(t => `(?=.*${t.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')})`).join(''), 'i');
        let matchedItems = await InvoiceLineItemModel.find({ description: { $regex: allRegex } }).lean();

        // If no items match all words, try matching any word
        if (matchedItems.length === 0 && terms.length > 1) {
          const anyRegex = new RegExp(terms.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')).join('|'), 'i');
          matchedItems = await InvoiceLineItemModel.find({ description: { $regex: anyRegex } }).lean();
        }

        // Also search raw document text for matching terms
        const anyDocRegex = new RegExp(terms.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')).join('|'), 'i');
        const matchedDocs = await DocumentModel.find({ extracted_raw_text: { $regex: anyDocRegex } }).select('_id').lean();
        const docInvoices = await InvoiceModel.find({ document_id: { $in: matchedDocs.map(d => d._id) } }).select('_id').lean();

        const combinedInvoiceIds = Array.from(new Set([
          ...matchedItems.map(it => it.invoice_id.toString()),
          ...docInvoices.map(inv => inv._id.toString())
        ])).map(id => new mongoose.Types.ObjectId(id));

        matchStage._id = { $in: combinedInvoiceIds };
      }
    }

    // Retrieve matching invoices
    const sortObj: any = {};
    if (plan.sort) {
      sortObj[plan.sort.field === 'invoice_date' ? 'invoice_date_parsed' : plan.sort.field] = plan.sort.direction;
    } else {
      sortObj.invoice_date_parsed = -1;
    }

    const matchingInvoices = await InvoiceModel.find(matchStage)
      .sort(sortObj)
      .limit(plan.limit || 15)
      .lean();

    // Fetch line items for all matched invoices
    const invoiceIds = matchingInvoices.map((inv: any) => inv._id);
    const lineItems = await InvoiceLineItemModel.find({ invoice_id: { $in: invoiceIds } }).lean();
    const itemsByInvoiceId = new Map<string, any[]>();
    for (const item of lineItems) {
      const invId = item.invoice_id.toString();
      if (!itemsByInvoiceId.has(invId)) {
        itemsByInvoiceId.set(invId, []);
      }
      itemsByInvoiceId.get(invId)!.push(item);
    }

    const citations: ICitation[] = matchingInvoices.map((inv: any) => {
      const items = itemsByInvoiceId.get(inv._id.toString()) || [];
      const searchTargetLower = (plan.filters?.item_description || plan.search_text || '').toLowerCase();
      const terms = searchTargetLower.split(/\s+/).filter(w => w.length > 1);

      const matchedItem = items.find(it => terms.some(t => it.description.toLowerCase().includes(t))) || items[0];

      const snippet = matchedItem
        ? `Line Item: "${matchedItem.description}" (Qty: ${matchedItem.quantity}, Price: ${inv.currency} ${matchedItem.unit_price}, Amount: ${inv.currency} ${matchedItem.amount}) on Invoice #${inv.invoice_number}`
        : `Vendor: ${inv.vendor_name}, Total: ${inv.currency} ${inv.total}, Tax: ${inv.currency} ${inv.tax}, Status: ${inv.validation_status}`;

      return {
        invoice_id: inv._id.toString(),
        document_id: inv.document_id.toString(),
        invoice_number: inv.invoice_number,
        vendor_name: inv.vendor_name,
        invoice_date: inv.invoice_date,
        total: inv.total,
        currency: inv.currency,
        evidence_snippet: snippet
      };
    });

    // If action is AGGREGATION, run Mongo aggregation pipeline
    let aggSummary = '';
    if (plan.action === 'AGGREGATION' && plan.aggregation) {
      const metric = plan.aggregation.metric;
      let aggExpression: any = {};

      if (metric === 'sum_total') aggExpression = { $sum: '$total' };
      else if (metric === 'sum_tax') aggExpression = { $sum: '$tax' };
      else if (metric === 'sum_subtotal') aggExpression = { $sum: '$subtotal' };
      else if (metric === 'count') aggExpression = { $sum: 1 };
      else if (metric === 'max_total') aggExpression = { $max: '$total' };
      else if (metric === 'avg_total') aggExpression = { $avg: '$total' };

      const groupStage: any = {
        _id: plan.aggregation.groupBy ? `$${plan.aggregation.groupBy}` : '$currency',
        resultValue: aggExpression,
        count: { $sum: 1 }
      };

      const aggResults = await InvoiceModel.aggregate([
        { $match: matchStage },
        { $group: groupStage }
      ]);

      aggSummary = `\nAggregation Results (${metric}):\n` + 
        aggResults.map((r: any) => `- Group ${r._id || 'All'}: Value = ${r.resultValue != null ? Number(r.resultValue).toFixed(2) : 'N/A'}, Count = ${r.count}`).join('\n');
    }

    const invoiceListText = matchingInvoices.map((inv: any) => {
      const items = itemsByInvoiceId.get(inv._id.toString()) || [];
      const itemsFormatted = items.length > 0
        ? items.map(it => `    * Item: "${it.description}" | Qty: ${it.quantity} | Unit Price: ${inv.currency} ${it.unit_price} | Amount: ${inv.currency} ${it.amount}`).join('\n')
        : '    * (No line items recorded)';

      return `- Invoice #${inv.invoice_number} | Vendor: ${inv.vendor_name} | Date: ${inv.invoice_date} | Currency: ${inv.currency} | Subtotal: ${inv.subtotal} | Tax: ${inv.tax} | Total: ${inv.total} | Validation: ${inv.validation_status}
  Line Items:
${itemsFormatted}`;
    }).join('\n\n');

    const context = `
Structured Query Execution Summary:
Filters Applied: ${JSON.stringify(matchStage)}
${aggSummary}

Matched Invoices (${matchingInvoices.length}):
${invoiceListText}
`;

    return { context, citations };
  }

  /**
   * Qualitative Document and Line Item Search
   */
  private async executeDocumentSearch(query: string): Promise<{ context: string; citations: ICitation[] }> {
    const rawTerms = query.trim().split(/\s+/).filter(w => w.length > 1);
    if (rawTerms.length === 0) {
      return { context: '', citations: [] };
    }

    // 1. Search line items
    const anyRegex = new RegExp(rawTerms.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')).join('|'), 'i');
    const matchedLineItems = await InvoiceLineItemModel.find({ description: { $regex: anyRegex } }).limit(15).lean();
    const lineItemInvoiceIds = matchedLineItems.map(it => it.invoice_id);

    // 2. Search document raw text
    const matchedDocs = await DocumentModel.find({
      extracted_raw_text: { $regex: anyRegex }
    }).limit(15).lean();
    const docIds = matchedDocs.map(d => d._id);

    // 3. Find parent invoices
    const invoices = await InvoiceModel.find({
      $or: [
        { _id: { $in: lineItemInvoiceIds } },
        { document_id: { $in: docIds } }
      ]
    }).limit(10).lean();

    if (invoices.length === 0 && matchedDocs.length === 0) {
      return { context: '', citations: [] };
    }

    // Fetch line items for all these invoices
    const invIds = invoices.map(inv => inv._id);
    const allItems = await InvoiceLineItemModel.find({ invoice_id: { $in: invIds } }).lean();
    const itemsByInv = new Map<string, any[]>();
    for (const it of allItems) {
      const id = it.invoice_id.toString();
      if (!itemsByInv.has(id)) itemsByInv.set(id, []);
      itemsByInv.get(id)!.push(it);
    }

    const citations: ICitation[] = [];
    const snippets: string[] = [];

    for (const inv of invoices) {
      const items = itemsByInv.get(inv._id.toString()) || [];
      const matchedItem = items.find(it => rawTerms.some(t => it.description.toLowerCase().includes(t.toLowerCase())));

      const snippet = matchedItem
        ? `Line Item: "${matchedItem.description}" (Qty: ${matchedItem.quantity}, Price: ${inv.currency} ${matchedItem.unit_price}, Amount: ${inv.currency} ${matchedItem.amount}) on Invoice #${inv.invoice_number}`
        : `Vendor: ${inv.vendor_name}, Total: ${inv.currency} ${inv.total}, Tax: ${inv.currency} ${inv.tax}, Status: ${inv.validation_status}`;

      citations.push({
        invoice_id: inv._id.toString(),
        document_id: inv.document_id.toString(),
        invoice_number: inv.invoice_number,
        vendor_name: inv.vendor_name,
        invoice_date: inv.invoice_date,
        total: inv.total,
        currency: inv.currency,
        evidence_snippet: snippet
      });

      const itemsText = items.map(it => `    * Item: "${it.description}" | Qty: ${it.quantity} | Unit Price: ${inv.currency} ${it.unit_price} | Amount: ${inv.currency} ${it.amount}`).join('\n');
      snippets.push(`- Invoice #${inv.invoice_number} | Vendor: ${inv.vendor_name} | Date: ${inv.invoice_date} | Total: ${inv.currency} ${inv.total}\n  Line Items:\n${itemsText}`);
    }

    return {
      context: `Matching Invoices and Line Items for "${query}":\n\n${snippets.join('\n\n')}`,
      citations
    };
  }

  /**
   * Retrieve Q&A history
   */
  public async getHistory(limit = 20): Promise<any[]> {
    return QAHistoryModel.find().sort({ created_at: -1 }).limit(limit);
  }
}
