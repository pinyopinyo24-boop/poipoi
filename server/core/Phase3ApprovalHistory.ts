export type Phase3ApprovalStatus =
  | "approved"
  | "rejected"
  | "pending";

export interface Phase3ApprovalRecord {
  id: string;
  targetPath: string;
  status: Phase3ApprovalStatus;
  timestamp: string;
  reason?: string;
}

export class Phase3ApprovalHistory {
  private records: Phase3ApprovalRecord[] = [];

  add(record: Phase3ApprovalRecord): void {
    this.records.push({ ...record });
  }

  getAll(): Phase3ApprovalRecord[] {
    return this.records.map(record => ({ ...record }));
  }

  getByTarget(targetPath: string): Phase3ApprovalRecord[] {
    return this.records
      .filter(record => record.targetPath === targetPath)
      .map(record => ({ ...record }));
  }

  getLatest(targetPath: string): Phase3ApprovalRecord | null {
    const matches = this.getByTarget(targetPath);
    return matches.length > 0
      ? matches[matches.length - 1]
      : null;
  }

  clear(): void {
    this.records = [];
  }
}
