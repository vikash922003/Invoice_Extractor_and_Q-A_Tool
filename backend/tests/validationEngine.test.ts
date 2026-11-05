import { describe, it, expect } from 'vitest';
import { FinancialValidationEngine } from '../src/services/validationEngine.js';
import { IExtractedInvoice } from '../src/types/index.js';

describe('FinancialValidationEngine', () => {
  const validInvoice: IExtractedInvoice = {
    vendor_name: 'Acme Cloud Services',
    invoice_number: 'INV-2024-001',
    invoice_date: '2024-05-15',
    currency: 'USD',
    line_items: [
      { description: 'Compute Engine', quantity: 2, unit_price: 100.0, amount: 200.0 },
      { description: 'Cloud Storage', quantity: 1, unit_price: 50.0, amount: 50.0 }
    ],
    subtotal: 250.0,
    tax: 25.0,
    total: 275.0
  };

  it('passes validation for a financially consistent invoice', () => {
    const result = FinancialValidationEngine.validate(validInvoice);
    expect(result.validation_status).toBe('PASS');
    expect(result.validation_errors).toHaveLength(0);
    expect(result.suspicious_fields).toHaveLength(0);
  });

  it('detects Rule A: LINE_ITEMS_SUBTOTAL_MISMATCH', () => {
    const invalidInvoice: IExtractedInvoice = {
      ...validInvoice,
      subtotal: 300.0 // Line items sum is 250.0
    };

    const result = FinancialValidationEngine.validate(invalidInvoice);
    expect(result.validation_status).toBe('FAIL');
    const err = result.validation_errors.find(e => e.code === 'LINE_ITEMS_SUBTOTAL_MISMATCH');
    expect(err).toBeDefined();
    expect(err?.expected).toBe(250.0);
    expect(err?.extracted).toBe(300.0);
    expect(err?.diff).toBe(50.0);
  });

  it('detects Rule B: SUBTOTAL_TAX_TOTAL_MISMATCH', () => {
    const invalidInvoice: IExtractedInvoice = {
      ...validInvoice,
      total: 300.0 // Subtotal (250) + Tax (25) = 275 != 300
    };

    const result = FinancialValidationEngine.validate(invalidInvoice);
    expect(result.validation_status).toBe('FAIL');
    const err = result.validation_errors.find(e => e.code === 'SUBTOTAL_TAX_TOTAL_MISMATCH');
    expect(err).toBeDefined();
    expect(err?.expected).toBe(275.0);
    expect(err?.extracted).toBe(300.0);
    expect(err?.diff).toBe(25.0);
  });

  it('detects Rule C: TAX_COMPONENT_MISMATCH for CGST + SGST', () => {
    // Tax is 25.0, but CGST=10 and SGST=10 -> sum is 20
    const result = FinancialValidationEngine.validate(validInvoice, { cgst: 10, sgst: 10 });
    expect(result.validation_status).toBe('FAIL');
    const err = result.validation_errors.find(e => e.code === 'TAX_COMPONENT_MISMATCH');
    expect(err).toBeDefined();
    expect(err?.expected).toBe(20.0);
    expect(err?.extracted).toBe(25.0);
  });

  it('passes within 0.05 tolerance without IEEE-754 precision errors', () => {
    // 70.1 + 20.2 = 90.3
    const precisionInvoice: IExtractedInvoice = {
      vendor_name: 'Precision Test',
      invoice_number: 'PREC-01',
      invoice_date: '2024-01-01',
      currency: 'INR',
      line_items: [
        { description: 'Part A', quantity: 1, unit_price: 70.1, amount: 70.1 },
        { description: 'Part B', quantity: 1, unit_price: 20.2, amount: 20.2 }
      ],
      subtotal: 90.3,
      tax: 9.03,
      total: 99.33
    };

    const result = FinancialValidationEngine.validate(precisionInvoice);
    expect(result.validation_status).toBe('PASS');
    expect(result.validation_errors).toHaveLength(0);
  });

  it('identifies suspicious line item calculation (quantity * unit_price != amount)', () => {
    const suspiciousInvoice: IExtractedInvoice = {
      ...validInvoice,
      line_items: [
        { description: 'Faulty quantity calc', quantity: 5, unit_price: 10.0, amount: 200.0 }, // 5 * 10 = 50 != 200
        { description: 'Storage', quantity: 1, unit_price: 50.0, amount: 50.0 }
      ]
    };

    const result = FinancialValidationEngine.validate(suspiciousInvoice);
    expect(result.suspicious_fields.length).toBeGreaterThan(0);
    expect(result.suspicious_fields[0].line_item_index).toBe(0);
    expect(result.suspicious_fields[0].reason).toContain('quantity (5) * unit_price (10) = 50.00');
  });
});
