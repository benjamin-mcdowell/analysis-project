import { parse as csvParse } from 'csv-parse/sync';
import { PayrollRecord } from '../types';

const ST_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function parse(buffer: Buffer): PayrollRecord[] {
  const rows = csvParse(buffer, {
    columns: true,
    cast: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  return rows.map((row, i) => {
    const r = row as Record<string, number | string>;
    const num = (key: string): number => {
      const v = Number(r[key]);
      if (isNaN(v)) throw new Error(`Row ${i + 2}: "${key}" is not a number (got "${r[key]}")`);
      return v;
    };

    const total_st_hours = ST_DAYS.reduce((s, d) => s + num(`${d}_st_hours`), 0);
    const total_ot_hours = ST_DAYS.reduce((s, d) => s + num(`${d}_ot_hours`), 0);
    const standard_rate = num('standard_rate');
    const overtime_rate = num('overtime_rate');
    const benefits_rate = num('benefits_rate');
    const weekly_gross =
      total_st_hours * standard_rate +
      total_ot_hours * overtime_rate +
      (total_st_hours + total_ot_hours) * benefits_rate;

    return {
      employee_name: String(r['employee_name']),
      employee_id: num('employee_id'),
      level: String(r['level']) as PayrollRecord['level'],
      occupation: String(r['occupation']),
      week_ending: String(r['week_ending']),
      mon_st_hours: num('mon_st_hours'),
      tue_st_hours: num('tue_st_hours'),
      wed_st_hours: num('wed_st_hours'),
      thu_st_hours: num('thu_st_hours'),
      fri_st_hours: num('fri_st_hours'),
      sat_st_hours: num('sat_st_hours'),
      sun_st_hours: num('sun_st_hours'),
      mon_ot_hours: num('mon_ot_hours'),
      tue_ot_hours: num('tue_ot_hours'),
      wed_ot_hours: num('wed_ot_hours'),
      thu_ot_hours: num('thu_ot_hours'),
      fri_ot_hours: num('fri_ot_hours'),
      sat_ot_hours: num('sat_ot_hours'),
      sun_ot_hours: num('sun_ot_hours'),
      standard_rate,
      overtime_rate,
      benefits_rate,
      total_st_hours,
      total_ot_hours,
      weekly_gross,
    };
  });
}
