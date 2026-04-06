export interface PayrollRecord {
  employee_name: string;
  employee_id: number;
  level: 'APPRENTICE' | 'JOURNEYWORKER';
  occupation: string;
  week_ending: string;

  // Standard hours per day
  mon_st_hours: number;
  tue_st_hours: number;
  wed_st_hours: number;
  thu_st_hours: number;
  fri_st_hours: number;
  sat_st_hours: number;
  sun_st_hours: number;

  // Overtime hours per day
  mon_ot_hours: number;
  tue_ot_hours: number;
  wed_ot_hours: number;
  thu_ot_hours: number;
  fri_ot_hours: number;
  sat_ot_hours: number;
  sun_ot_hours: number;

  standard_rate: number;
  overtime_rate: number;
  benefits_rate: number;

  // Derived fields (computed on parse)
  total_st_hours: number;
  total_ot_hours: number;
  weekly_gross: number;
}

export interface Anomaly {
  employee_name: string;
  employee_id: number;
  week_ending: string;
  anomaly_type: string;
  detail: string;
}
