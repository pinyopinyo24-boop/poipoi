import { Phase3ApprovalValidator } from "./Phase3ApprovalValidator";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Phase3ApprovalRecord } from "./Phase3ApprovalHistory";

export class Phase3ApprovalStore {
  constructor(
    private readonly root: string,
    private readonly filename = "data/phase3-approvals.json"
  ) {}

  private get filePath(): string {
    return path.join(this.root, this.filename);
  }

  async load(): Promise<Phase3ApprovalRecord[]> {
    try {
      const content = await readFile(this.filePath, "utf8");
      const data: unknown = JSON.parse(content);

      if (!Array.isArray(data)) {
        throw new Error("承認履歴の形式が不正です");
      }

      return data as Phase3ApprovalRecord[];
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return [];
      }
      throw error;
    }
  }

  async append(record: Phase3ApprovalRecord): Promise<void> {
    const records = await this.load();
    Phase3ApprovalValidator.ensureUnique(records, record);
    records.push({ ...record });

    await mkdir(path.dirname(this.filePath), {
      recursive: true
    });

    await writeFile(
      this.filePath,
      JSON.stringify(records, null, 2),
      "utf8"
    );
  }

  async getLatest(
    targetPath: string
  ): Promise<Phase3ApprovalRecord | null> {
    const records = await this.load();
    const matches = records.filter(
      record => record.targetPath === targetPath
    );

    return matches.length
      ? matches[matches.length - 1]
      : null;
  }
}
