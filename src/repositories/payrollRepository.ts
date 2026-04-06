import { PayrollRecord, DAYS_OF_WEEK } from '../types';
import { DB_EMPLOYEES, DB_PAYROLL_ENTRIES } from '../db/seed';

/**
 * In-memory override populated when a CSV is uploaded for the current process.
 * null means "use the seed data". Resets to null on every app restart.
 */
let sessionOverride: PayrollRecord[] | null = null;

/** Join the two seed tables and compute derived totals. */
function buildFromSeed(): PayrollRecord[] {
  const employeeMap = new Map(DB_EMPLOYEES.map((e) => [e.employee_id, e]));

  return DB_PAYROLL_ENTRIES.map((entry) => {
    const emp = employeeMap.get(entry.employee_id)!;

    const total_standard_hours = DAYS_OF_WEEK.reduce((s, d) => s + entry.standard_hours[d], 0);
    const total_overtime_hours = DAYS_OF_WEEK.reduce((s, d) => s + entry.overtime_hours[d], 0);
    const weekly_gross =
      total_standard_hours * entry.standard_rate +
      total_overtime_hours * entry.overtime_rate +
      (total_standard_hours + total_overtime_hours) * entry.benefits_rate;

    return {
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      level: emp.level,
      occupation: emp.occupation,
      week_ending: entry.week_ending,
      standard_hours: entry.standard_hours,
      overtime_hours: entry.overtime_hours,
      standard_rate: entry.standard_rate,
      overtime_rate: entry.overtime_rate,
      benefits_rate: entry.benefits_rate,
      total_standard_hours,
      total_overtime_hours,
      weekly_gross,
    };
  });
}

/**
 * Overwrite the in-memory dataset for this application run.
 * Called by the CSV upload route. Data reverts to seed on restart.
 */
export function load(incoming: PayrollRecord[]): void {
  sessionOverride = incoming;
}

/** Return the active dataset: uploaded CSV data if present, otherwise seed data. */
export function getAll(): PayrollRecord[] {
  return sessionOverride ?? buildFromSeed();
}

/** Always true — seed data is always available. */
export function isLoaded(): boolean {
  return true;
}
