import { parse as csvParse } from 'csv-parse/sync';
import { DailyHoursDto, DAYS_OF_WEEK, PayrollRecord } from '../types';

export function parsePayrollCsv(buffer: Buffer): PayrollRecord[] {
  const rows = csvParse(buffer, {
    columns: true,
    cast: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  return rows.map((row, rowIndex) => {
    const rawRow = row as Record<string, number | string>;

    const parseNumber = (key: string): number => {
      const value = Number(rawRow[key]);
      if (isNaN(value)) throw new Error(`Row ${rowIndex + 2}: "${key}" is not a number (got "${rawRow[key]}")`);
      return value;
    };

    const standardHours: DailyHoursDto = {
      mon: parseNumber('mon_st_hours'),
      tue: parseNumber('tue_st_hours'),
      wed: parseNumber('wed_st_hours'),
      thu: parseNumber('thu_st_hours'),
      fri: parseNumber('fri_st_hours'),
      sat: parseNumber('sat_st_hours'),
      sun: parseNumber('sun_st_hours'),
    };

    const overtimeHours: DailyHoursDto = {
      mon: parseNumber('mon_ot_hours'),
      tue: parseNumber('tue_ot_hours'),
      wed: parseNumber('wed_ot_hours'),
      thu: parseNumber('thu_ot_hours'),
      fri: parseNumber('fri_ot_hours'),
      sat: parseNumber('sat_ot_hours'),
      sun: parseNumber('sun_ot_hours'),
    };

    const totalStandardHours = DAYS_OF_WEEK.reduce((sum, day) => sum + standardHours[day], 0);
    const totalOvertimeHours = DAYS_OF_WEEK.reduce((sum, day) => sum + overtimeHours[day], 0);
    const standardRate = parseNumber('standard_rate');
    const overtimeRate = parseNumber('overtime_rate');
    const benefitsRate = parseNumber('benefits_rate');
    const weeklyGross =
      totalStandardHours * standardRate +
      totalOvertimeHours * overtimeRate +
      (totalStandardHours + totalOvertimeHours) * benefitsRate;

    const record: PayrollRecord = {
      employee_name: String(rawRow['employee_name']),
      employee_id: parseNumber('employee_id'),
      level: String(rawRow['level']) as PayrollRecord['level'],
      occupation: String(rawRow['occupation']),
      week_ending: String(rawRow['week_ending']),
      standard_hours: standardHours,
      overtime_hours: overtimeHours,
      standard_rate: standardRate,
      overtime_rate: overtimeRate,
      benefits_rate: benefitsRate,
      total_standard_hours: totalStandardHours,
      total_overtime_hours: totalOvertimeHours,
      weekly_gross: weeklyGross,
    };

    return record;
  });
}
