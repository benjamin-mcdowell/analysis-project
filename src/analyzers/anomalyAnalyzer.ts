import { Anomaly, DAYS_OF_WEEK, PayrollRecord } from '../types';
import { median, roundToCents, formatPercent } from '../utils/helpers';

// Adjust these as needed depending on business rules these are just my best guesses
const RATE_DRIFT_THRESHOLD = 0.2;
const OT_MULTIPLIER = 1.5;
const OT_MULTIPLIER_TOLERANCE = 0.1;
const PEER_WAGE_HIGH_THRESHOLD = 0.2;
const PEER_WAGE_LOW_THRESHOLD = 0.2;
const DAILY_STANDARD_HOURS_MAX = 10;
const DAILY_HOURS_MAX = 15;
const DAILY_HOURS_MIN = 4;
const WEEKLY_HOURS_MAX = 50;
const WEEKLY_HOURS_MIN = 30;
const STANDARD_HOURS_FULL_WEEK = 40;

function buildAnomaly(record: PayrollRecord, anomaly_type: string, detail: string): Anomaly {
  const anomaly: Anomaly = {
    employee_name: record.employee_name,
    employee_id: record.employee_id,
    week_ending: record.week_ending,
    anomaly_type,
    detail,
  };
  return anomaly;
}

// standard_rate deviates >20% from the employee's own median across all their weeks
function checkRateDrift(record: PayrollRecord, medianRateByEmployee: Map<number, number>, anomalies: Anomaly[]): void {
  const medianRate = medianRateByEmployee.get(record.employee_id)!;
  if (medianRate <= 0) {
    return;
  }
  const drift = Math.abs(record.standard_rate - medianRate) / medianRate;
  if (drift <= RATE_DRIFT_THRESHOLD) {
    return;
  }
  const anomaly = buildAnomaly(record, 'rate_drift',
    `standard_rate $${record.standard_rate} deviates ${formatPercent(drift)} from personal median $${roundToCents(medianRate)}`);
  anomalies.push(anomaly);
}

// overtime_rate should be ~1.5× standard_rate (±10%)
function checkOtMultiplier(record: PayrollRecord, anomalies: Anomaly[]): void {
  if (record.standard_rate <= 0) {
    return;
  }
  const expected = record.standard_rate * OT_MULTIPLIER;
  const drift = Math.abs(record.overtime_rate - expected) / expected;
  if (drift <= OT_MULTIPLIER_TOLERANCE) {
    return;
  }
  const anomaly = buildAnomaly(record, 'ot_multiplier_wrong',
    `overtime_rate $${record.overtime_rate} vs expected ~$${roundToCents(expected)} (1.5× standard_rate $${record.standard_rate}); deviation ${formatPercent(drift)}`);
  anomalies.push(anomaly);
}

// standard_rate is >20% above the median for peers with the same occupation + level
function checkWageHighVsPeers(record: PayrollRecord, medianRateByPeerGroup: Map<string, number>, anomalies: Anomaly[]): void {
  const peerMedian = medianRateByPeerGroup.get(`${record.occupation}|${record.level}`);
  if (!peerMedian || peerMedian <= 0) {
    return;
  }
  const diff = (record.standard_rate - peerMedian) / peerMedian;
  if (diff <= PEER_WAGE_HIGH_THRESHOLD) {
    return;
  }
  const anomaly = buildAnomaly(record, 'wage_high_vs_peers',
    `standard_rate $${record.standard_rate} is ${formatPercent(diff)} above peer median $${roundToCents(peerMedian)} (${record.occupation} / ${record.level})`);
  anomalies.push(anomaly);
}

