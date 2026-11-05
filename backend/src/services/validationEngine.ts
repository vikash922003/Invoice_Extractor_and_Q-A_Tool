import BigNumber from 'bignumber.js';
import { IExtractedInvoice, IFinancialValidationResult, IValidationError, ISuspiciousField } from '../types/index.js';
import { config } from '../config/index.js';

export class FinancialValidationEngine {
  private static readonly TOLERANCE = new BigNumber(config.tolerance || 0.05);

  /**
   * Validates financial integrity of extracted invoice data using decimal-safe arithmetic
   */
  public static validate(
    invoice: IExtractedInvoice, 
    taxComponents?: { cgst?: number | null; sgst?: number | null }
  ): IFinancialValidationResult {
    const errors: IValidationError[] = [];
    const suspiciousFields: ISuspiciousField[] = [];

    // Ensure BigNumber handles null/undefined/NaN safely
    const subtotal = new BigNumber(invoice.subtotal ?? NaN);
    const tax = new BigNumber(invoice.tax ?? NaN);
    const total = new BigNumber(invoice.total ?? NaN);

    if (subtotal.isNaN()) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: 'subtotal',
        message: 'Subtotal is missing or invalid numeric value'
      });
    }

    if (tax.isNaN()) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: 'tax',
        message: 'Tax is missing or invalid numeric value'
      });
    }

    if (total.isNaN()) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: 'total',
        message: 'Total is missing or invalid numeric value'
      });
    }

    // Rule A: Line items amount sum vs Subtotal
    let lineItemsSum = new BigNumber(0);
    if (Array.isArray(invoice.line_items) && invoice.line_items.length > 0) {
      invoice.line_items.forEach((item, index) => {
        const itemAmount = new BigNumber(item.amount ?? NaN);
        const qty = new BigNumber(item.quantity ?? NaN);
        const price = new BigNumber(item.unit_price ?? NaN);

        if (itemAmount.isNaN()) {
          errors.push({
            code: 'INVALID_LINE_ITEM_AMOUNT',
            field: `line_items[${index}].amount`,
            message: `Line item #${index + 1} amount is invalid`
          });
        } else {
          lineItemsSum = lineItemsSum.plus(itemAmount);
        }

        // Suspicious check: quantity * unit_price == amount
        if (!qty.isNaN() && !price.isNaN() && !itemAmount.isNaN()) {
          const expectedItemAmount = qty.times(price);
          const itemDiff = expectedItemAmount.minus(itemAmount).abs();
          if (itemDiff.isGreaterThan(this.TOLERANCE)) {
            suspiciousFields.push({
              field: `line_items[${index}]`,
              line_item_index: index,
              reason: `Line item quantity (${qty.toNumber()}) * unit_price (${price.toNumber()}) = ${expectedItemAmount.toFixed(2)}, but extracted amount is ${itemAmount.toFixed(2)} (diff: ${itemDiff.toFixed(2)})`,
              severity: 'WARNING'
            });
          }
        }
      });

      if (!subtotal.isNaN()) {
        const lineItemDiff = lineItemsSum.minus(subtotal).abs();
        if (lineItemDiff.isGreaterThan(this.TOLERANCE)) {
          errors.push({
            code: 'LINE_ITEMS_SUBTOTAL_MISMATCH',
            field: 'subtotal',
            expected: lineItemsSum.decimalPlaces(2).toNumber(),
            extracted: subtotal.decimalPlaces(2).toNumber(),
            diff: lineItemDiff.decimalPlaces(2).toNumber(),
            message: `Sum of line items (${lineItemsSum.toFixed(2)}) does not match subtotal (${subtotal.toFixed(2)}). Difference: ${lineItemDiff.toFixed(2)} exceeds tolerance of ${this.TOLERANCE.toString()}`
          });
        }
      }
    } else {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: 'line_items',
        message: 'Invoice must contain at least one line item'
      });
    }

    // Rule B: Invoice total (subtotal + tax vs total)
    if (!subtotal.isNaN() && !tax.isNaN() && !total.isNaN()) {
      const expectedTotal = subtotal.plus(tax);
      const totalDiff = expectedTotal.minus(total).abs();
      if (totalDiff.isGreaterThan(this.TOLERANCE)) {
        errors.push({
          code: 'SUBTOTAL_TAX_TOTAL_MISMATCH',
          field: 'total',
          expected: expectedTotal.decimalPlaces(2).toNumber(),
          extracted: total.decimalPlaces(2).toNumber(),
          diff: totalDiff.decimalPlaces(2).toNumber(),
          message: `Subtotal (${subtotal.toFixed(2)}) + Tax (${tax.toFixed(2)}) = ${expectedTotal.toFixed(2)}, which does not match total (${total.toFixed(2)}). Difference: ${totalDiff.toFixed(2)} exceeds tolerance of ${this.TOLERANCE.toString()}`
        });
      }
    }

    // Rule C: CGST + SGST check when present
    if (taxComponents && taxComponents.cgst !== undefined && taxComponents.cgst !== null &&
        taxComponents.sgst !== undefined && taxComponents.sgst !== null) {
      const cgst = new BigNumber(taxComponents.cgst);
      const sgst = new BigNumber(taxComponents.sgst);
      const expectedTax = cgst.plus(sgst);
      const taxDiff = expectedTax.minus(tax).abs();

      if (taxDiff.isGreaterThan(this.TOLERANCE)) {
        errors.push({
          code: 'TAX_COMPONENT_MISMATCH',
          field: 'tax',
          expected: expectedTax.decimalPlaces(2).toNumber(),
          extracted: tax.decimalPlaces(2).toNumber(),
          diff: taxDiff.decimalPlaces(2).toNumber(),
          message: `CGST (${cgst.toFixed(2)}) + SGST (${sgst.toFixed(2)}) = ${expectedTax.toFixed(2)}, which does not match extracted tax (${tax.toFixed(2)}). Difference: ${taxDiff.toFixed(2)}`
        });
      }
    }

    // Check currency validity
    if (!['INR', 'USD', 'EUR'].includes(invoice.currency)) {
      errors.push({
        code: 'INVALID_CURRENCY',
        field: 'currency',
        extracted: invoice.currency,
        message: `Unsupported currency '${invoice.currency}'. Supported currencies: INR, USD, EUR`
      });
    }

    // Check date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoice_date)) {
      errors.push({
        code: 'INVALID_DATE',
        field: 'invoice_date',
        extracted: invoice.invoice_date,
        message: `Invalid date format '${invoice.invoice_date}'. Expected YYYY-MM-DD`
      });
    } else {
      const parsedDate = new Date(invoice.invoice_date);
      if (isNaN(parsedDate.getTime())) {
        errors.push({
          code: 'INVALID_DATE',
          field: 'invoice_date',
          extracted: invoice.invoice_date,
          message: `Date '${invoice.invoice_date}' cannot be parsed into a calendar date`
        });
      }
    }

    return {
      validation_status: errors.length === 0 ? 'PASS' : 'FAIL',
      validation_errors: errors,
      suspicious_fields: suspiciousFields,
      validation_timestamp: new Date()
    };
  }
}
