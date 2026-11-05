import { Router } from 'express';
import { QAController } from '../controllers/qaController.js';

export const qaRoutes = Router();
const controller = new QAController();

qaRoutes.post('/ask', controller.askQuestion);
qaRoutes.get('/history', controller.getHistory);
