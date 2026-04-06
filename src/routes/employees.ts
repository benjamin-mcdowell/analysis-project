import { Router, Request, Response } from 'express';
import { DAYS_OF_WEEK, PayrollRecord } from '../types';
import * as repo from '../repositories/payrollRepository';
import { roundToCents, aggregateStats } from '../utils/helpers';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  if (!repo.isLoaded()) {
    res.status(503).json({ error: 'No data loaded. POST /api/upload first.' });
    return;
  }

  const records = repo.getAll();

  // Group by employee_id
  const recordsByEmployee = new Map<number, PayrollRecord[]>();
  for (const record of records) {
    if (!recordsByEmployee.has(record.employee_id)) recordsByEmployee.set(record.employee_id, []);
    recordsByEmployee.get(record.employee_id)!.push(record);
  }

  const result = [...recordsByEmployee.entries()].map(([id, employeeRecords]) => {
    const first = employeeRecords[0];

    // Collect all individual daily standard and OT hour values
    const allDailyStandardHours = employeeRecords.flatMap((record) =>
      DAYS_OF_WEEK.map((day) => record.standard_hours[day])
    );
    const allDailyOvertimeHours = employeeRecords.flatMap((record) =>
      DAYS_OF_WEEK.map((day) => record.overtime_hours[day])
    );

    return {
      employee_id: id,
      employee_name: first.employee_name,
      level: first.level,
      occupation: first.occupation,
      weeks_worked: employeeRecords.length,
      total_gross_pay: roundToCents(employeeRecords.reduce((sum, record) => sum + record.weekly_gross, 0)),
      daily_standard_hours: aggregateStats(allDailyStandardHours),
      daily_overtime_hours: aggregateStats(allDailyOvertimeHours),
      standard_rate: aggregateStats(employeeRecords.map((record) => record.standard_rate)),
      overtime_rate: aggregateStats(employeeRecords.map((record) => record.overtime_rate)),
      benefits_rate: aggregateStats(employeeRecords.map((record) => record.benefits_rate)),
    };
  });

  res.json(result);
});

export default router;