// standard_rate is >20% below the median for peers with the same occupation + level
function checkWageLowVsPeers(record: PayrollRecord, medianRateByPeerGroup: Map<string, number>, anomalies: Anomaly[]): void {
  const peerMedian = medianRateByPeerGroup.get(`${record.occupation}|${record.level}`);
  if (!peerMedian || peerMedian <= 0) {
    return;
  }
  const diff = (peerMedian - record.standard_rate) / peerMedian;
  if (diff <= PEER_WAGE_LOW_THRESHOLD) {
    return;
  }
  const anomaly = buildAnomaly(record, 'wage_low_vs_peers',
    `standard_rate $${record.standard_rate} is ${formatPercent(diff)} below peer median $${roundToCents(peerMedian)} (${record.occupation} / ${record.level})`);
  anomalies.push(anomaly);
}

// Any single day has more than 10 standard hours, or more than 15 total (standard + overtime) hours
function checkHighDailyHours(record: PayrollRecord, anomalies: Anomaly[]): void {
  for (const day of DAYS_OF_WEEK) {
    const standardHours = record.standard_hours[day];
    const overtimeHours = record.overtime_hours[day];
    const totalHours = standardHours + overtimeHours;
    if (standardHours > DAILY_STANDARD_HOURS_MAX) {
      const anomaly = buildAnomaly(record, 'high_daily_hours',
        `${day}: ${standardHours} standard hours exceeds ${DAILY_STANDARD_HOURS_MAX}`);
      anomalies.push(anomaly);
    } else if (totalHours > DAILY_HOURS_MAX) {
      const anomaly = buildAnomaly(record, 'high_daily_hours',
        `${day}: ${totalHours} total hours (${standardHours} standard + ${overtimeHours} overtime) exceeds ${DAILY_HOURS_MAX}`);
      anomalies.push(anomaly);
    }
  }
}

// Any day that has hours at all has fewer than 4 total (standard + overtime) hours
function checkLowDailyHours(record: PayrollRecord, anomalies: Anomaly[]): void {
  for (const day of DAYS_OF_WEEK) {
    const standardHours = record.standard_hours[day];
    const overtimeHours = record.overtime_hours[day];
    const totalHours = standardHours + overtimeHours;
    if (totalHours > 0 && totalHours < DAILY_HOURS_MIN) {
      const anomaly = buildAnomaly(record, 'low_daily_hours',
        `${day}: ${totalHours} total hours (${standardHours} standard + ${overtimeHours} overtime) is below ${DAILY_HOURS_MIN}`);
      anomalies.push(anomaly);
    }
  }
}

// Total weekly hours exceed 50
function checkWeeklyHoursHigh(record: PayrollRecord, anomalies: Anomaly[]): void {
  const totalHours = record.total_standard_hours + record.total_overtime_hours;
  if (totalHours <= WEEKLY_HOURS_MAX) {
    return;
  }
  const anomaly = buildAnomaly(record, 'weekly_hours_high',
    `${totalHours} total hours this week exceeds ${WEEKLY_HOURS_MAX}`);
  anomalies.push(anomaly);
}

// Total weekly hours are below 30 (ignores zero-hour weeks — covered by checkZeroHoursNonzeroPay)
function checkWeeklyHoursLow(record: PayrollRecord, anomalies: Anomaly[]): void {
  const totalHours = record.total_standard_hours + record.total_overtime_hours;
  if (totalHours === 0 || totalHours >= WEEKLY_HOURS_MIN) {
    return;
  }
  const anomaly = buildAnomaly(record, 'weekly_hours_low',
    `${totalHours} total hours this week is below ${WEEKLY_HOURS_MIN}`);
  anomalies.push(anomaly);
}

// Zero recorded hours but a non-zero gross pay figure
function checkZeroHoursNonzeroPay(record: PayrollRecord, anomalies: Anomaly[]): void {
  if (record.total_standard_hours !== 0 || record.total_overtime_hours !== 0 || record.weekly_gross <= 0) {
    return;
  }
  const anomaly = buildAnomaly(record, 'zero_hours_nonzero_pay',
    `weekly_gross $${roundToCents(record.weekly_gross)} with 0 recorded hours`);
  anomalies.push(anomaly);
}
// Sunday should be OT-only; standard hours on Sunday are unexpected
function checkSundayStandardHours(record: PayrollRecord, anomalies: Anomaly[]): void {
  const sundayStandardHours = record.standard_hours['sun'];
  if (sundayStandardHours <= 0) {
    return;
  }
  const anomaly = buildAnomaly(record, 'sunday_standard_hours',
    `${sundayStandardHours} standard hours recorded on Sunday — expected OT-only`);
  anomalies.push(anomaly);
}

