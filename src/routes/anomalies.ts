import { Router, Request, Response } from 'express';
import * as repo from '../repositories/payrollRepository';
import { detectAnomalies } from '../analyzers/anomalyAnalyzer';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  if (!repo.isLoaded()) {
    res.status(503).json({ error: 'No data loaded. POST /api/upload first.' });
    return;
  }

  const anomalies = detectAnomalies(repo.getAll());

  if (anomalies.length > 0) {
    res.json(anomalies);
  }
});

export default router;
