import { Router } from "express";
import { scheduleMemoryService } from "../services/schedule/ScheduleMemoryService";

const router = Router();

// 予定追加
router.post("/", (req, res) => {
  try {
    const schedule = scheduleMemoryService.addSchedule(req.body);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({
      error: "Failed to add schedule",
    });
  }
});

// 予定一覧
router.get("/", (_req, res) => {
  res.json(scheduleMemoryService.getSchedules());
});

// 予定削除
router.delete("/:id", (req, res) => {
  const result = scheduleMemoryService.deleteSchedule(req.params.id);

  res.json({
    success: result,
  });
});

export default router;