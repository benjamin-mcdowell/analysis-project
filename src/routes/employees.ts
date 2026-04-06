import { Router, Request, Response } from 'express';
import { PayrollRecord } from '../types';
import * as repo from '../repositories/payrollRepository';

const router = Router();

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

router.get('/', (_req: Request, res: Response) => {
  if (!repo.isLoaded()) {
    res.status(503).json({ error: 'No data loaded. POST /api/upload first.' });
    return;
  }

  const records = repo.getAll();

  // Group by employee_id
  const byEmployee = new Map<number, PayrollRecord[]>();
  for (const r of records) {
    if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, []);
    byEmployee.get(r.employee_id)!.push(r);
  }

  const result = [...byEmployee.entries()].map(([id, rows]) => {
    const first = rows[0];

    // Collect all individual daily standard and OT hour values
    const dailySt = rows.flatMap((r) => DAYS.map((d) => r[`${d}_st_hours`]));
    const dailyOt = rows.flatMap((r) => DAYS.map((d) => r[`${d}_ot_hours`]));

    return {
      employee_id: id,
      employee_name: first.employee_name,
      level: first.level,
      occupation: first.occupation,
      weeks_worked: rows.length,
      total_gross_pay: round(rows.reduce((s, r) => s + r.weekly_gross, 0)),
      daily_st_hours: aggStats(dailySt),
      daily_ot_hours: aggStats(dailyOt),
      standard_rate: aggStats(rows.map((r) => r.standard_rate)),
      overtime_rate: aggStats(rows.map((r) => r.overtime_rate)),
      benefits_rate: aggStats(rows.map((r) => r.benefits_rate)),
    };
  });

  res.json(result);
});

function aggStats(vals: number[]) {
  const nonZero = vals.filter((v) => v > 0);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  return { min: round(min), max: round(max), avg: round(avg) };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export default router;
