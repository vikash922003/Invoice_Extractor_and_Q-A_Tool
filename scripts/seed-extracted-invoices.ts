import mongoose from 'mongoose';
import path from 'path';
import { DocumentModel, InvoiceModel, InvoiceLineItemModel } from '../backend/src/models/index.js';
import { FinancialValidationEngine } from '../backend/src/services/validationEngine.js';
import { config } from '../backend/src/config/index.js';

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB for seeding extracted invoices...');

  const docs = await DocumentModel.find();
  for (const doc of docs) {
    if (!doc.extracted_raw_text) continue;

    // Parse fields from text
    const text = doc.extracted_raw_text;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let vendor = 'Vendor';
    let invoiceNumber = 'INV-001';
    let date = '2024-08-01';
    let currency: any = 'USD';
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    const lineItems: any[] = [];

    for (const line of lines) {
      if (line.startsWith('VENDOR:')) vendor = line.replace('VENDOR:', '').trim();
      if (line.startsWith('INVOICE:')) invoiceNumber = line.replace('INVOICE:', '').trim();
      if (line.startsWith('DATE:')) date = line.replace('DATE:', '').trim();
      if (line.startsWith('CURRENCY:')) currency = line.replace('CURRENCY:', '').trim();
      if (line.startsWith('SUBTOTAL:')) subtotal = parseFloat(line.replace('SUBTOTAL:', '').trim()) || 0;
      if (line.startsWith('TAX:')) tax = parseFloat(line.replace('TAX:', '').trim()) || 0;
      if (line.startsWith('TOTAL:')) total = parseFloat(line.replace('TOTAL:', '').trim()) || 0;

      if (line.includes('| Qty:')) {
        const parts = line.split('|').map(p => p.trim());
        const desc = parts[0] || 'Item';
        const qty = parseFloat((parts[1] || '').replace('Qty:', '').trim()) || 1;
        const price = parseFloat((parts[2] || '').replace('Price:', '').trim()) || 0;
        const amount = parseFloat((parts[3] || '').replace('Amount:', '').trim()) || (qty * price);
        lineItems.push({ description: desc, quantity: qty, unit_price: price, amount });
      }
    }

    const payload = {
      vendor_name: vendor,
      invoice_number: invoiceNumber,
      invoice_date: date,
      currency,
      subtotal,
      tax,
      total,
      line_items: lineItems.length > 0 ? lineItems : [
        { description: 'Extracted Service', quantity: 1, unit_price: subtotal, amount: subtotal }
      ]
    };

    const valResult = FinancialValidationEngine.validate(payload);

    let invoice = await InvoiceModel.findOne({ document_id: doc._id });
    if (!invoice) {
      invoice = new InvoiceModel({ document_id: doc._id });
    }

    invoice.vendor_name = payload.vendor_name;
    invoice.invoice_number = payload.invoice_number;
    invoice.invoice_date = payload.invoice_date;
    invoice.invoice_date_parsed = new Date(payload.invoice_date);
    invoice.currency = payload.currency;
    invoice.subtotal = payload.subtotal;
    invoice.tax = payload.tax;
    invoice.total = payload.total;
    invoice.has_tax_line = payload.tax > 0;
    invoice.validation_status = valResult.validation_status;
    invoice.validation_errors = valResult.validation_errors;
    invoice.suspicious_fields = valResult.suspicious_fields;
    invoice.validation_timestamp = valResult.validation_timestamp;
    await invoice.save();

    await InvoiceLineItemModel.deleteMany({ invoice_id: invoice._id });
    await InvoiceLineItemModel.insertMany(
      payload.line_items.map(li => ({
        invoice_id: invoice!._id,
        ...li
      }))
    );

    doc.processing_status = valResult.validation_status === 'PASS' ? 'EXTRACTED' : 'VALIDATION_FAILED';
    doc.processed_at = new Date();
    await doc.save();

    console.log(`Successfully populated invoice for doc: ${doc.original_filename} (${doc.processing_status})`);
  }

  await mongoose.disconnect();
  console.log('Seeding completed.');
}

seed().catch(console.error);
