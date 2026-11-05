import { z } from 'zod';

export const LineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required and cannot be empty'),
  quantity: z.number().finite({ message: 'Quantity must be a valid number' }),
  unit_price: z.number().finite({ message: 'Unit price must be a valid number' }),
  amount: z.number().finite({ message: 'Amount must be a valid number' })
}).strict();

export const InvoiceExtractionZodSchema = z.object({
  vendor_name: z.string().trim().min(1, 'Vendor name is required and cannot be empty'),
  invoice_number: z.string().trim().min(1, 'Invoice number is required and cannot be empty'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  currency: z.enum(['INR', 'USD', 'EUR'], {
    errorMap: () => ({ message: 'Currency must be one of INR, USD, or EUR' })
  }),
  line_items: z.array(LineItemSchema).min(1, 'Invoice must contain at least one line item'),
  subtotal: z.number().finite({ message: 'Subtotal must be a valid number' }),
  tax: z.number().finite({ message: 'Tax must be a valid number' }),
  total: z.number().finite({ message: 'Total must be a valid number' })
}).strict();

export type ExtractedInvoicePayload = z.infer<typeof InvoiceExtractionZodSchema>;
