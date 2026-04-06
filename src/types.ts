export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const DAYS_OF_WEEK: readonly DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type EmployeeLevel = 'APPRENTICE' | 'JOURNEYWORKER';

export interface DailyHoursDto {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface EmployeeDto {
  employee_id: number;
  employee_name: string;
  level: EmployeeLevel;
  occupation: string;
}

export interface PayrollEntryDto {
  employee_id: number;
  week_ending: string;
  standard_hours: DailyHoursDto;
  overtime_hours: DailyHoursDto;
  standard_rate: number;
  overtime_rate: number;
  benefits_rate: number;
}

// Joined view: employee + payroll entry + computed totals — used by API routes
export interface PayrollRecord extends EmployeeDto, PayrollEntryDto {
  total_standard_hours: number;
  total_overtime_hours: number;
  weekly_gross: number;
}

export interface Anomaly {
  employee_name: string;
  employee_id: number;
  week_ending: string;
  anomaly_type: string;
  detail: string;
}
