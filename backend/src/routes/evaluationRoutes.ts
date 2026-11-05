import { Router } from 'express';
import { EvaluationController } from '../controllers/evaluationController.js';

export const evaluationRoutes = Router();
const controller = new EvaluationController();

evaluationRoutes.get('/report', controller.getReport);
evaluationRoutes.post('/run', controller.runEvaluation);