// OT hours are recorded on weekdays but standard hours for the full week never reached 40.
// Weekend OT (sat/sun) is always expected and is excluded from this check.
function checkOtBeforeStandardComplete(record: PayrollRecord, anomalies: Anomaly[]): void {
  const weekdayOtHours = record.overtime_hours.mon + record.overtime_hours.tue + record.overtime_hours.wed
    + record.overtime_hours.thu + record.overtime_hours.fri;
  if (weekdayOtHours === 0 || record.total_standard_hours >= STANDARD_HOURS_FULL_WEEK) {
    return;
  }
  const anomaly = buildAnomaly(record, 'ot_before_standard_complete',
    `${weekdayOtHours} weekday OT hours recorded but standard hours are only ${record.total_standard_hours} (below ${STANDARD_HOURS_FULL_WEEK})`);
  anomalies.push(anomaly);
}

// Standard hours have reached 40 but no OT hours are recorded
function checkOtMissingAfterStandardComplete(record: PayrollRecord, anomalies: Anomaly[]): void {
  if (record.total_standard_hours < STANDARD_HOURS_FULL_WEEK || record.total_overtime_hours > 0) {
    return;
  }
  const anomaly = buildAnomaly(record, 'ot_missing_after_standard_complete',
    `standard hours are ${record.total_standard_hours} (≥${STANDARD_HOURS_FULL_WEEK}) but no OT hours recorded`);
  anomalies.push(anomaly);
}

export function detectAnomalies(records: PayrollRecord[]): Anomaly[] {
  const recordsByEmployee = new Map<number, PayrollRecord[]>();
  for (const record of records) {
    if (!recordsByEmployee.has(record.employee_id)) {
      recordsByEmployee.set(record.employee_id, []);
    }
    recordsByEmployee.get(record.employee_id)!.push(record);
  }
  const medianRateByEmployee = new Map<number, number>();
  for (const [id, employeeRecords] of recordsByEmployee.entries()) {
    medianRateByEmployee.set(id, median(employeeRecords.map((record) => record.standard_rate)));
  }

  const recordsByPeerGroup = new Map<string, PayrollRecord[]>();
  for (const record of records) {
    const key = `${record.occupation}|${record.level}`;
    if (!recordsByPeerGroup.has(key)) {
      recordsByPeerGroup.set(key, []);
    }
    recordsByPeerGroup.get(key)!.push(record);
  }
  const medianRateByPeerGroup = new Map<string, number>();
  for (const [key, peerRecords] of recordsByPeerGroup.entries()) {
    medianRateByPeerGroup.set(key, median(peerRecords.map((record) => record.standard_rate)));
  }

  const anomalies: Anomaly[] = [];
  for (const record of records) {
    checkRateDrift(record, medianRateByEmployee, anomalies);
    checkOtMultiplier(record, anomalies);
    checkWageHighVsPeers(record, medianRateByPeerGroup, anomalies);
    checkWageLowVsPeers(record, medianRateByPeerGroup, anomalies);
    checkHighDailyHours(record, anomalies);
    checkLowDailyHours(record, anomalies);
    checkWeeklyHoursHigh(record, anomalies);
    checkWeeklyHoursLow(record, anomalies);
    checkZeroHoursNonzeroPay(record, anomalies);
    checkSundayStandardHours(record, anomalies);
    // checkOtBeforeStandardComplete(record, anomalies);
    checkOtMissingAfterStandardComplete(record, anomalies);
  }

  return anomalies;
}
