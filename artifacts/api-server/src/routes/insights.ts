import { Router, type IRouter } from "express";
import { desc, eq, and } from "drizzle-orm";
import { db, tasksTable, insightsTable } from "@workspace/db";
import { groq, GROQ_MODEL } from "@workspace/integrations-gemini-ai";
import { deductCredit } from "../lib/credits";

const router: IRouter = Router();

router.get("/insights", async (req, res): Promise<void> => {
  const insights = await db
    .select()
    .from(insightsTable)
    .where(eq(insightsTable.userId, req.userId!))
    .orderBy(desc(insightsTable.observedAt))
    .limit(20);

  res.json(insights);
});

router.post("/insights/generate", async (req, res): Promise<void> => {
  const credit = await deductCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }

  const allTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, req.userId!))
    .orderBy(tasksTable.createdAt);

  if (allTasks.length < 2) {
    res.json([]);
    return;
  }

  const completed = allTasks.filter((t) => t.status === "completed").length;
  const total = allTasks.length;
  const overdue = allTasks.filter(
    (t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed"
  ).length;

  const taskSummary = allTasks.slice(0, 30).map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    deadline: t.deadline,
    tags: t.tags,
  }));

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Analyze this task history and identify 2-3 behavioral patterns.

Task summary (${total} total, ${completed} completed, ${overdue} overdue):
${JSON.stringify(taskSummary, null, 2)}

Return ONLY valid JSON (no markdown, no extra text):
{
  "insights": [
    {
      "type": "pattern|warning|tip",
      "title": "Short insight title",
      "description": "Specific, actionable insight in 1-2 sentences",
      "data": {}
    }
  ]
}

Rules:
- Be specific and actionable
- Look for: deadline patterns, priority imbalances, category trends, completion rates
- Suggest concrete improvements`,
      },
    ],
    max_tokens: 8192,
  });

  let insightData: { insights: Array<{ type: string; title: string; description: string; data: Record<string, unknown> }> };
  try {
    insightData = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    insightData = { insights: [] };
  }

  const savedInsights = await Promise.all(
    (insightData.insights ?? []).map(async (insight) => {
      const [saved] = await db
        .insert(insightsTable)
        .values({
          userId: req.userId!,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          data: insight.data ?? {},
        })
        .returning();
      return saved;
    })
  );

  res.json(savedInsights);
});

router.get("/insights/stats", async (req, res): Promise<void> => {
  const allTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, req.userId!));
  const now = new Date();

  const completed = allTasks.filter((t) => t.status === "completed").length;
  const pending = allTasks.filter((t) => t.status === "pending").length;
  const overdue = allTasks.filter(
    (t) => t.deadline && new Date(t.deadline) < now && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  const tasksByPriority: Record<string, number> = {};
  for (const t of allTasks) {
    const key = String(t.priority);
    tasksByPriority[key] = (tasksByPriority[key] ?? 0) + 1;
  }

  const recentActivity = allTasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  res.json({
    totalTasks: allTasks.length,
    completedTasks: completed,
    pendingTasks: pending,
    overdueTasks: overdue,
    completionRate: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) / 100 : 0,
    tasksByPriority,
    recentActivity,
  });
});

export default router;
