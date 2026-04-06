import { PayrollRecord } from '../types';

let records: PayrollRecord[] = [];

export function load(incoming: PayrollRecord[]): void {
  records = incoming;
}

export function getAll(): PayrollRecord[] {
  return records;
}

export function isLoaded(): boolean {
  return records.length > 0;
}
