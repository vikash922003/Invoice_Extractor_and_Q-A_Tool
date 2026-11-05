import fs from 'fs/promises';
import path from 'path';
import BigNumber from 'bignumber.js';
import { IExtractedInvoice } from '../types/index.js';
import { ExtractionService } from './extractionService.js';
import { FinancialValidationEngine } from './validationEngine.js';

export interface IExpectedInvoiceValues {
  filename: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  expected_validation_status?: 'PASS' | 'FAIL';
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
}

export interface IFieldAccuracy {
  matched: number;
  total: number;
  accuracy_percentage: number;
}

export interface IEvaluationReport {
  timestamp: string;
  total_invoices_tested: number;
  overall_field_accuracy: number;
  fields: {
    vendor_name: IFieldAccuracy;
    invoice_number: IFieldAccuracy;
    invoice_date: IFieldAccuracy;
    currency: IFieldAccuracy;
    subtotal: IFieldAccuracy;
    tax: IFieldAccuracy;
    total: IFieldAccuracy;
    line_items: IFieldAccuracy;
    validation_status: IFieldAccuracy;
  };
  invoices: Array<{
    filename: string;
    extracted: any;
    expected: any;
    field_matches: Record<string, boolean>;
    discrepancies: string[];
    validation_passed: boolean;
    expected_validation_passed: boolean;
  }>;
}

export class EvaluationService {
  private static readonly TOLERANCE = 0.05;

  private static compareNumeric(a: number | undefined | null, b: number | undefined | null): boolean {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    if (isNaN(a) || isNaN(b)) return false;
    const diff = new BigNumber(a).minus(b).abs().toNumber();
    return diff <= this.TOLERANCE;
  }

  private static normalizeString(s: string | undefined | null): string {
    return (s || '').trim().toLowerCase();
  }

  private static normalizeDate(d: string | undefined | null): string {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return (d || '').trim();
    return dateObj.toISOString().split('T')[0];
  }

