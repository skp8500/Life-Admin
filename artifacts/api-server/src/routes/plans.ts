import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, tasksTable, dailyPlansTable } from "@workspace/db";
import { groq, GROQ_MODEL } from "@workspace/integrations-gemini-ai";
import { deductCredit } from "../lib/credits";

const router: IRouter = Router();

router.get("/plans/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [plan] = await db
    .select()
    .from(dailyPlansTable)
    .where(and(eq(dailyPlansTable.date, today), eq(dailyPlansTable.userId, req.userId!)))
    .orderBy(desc(dailyPlansTable.generatedAt))
    .limit(1);

  if (plan) {
    res.json(plan);
    return;
  }

  res.json({
    id: 0,
    userId: req.userId!,
    date: today,
    plannedTasks: [],
    summary: null,
    generatedAt: new Date().toISOString(),
  });
});

router.post("/plans/today", async (req, res): Promise<void> => {
  const credit = await deductCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  const plan = await generatePlan(today, req.userId!);
  res.json(plan);
});

router.get("/plans/history", async (req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(dailyPlansTable)
    .where(eq(dailyPlansTable.userId, req.userId!))
    .orderBy(desc(dailyPlansTable.generatedAt))
    .limit(30);

  res.json(plans);
});

async function generatePlan(date: string, userId: string) {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.status, "pending"), eq(tasksTable.userId, userId)));

  if (tasks.length === 0) {
    const [plan] = await db
      .insert(dailyPlansTable)
      .values({
        userId,
        date,
        plannedTasks: [],
        summary: "No pending tasks. Great time to add new goals!",
      })
      .returning();
    return plan;
  }

  const taskList = tasks
    .slice(0, 20)
    .map((t) => `- ID:${t.id} "${t.title}" (priority: ${t.priority}, est: ${t.estimatedMinutes ?? 30}min${t.deadline ? `, due: ${new Date(t.deadline).toLocaleDateString()}` : ""})`)
    .join("\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Create a focused daily plan for ${date}. Assume an 8-hour workday (9 AM - 5 PM).

Available tasks:
${taskList}

Return ONLY valid JSON (no markdown, no extra text):
{
  "plannedTasks": [
    {
      "taskId": 1,
      "title": "task title",
      "startTime": "09:00",
      "endTime": "10:00",
      "priority": 1,
      "estimatedMinutes": 60
    }
  ],
  "summary": "Brief overview of today's plan"
}

Rules:
- Schedule highest priority tasks first
- Include breaks (don't overload)
- Respect time constraints (urgent = sooner)
- Max 6-8 tasks per day
- Use 24h format for times`,
      },
    ],
    max_tokens: 8192,
  });

  let planData: { plannedTasks: Array<{ taskId: number; title: string; startTime: string; endTime: string; priority: number; estimatedMinutes: number }>; summary: string };
  try {
    planData = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    planData = { plannedTasks: [], summary: "Could not generate plan. Please try again." };
  }

  const [plan] = await db
    .insert(dailyPlansTable)
    .values({
      userId,
      date,
      plannedTasks: planData.plannedTasks ?? [],
      summary: planData.summary ?? null,
    })
    .returning();

  return plan;
}

export default router;
