import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { EvaluationService } from '../services/evaluationService.js';
import { ExtractionService } from '../services/extractionService.js';

export class EvaluationController {
  private static getReportPaths(): string[] {
    return [
      path.resolve(process.cwd(), 'evaluation-report.json'),
      path.resolve(process.cwd(), '..', 'evaluation-report.json'),
      path.resolve(process.cwd(), 'backend', 'evaluation-report.json')
    ];
  }

  private static getFixturesDir(): string {
    const candidates = [
      path.resolve(process.cwd(), 'fixtures'),
      path.resolve(process.cwd(), '..', 'fixtures')
    ];
    for (const dir of candidates) {
      if (fsSync.existsSync(dir)) return dir;
    }
    return candidates[0];
  }

  public getReport = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const candidates = EvaluationController.getReportPaths();
      for (const p of candidates) {
        try {
          const raw = await fs.readFile(p, 'utf-8');
          const report = JSON.parse(raw);
          return res.status(200).json({
            success: true,
            data: report
          });
        } catch {
          // try next
        }
      }

      return res.status(200).json({
        success: true,
        data: null,
        message: 'No evaluation report generated yet. Run npm run evaluate:extraction or POST /api/v1/evaluation/run'
      });
    } catch (err) {
      next(err);
    }
  };

  public runEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fixturesDir = EvaluationController.getFixturesDir();
      const groundTruthFile = path.join(fixturesDir, 'expected_values.json');

      let groundTruth: any[] = [];
      try {
        const truthRaw = await fs.readFile(groundTruthFile, 'utf-8');
        groundTruth = JSON.parse(truthRaw);
      } catch {
        return res.status(404).json({
          success: false,
          error_code: 'FIXTURES_NOT_FOUND',
          message: `Ground truth file expected_values.json not found at ${groundTruthFile}`
        });
      }

      const extractionService = new ExtractionService();
      const extractions: any[] = [];

      for (const item of groundTruth) {
        const filePath = path.join(fixturesDir, 'invoices', item.filename);
        try {
          const fileBuffer = await fs.readFile(filePath);
          const ext = path.extname(item.filename).toLowerCase();
          const mimeType = ext === '.pdf' ? 'application/pdf' : 'image/png';

          const docInput = {
            filename: item.filename,
            mimeType,
            buffer: fileBuffer
          };

          const result = await extractionService.getProvider().extractInvoice(docInput);
          extractions.push({
            filename: item.filename,
            extracted: result.parsed,
            validationStatus: 'PASS' // will be tested by evaluator
          });
        } catch (fileErr: any) {
          extractions.push({
            filename: item.filename,
            extracted: null,
            validationStatus: 'FAIL',
            error: fileErr.message
          });
        }
      }

      const report = EvaluationService.evaluateDataset(extractions, groundTruth);
      const writePath = path.resolve(process.cwd(), 'evaluation-report.json');
      await fs.writeFile(writePath, JSON.stringify(report, null, 2));

      return res.status(200).json({
        success: true,
        message: 'Evaluation completed successfully',
        data: report
      });
    } catch (err) {
      next(err);
    }
  };
}
