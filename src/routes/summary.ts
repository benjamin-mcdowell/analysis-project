import { Router, Request, Response } from 'express';
import * as repo from '../repositories/payrollRepository';
import { roundToCents } from '../utils/helpers';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  if (!repo.isLoaded()) {
    res.status(503).json({ error: 'No data loaded. POST /api/upload first.' });
    return;
  }

  const records = repo.getAll();

  const uniqueEmployees = new Set(records.map((record) => record.employee_id)).size;
  const weeks = [...new Set(records.map((record) => record.week_ending))].sort();
  const totalPayroll = records.reduce((sum, record) => sum + record.weekly_gross, 0);

  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const avgStandardRate = average(records.map((record) => record.standard_rate));
  const avgOvertimeRate = average(records.map((record) => record.overtime_rate));
  const avgBenefitsRate = average(records.map((record) => record.benefits_rate));

  const apprenticeHours = records
    .filter((record) => record.level === 'APPRENTICE')
    .reduce((sum, record) => sum + record.total_standard_hours + record.total_overtime_hours, 0);
  const totalHours = records.reduce((sum, record) => sum + record.total_standard_hours + record.total_overtime_hours, 0);
  const apprenticeHourPct = totalHours > 0 ? (apprenticeHours / totalHours) * 100 : 0;

  const grossPayByOccupation: Record<string, number> = {};
  for (const record of records) {
    grossPayByOccupation[record.occupation] = (grossPayByOccupation[record.occupation] ?? 0) + record.weekly_gross;
  }

  res.json({
    unique_employees: uniqueEmployees,
    weeks,
    total_payroll: roundToCents(totalPayroll),
    avg_standard_rate: roundToCents(avgStandardRate),
    avg_overtime_rate: roundToCents(avgOvertimeRate),
    avg_benefits_rate: roundToCents(avgBenefitsRate),
    apprentice_hour_pct: roundToCents(apprenticeHourPct),
    by_occupation: Object.fromEntries(
      Object.entries(grossPayByOccupation).map(([occupation, gross]) => [occupation, roundToCents(gross)])
    ),
  });
});

export default router;
