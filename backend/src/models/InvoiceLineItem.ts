import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IInvoiceLineItemModel extends MongooseDocument {
  invoice_id: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItemModel>({
  invoice_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Invoice', 
    required: true, 
    index: true 
  },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  amount: { type: Number, required: true }
});

InvoiceLineItemSchema.index({ invoice_id: 1, amount: -1 });

export const InvoiceLineItemModel = mongoose.model<IInvoiceLineItemModel>('InvoiceLineItem', InvoiceLineItemSchema);
