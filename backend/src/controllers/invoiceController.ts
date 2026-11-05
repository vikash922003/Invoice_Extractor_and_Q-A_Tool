import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoiceService.js';

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor(invoiceService?: InvoiceService) {
    this.invoiceService = invoiceService || new InvoiceService();
  }

  public getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        vendor,
        invoiceNumber,
        search,
        dateFrom,
        dateTo,
        validationStatus,
        currency,
        sortBy,
        sortOrder,
        page,
        limit
      } = req.query;

      const data = await this.invoiceService.getInvoices({
        vendor: vendor as string,
        invoiceNumber: invoiceNumber as string,
        search: search as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        validationStatus: validationStatus as any,
        currency: currency as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as any,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10
      });

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = await this.invoiceService.getInvoiceById(id);
      if (!data) {
        return res.status(404).json({
          success: false,
          error_code: 'INVOICE_NOT_FOUND',
          message: `Invoice with ID ${id} was not found`
        });
      }

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.invoiceService.getDashboardStats();
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };

  public getFilters = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = await this.invoiceService.getDistinctFilters();
      return res.status(200).json({
        success: true,
        data: filters
      });
    } catch (err) {
      next(err);
    }
  };
}
