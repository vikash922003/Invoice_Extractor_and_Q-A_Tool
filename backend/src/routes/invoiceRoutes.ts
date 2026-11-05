import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController.js';

export const invoiceRoutes = Router();
const controller = new InvoiceController();

invoiceRoutes.get('/stats', controller.getStats);
invoiceRoutes.get('/filters', controller.getFilters);
invoiceRoutes.get('/', controller.getInvoices);
invoiceRoutes.get('/:id', controller.getInvoiceById);
