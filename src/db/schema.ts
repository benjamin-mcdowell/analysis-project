import { DailyHoursDto, EmployeeLevel } from '../types';

/**
 * Represents the `employees` table.
 * One row per unique employee — canonical identity, level, and trade.
 */
export interface DbEmployee {
  employee_id: number;
  employee_name: string;
  level: EmployeeLevel;
  occupation: string;
}

/**
 * Represents the `payroll_entries` table.
 * One row per employee per week — hours worked and applicable pay rates.
 * Joins to DbEmployee via employee_id.
 * Derived totals (total_st_hours, total_ot_hours, weekly_gross) are computed
 * at query time, not stored.
 */
export interface DbPayrollEntry {
  employee_id: number;
  week_ending: string; // MM/DD/YYYY
  standard_hours: DailyHoursDto;
  overtime_hours: DailyHoursDto;
  standard_rate: number;
  overtime_rate: number;
  benefits_rate: number;
}
