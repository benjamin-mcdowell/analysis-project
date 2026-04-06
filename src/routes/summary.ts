import { Router, Request, Response } from 'express';
import * as repo from '../repositories/payrollRepository';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  if (!repo.isLoaded()) {
    res.status(503).json({ error: 'No data loaded. POST /api/upload first.' });
    return;
  }

  const records = repo.getAll();

  const uniqueEmployees = new Set(records.map((r) => r.employee_id)).size;
  const weeks = [...new Set(records.map((r) => r.week_ending))].sort();
  const totalPayroll = records.reduce((s, r) => s + r.weekly_gross, 0);

  const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;

  const avgStandardRate = avg(records.map((r) => r.standard_rate));
  const avgOvertimeRate = avg(records.map((r) => r.overtime_rate));
  const avgBenefitsRate = avg(records.map((r) => r.benefits_rate));

  const apprenticeHours = records
    .filter((r) => r.level === 'APPRENTICE')
    .reduce((s, r) => s + r.total_st_hours + r.total_ot_hours, 0);
  const totalHours = records.reduce((s, r) => s + r.total_st_hours + r.total_ot_hours, 0);
  const apprenticeHourPct = totalHours > 0 ? (apprenticeHours / totalHours) * 100 : 0;

  const byOccupation: Record<string, number> = {};
  for (const r of records) {
    byOccupation[r.occupation] = (byOccupation[r.occupation] ?? 0) + r.weekly_gross;
  }

  res.json({
    unique_employees: uniqueEmployees,
    weeks,
    total_payroll: round(totalPayroll),
    avg_standard_rate: round(avgStandardRate),
    avg_overtime_rate: round(avgOvertimeRate),
    avg_benefits_rate: round(avgBenefitsRate),
    apprentice_hour_pct: round(apprenticeHourPct),
    by_occupation: Object.fromEntries(
      Object.entries(byOccupation).map(([k, v]) => [k, round(v)])
    ),
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export default router;