  public static evaluateDataset(
    extractions: Array<{ filename: string; extracted: IExtractedInvoice | null; validationStatus: string }>,
    groundTruth: IExpectedInvoiceValues[]
  ): IEvaluationReport {
    const truthMap = new Map<string, IExpectedInvoiceValues>();
    groundTruth.forEach(item => truthMap.set(item.filename, item));

    const fieldsAcc = {
      vendor_name: { matched: 0, total: 0, accuracy_percentage: 0 },
      invoice_number: { matched: 0, total: 0, accuracy_percentage: 0 },
      invoice_date: { matched: 0, total: 0, accuracy_percentage: 0 },
      currency: { matched: 0, total: 0, accuracy_percentage: 0 },
      subtotal: { matched: 0, total: 0, accuracy_percentage: 0 },
      tax: { matched: 0, total: 0, accuracy_percentage: 0 },
      total: { matched: 0, total: 0, accuracy_percentage: 0 },
      line_items: { matched: 0, total: 0, accuracy_percentage: 0 },
      validation_status: { matched: 0, total: 0, accuracy_percentage: 0 }
    };

    const invoiceReports: any[] = [];
    let totalChecks = 0;
    let totalMatches = 0;

    for (const item of extractions) {
      const expected = truthMap.get(item.filename);
      if (!expected) continue;

      const ext = item.extracted;
      const fieldMatches: Record<string, boolean> = {};
      const discrepancies: string[] = [];

      // vendor_name
      fieldsAcc.vendor_name.total++;
      const vendorMatch = ext ? this.normalizeString(ext.vendor_name) === this.normalizeString(expected.vendor_name) : false;
      fieldMatches.vendor_name = vendorMatch;
      if (vendorMatch) fieldsAcc.vendor_name.matched++;
      else discrepancies.push(`Vendor Name: expected '${expected.vendor_name}', got '${ext?.vendor_name || 'MISSING'}'`);

      // invoice_number
      fieldsAcc.invoice_number.total++;
      const numMatch = ext ? this.normalizeString(ext.invoice_number) === this.normalizeString(expected.invoice_number) : false;
      fieldMatches.invoice_number = numMatch;
      if (numMatch) fieldsAcc.invoice_number.matched++;
      else discrepancies.push(`Invoice Number: expected '${expected.invoice_number}', got '${ext?.invoice_number || 'MISSING'}'`);

      // invoice_date
      fieldsAcc.invoice_date.total++;
      const dateMatch = ext ? this.normalizeDate(ext.invoice_date) === this.normalizeDate(expected.invoice_date) : false;
      fieldMatches.invoice_date = dateMatch;
      if (dateMatch) fieldsAcc.invoice_date.matched++;
      else discrepancies.push(`Invoice Date: expected '${expected.invoice_date}', got '${ext?.invoice_date || 'MISSING'}'`);

      // currency
      fieldsAcc.currency.total++;
      const curMatch = ext ? this.normalizeString(ext.currency) === this.normalizeString(expected.currency) : false;
      fieldMatches.currency = curMatch;
      if (curMatch) fieldsAcc.currency.matched++;
      else discrepancies.push(`Currency: expected '${expected.currency}', got '${ext?.currency || 'MISSING'}'`);

      // subtotal
      fieldsAcc.subtotal.total++;
      const subMatch = ext ? this.compareNumeric(ext.subtotal, expected.subtotal) : false;
      fieldMatches.subtotal = subMatch;
      if (subMatch) fieldsAcc.subtotal.matched++;
      else discrepancies.push(`Subtotal: expected ${expected.subtotal}, got ${ext?.subtotal ?? 'MISSING'}`);

      // tax
      fieldsAcc.tax.total++;
      const taxMatch = ext ? this.compareNumeric(ext.tax, expected.tax) : false;
      fieldMatches.tax = taxMatch;
      if (taxMatch) fieldsAcc.tax.matched++;
      else discrepancies.push(`Tax: expected ${expected.tax}, got ${ext?.tax ?? 'MISSING'}`);

      // total
      fieldsAcc.total.total++;
      const totMatch = ext ? this.compareNumeric(ext.total, expected.total) : false;
      fieldMatches.total = totMatch;
      if (totMatch) fieldsAcc.total.matched++;
      else discrepancies.push(`Total: expected ${expected.total}, got ${ext?.total ?? 'MISSING'}`);

      // line_items
      fieldsAcc.line_items.total++;
      let lineItemsMatch = false;
      if (ext && Array.isArray(ext.line_items) && expected.line_items) {
        if (ext.line_items.length === expected.line_items.length) {
          lineItemsMatch = ext.line_items.every((item) => {
            return expected.line_items!.some(expItem => 
              this.normalizeString(item.description).includes(this.normalizeString(expItem.description).slice(0, 8)) &&
              this.compareNumeric(item.amount, expItem.amount)
            );
          });
        }
      } else if (ext && Array.isArray(ext.line_items) && ext.line_items.length > 0 && !expected.line_items) {
        lineItemsMatch = true;
      }
      fieldMatches.line_items = lineItemsMatch;
      if (lineItemsMatch) fieldsAcc.line_items.matched++;
      else discrepancies.push(`Line Items: expected items count ${expected.line_items?.length || 'N/A'}, got ${ext?.line_items?.length || 0}`);

      // validation status
      const expectedStatus = expected.expected_validation_status || 'PASS';
      fieldsAcc.validation_status.total++;
      const statusMatch = item.validationStatus === expectedStatus;
      fieldMatches.validation_status = statusMatch;
      if (statusMatch) fieldsAcc.validation_status.matched++;
      else discrepancies.push(`Validation Status: expected '${expectedStatus}', got '${item.validationStatus}'`);

      Object.values(fieldMatches).forEach(m => {
        totalChecks++;
        if (m) totalMatches++;
      });

      invoiceReports.push({
        filename: item.filename,
        extracted: ext,
        expected,
        field_matches: fieldMatches,
        discrepancies,
        validation_passed: item.validationStatus === 'PASS',
        expected_validation_passed: expectedStatus === 'PASS'
      });
    }

    // Compute percentages
    for (const key of Object.keys(fieldsAcc) as (keyof typeof fieldsAcc)[]) {
      const f = fieldsAcc[key];
      f.accuracy_percentage = f.total > 0 ? Math.round((f.matched / f.total) * 1000) / 10 : 0;
    }

    return {
      timestamp: new Date().toISOString(),
      total_invoices_tested: invoiceReports.length,
      overall_field_accuracy: totalChecks > 0 ? Math.round((totalMatches / totalChecks) * 1000) / 10 : 0,
      fields: fieldsAcc,
      invoices: invoiceReports
    };
  }
}
