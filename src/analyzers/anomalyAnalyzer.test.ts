import { detectAnomalies } from './anomalyAnalyzer';
import { PayrollRecord } from '../types';

function makeRecord(overrides: Partial<PayrollRecord> = {}): PayrollRecord {
  return {
    employee_id: 1,
    employee_name: 'Alice',
    level: 'JOURNEYWORKER',
    occupation: 'Electrician',
    week_ending: '2024-01-07',
    standard_rate: 40,
    overtime_rate: 60,
    benefits_rate: 5,
    standard_hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
    overtime_hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    total_standard_hours: 40,
    total_overtime_hours: 0,
    weekly_gross: 1600,
    ...overrides,
  };
}

describe('detectAnomalies', () => {
  describe('rate_drift', () => {
    it('flags when standard_rate deviates >20% from personal median', () => {
      // Median across three weeks will be $40; week 3 has $50 = 25% drift
      const records = [
        makeRecord({ week_ending: '2024-01-07', standard_rate: 40, overtime_rate: 60 }),
        makeRecord({ week_ending: '2024-01-14', standard_rate: 40, overtime_rate: 60 }),
        makeRecord({ week_ending: '2024-01-21', standard_rate: 50, overtime_rate: 75 }),
      ];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'rate_drift')).toBe(true);
    });

    it('does not flag when standard_rate is within 20% of personal median', () => {
      const records = [
        makeRecord({ week_ending: '2024-01-07', standard_rate: 40 }),
        makeRecord({ week_ending: '2024-01-14', standard_rate: 42 }),
        makeRecord({ week_ending: '2024-01-21', standard_rate: 44 }),
      ];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'rate_drift')).toBe(false);
    });
  });

  describe('ot_multiplier_wrong', () => {
    it('flags when overtime_rate is not ~1.5x standard_rate', () => {
      // OT rate is 2x instead of 1.5x — deviation is 33%
      const records = [makeRecord({ standard_rate: 40, overtime_rate: 80 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'ot_multiplier_wrong')).toBe(true);
    });

    it('does not flag when overtime_rate is within 10% of 1.5x standard_rate', () => {
      // 1.55x = 3.3% deviation, within tolerance
      const records = [makeRecord({ standard_rate: 40, overtime_rate: 62 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'ot_multiplier_wrong')).toBe(false);
    });
  });

  describe('wage_high_vs_peers', () => {
    it('flags when standard_rate is >20% above peer group median', () => {
      const records = [
        makeRecord({ employee_id: 1, standard_rate: 40, overtime_rate: 60 }),
        makeRecord({ employee_id: 2, standard_rate: 40, overtime_rate: 60 }),
        makeRecord({ employee_id: 3, standard_rate: 50, overtime_rate: 75 }), // 25% above median of 40
      ];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'wage_high_vs_peers' && a.employee_id === 3)).toBe(true);
    });

    it('does not flag when standard_rate is within 20% of peer group median', () => {
      const records = [
        makeRecord({ employee_id: 1, standard_rate: 40, overtime_rate: 60 }),
        makeRecord({ employee_id: 2, standard_rate: 40, overtime_rate: 60 }),
        makeRecord({ employee_id: 3, standard_rate: 44, overtime_rate: 66 }), // 10% above
      ];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'wage_high_vs_peers')).toBe(false);
    });
  });

  describe('wage_low_vs_peers', () => {
    it('flags when standard_rate is >20% below peer group median', () => {
      const records = [
        makeRecord({ employee_id: 1, standard_rate: 50, overtime_rate: 75 }),
        makeRecord({ employee_id: 2, standard_rate: 50, overtime_rate: 75 }),
        makeRecord({ employee_id: 3, standard_rate: 38, overtime_rate: 57 }), // 24% below median of 50
      ];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'wage_low_vs_peers' && a.employee_id === 3)).toBe(true);
    });

    it('does not flag when standard_rate is within 20% of peer group median', () => {
      const records = [
        makeRecord({ employee_id: 1, standard_rate: 50, overtime_rate: 75 }),
        makeRecord({ employee_id: 2, standard_rate: 50, overtime_rate: 75 }),
        makeRecord({ employee_id: 3, standard_rate: 45, overtime_rate: 67.5 }), // 10% below
      ];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'wage_low_vs_peers')).toBe(false);
    });
  });

  describe('high_daily_hours', () => {
    it('flags when standard hours on a single day exceed 10', () => {
      const records = [makeRecord({
        standard_hours: { mon: 11, tue: 8, wed: 8, thu: 8, fri: 5, sat: 0, sun: 0 },
        total_standard_hours: 40,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'high_daily_hours' && a.detail.includes('mon'))).toBe(true);
    });

    it('flags when total hours on a single day exceed 15', () => {
      const records = [makeRecord({
        standard_hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
        overtime_hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 8, sat: 0, sun: 0 },
        total_standard_hours: 40,
        total_overtime_hours: 8,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'high_daily_hours' && a.detail.includes('fri'))).toBe(true);
    });

    it('does not flag normal daily hours', () => {
      const records = [makeRecord()];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'high_daily_hours')).toBe(false);
    });
  });

  describe('low_daily_hours', () => {
    it('flags when a worked day has fewer than 4 total hours', () => {
      const records = [makeRecord({
        standard_hours: { mon: 2, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
        total_standard_hours: 34,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'low_daily_hours' && a.detail.includes('mon'))).toBe(true);
    });

    it('does not flag days with zero hours', () => {
      const records = [makeRecord()]; // sat/sun are 0
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'low_daily_hours')).toBe(false);
    });
  });

  describe('weekly_hours_high', () => {
    it('flags when total weekly hours exceed 50', () => {
      const records = [makeRecord({
        total_standard_hours: 40,
        total_overtime_hours: 12,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'weekly_hours_high')).toBe(true);
    });

    it('does not flag when total weekly hours are at or below 50', () => {
      const records = [makeRecord({ total_standard_hours: 40, total_overtime_hours: 10 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'weekly_hours_high')).toBe(false);
    });
  });

  describe('weekly_hours_low', () => {
    it('flags when total weekly hours are below 30 but nonzero', () => {
      const records = [makeRecord({ total_standard_hours: 20, total_overtime_hours: 0 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'weekly_hours_low')).toBe(true);
    });

    it('does not flag zero-hour weeks', () => {
      const records = [makeRecord({
        total_standard_hours: 0,
        total_overtime_hours: 0,
        weekly_gross: 0,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'weekly_hours_low')).toBe(false);
    });

    it('does not flag weeks at or above 30 hours', () => {
      const records = [makeRecord({ total_standard_hours: 30, total_overtime_hours: 0 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'weekly_hours_low')).toBe(false);
    });
  });

  describe('zero_hours_nonzero_pay', () => {
    it('flags when gross pay is nonzero but hours are all zero', () => {
      const records = [makeRecord({
        total_standard_hours: 0,
        total_overtime_hours: 0,
        weekly_gross: 500,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'zero_hours_nonzero_pay')).toBe(true);
    });

    it('does not flag when both hours and pay are zero', () => {
      const records = [makeRecord({
        total_standard_hours: 0,
        total_overtime_hours: 0,
        weekly_gross: 0,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'zero_hours_nonzero_pay')).toBe(false);
    });
  });

  describe('sunday_standard_hours', () => {
    it('flags when standard hours are recorded on Sunday', () => {
      const records = [makeRecord({
        standard_hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 4 },
        total_standard_hours: 44,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'sunday_standard_hours')).toBe(true);
    });

    it('does not flag when Sunday has only overtime hours or zero hours', () => {
      const records = [makeRecord({
        overtime_hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 4 },
        total_overtime_hours: 4,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'sunday_standard_hours')).toBe(false);
    });
  });

  describe('ot_missing_after_standard_complete', () => {
    it('flags when standard hours reach 40 but no overtime is recorded', () => {
      const records = [makeRecord({ total_standard_hours: 40, total_overtime_hours: 0 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'ot_missing_after_standard_complete')).toBe(true);
    });

    it('does not flag when overtime hours are present alongside 40 standard hours', () => {
      const records = [makeRecord({
        standard_hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
        overtime_hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 4, sun: 0 },
        total_standard_hours: 40,
        total_overtime_hours: 4,
      })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'ot_missing_after_standard_complete')).toBe(false);
    });

    it('does not flag when standard hours are below 40', () => {
      const records = [makeRecord({ total_standard_hours: 35, total_overtime_hours: 0 })];
      const anomalies = detectAnomalies(records);
      expect(anomalies.some(a => a.anomaly_type === 'ot_missing_after_standard_complete')).toBe(false);
    });
  });
});
