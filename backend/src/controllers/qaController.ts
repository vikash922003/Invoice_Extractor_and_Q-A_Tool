import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QAService } from '../services/qaService.js';

const AskQuestionSchema = z.object({
  question: z.string().trim().min(2, 'Question must be at least 2 characters long'),
  invoice_id: z.string().trim().optional()
});

export class QAController {
  private qaService: QAService;

  constructor(qaService?: QAService) {
    this.qaService = qaService || new QAService();
  }

  public askQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = AskQuestionSchema.parse(req.body);
      const answer = await this.qaService.answerQuestion(validated.question, validated.invoice_id);
      return res.status(200).json({
        success: true,
        data: answer
      });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await this.qaService.getHistory();
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  };
}
