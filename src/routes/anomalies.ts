import { Router, Request, Response } from 'express';
import { Anomaly, PayrollRecord } from '../types';
import * as repo from '../repositories/payrollRepository';

const router = Router();

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

router.get('/', (_req: Request, res: Response) => {
  if (!repo.isLoaded()) {
    res.status(503).json({ error: 'No data loaded. POST /api/upload first.' });
    return;
  }

  const records = repo.getAll();
  const anomalies: Anomaly[] = [];

  // Build per-employee median standard_rate for rate drift detection
  const byEmployee = new Map<number, PayrollRecord[]>();
  for (const r of records) {
    if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, []);
    byEmployee.get(r.employee_id)!.push(r);
  }

  const medianRates = new Map<number, number>();
  for (const [id, rows] of byEmployee.entries()) {
    medianRates.set(id, median(rows.map((r) => r.standard_rate)));
  }

  for (const r of records) {
    const flag = (anomaly_type: string, detail: string) =>
      anomalies.push({
        employee_name: r.employee_name,
        employee_id: r.employee_id,
        week_ending: r.week_ending,
        anomaly_type,
        detail,
      });

    // 1. Rate drift: standard_rate deviates >20% from employee's median
    const medRate = medianRates.get(r.employee_id)!;
    if (medRate > 0) {
      const drift = Math.abs(r.standard_rate - medRate) / medRate;
      if (drift > 0.2) {
        flag(
          'rate_drift',
          `standard_rate $${r.standard_rate} deviates ${pct(drift)} from personal median $${round(medRate)}`
        );
      }
    }

    // 2. OT multiplier wrong: overtime_rate should be ~1.5x standard_rate (±10%)
    if (r.standard_rate > 0) {
      const expectedOt = r.standard_rate * 1.5;
      const otDrift = Math.abs(r.overtime_rate - expectedOt) / expectedOt;
      if (otDrift > 0.1) {
        flag(
          'ot_multiplier_wrong',
          `overtime_rate $${r.overtime_rate} vs expected ~$${round(expectedOt)} (1.5× standard_rate $${r.standard_rate}); deviation ${pct(otDrift)}`
        );
      }
    }

    // 3. High daily hours: any single day's st+ot > 16
    for (const day of DAYS) {
      const total = r[`${day}_st_hours`] + r[`${day}_ot_hours`];
      if (total > 16) {
        flag(
          'high_daily_hours',
          `${day}: ${total} total hours (${r[`${day}_st_hours`]} st + ${r[`${day}_ot_hours`]} ot) exceeds 16`
        );
      }
    }

    // 4. Zero-hour week with non-zero gross pay
    if (r.total_st_hours === 0 && r.total_ot_hours === 0 && r.weekly_gross > 0) {
      flag(
        'zero_hours_nonzero_pay',
        `weekly_gross $${round(r.weekly_gross)} with 0 recorded hours`
      );
    }

    // 5. Sunday standard hours (construction norm: Sundays should be OT-only)
    if (r.sun_st_hours > 0) {
      flag(
        'sunday_standard_hours',
        `${r.sun_st_hours} standard hours recorded on Sunday — expected OT-only`
      );
    }
  }

  res.json(anomalies);
});

function median(vals: number[]): number {
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default router;
