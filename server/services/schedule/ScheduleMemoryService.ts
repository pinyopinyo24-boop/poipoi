export interface ScheduleMemoryItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  reminder?: string;
  createdAt: string;
}

class ScheduleMemoryService {
  private schedules: ScheduleMemoryItem[] = [];

  addSchedule(
    item: Omit<ScheduleMemoryItem, "id" | "createdAt">
  ): ScheduleMemoryItem {
    const schedule: ScheduleMemoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.schedules.push(schedule);
    return schedule;
  }

  getSchedules(): ScheduleMemoryItem[] {
    return this.schedules;
  }

  deleteSchedule(id: string): boolean {
    const before = this.schedules.length;

    this.schedules = this.schedules.filter(
      (item) => item.id !== id
    );

    return before !== this.schedules.length;
  }
}

export const scheduleMemoryService =
  new ScheduleMemoryService();