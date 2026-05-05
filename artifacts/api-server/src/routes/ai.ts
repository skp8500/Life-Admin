import { Router, type IRouter } from "express";
import { eq, lte, and, ne } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import { groq, GROQ_MODEL } from "@workspace/integrations-gemini-ai";
import {
  ExtractTasksBody,
  BreakdownTaskParams,
  ChatWithAssistantBody,
} from "@workspace/api-zod";
import { deductCredit } from "../lib/credits";

const router: IRouter = Router();

router.post("/ai/extract-tasks", async (req, res): Promise<void> => {
  const parsed = ExtractTasksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const credit = await deductCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Extract tasks from this user input and return a JSON object.
User input: "${parsed.data.text}"

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "tasks": [
    {
      "title": "task title",
      "deadline": "ISO 8601 datetime or null",
      "priority": 1-5,
      "tags": ["tag1", "tag2"],
      "description": "brief description or null"
    }
  ]
}

Rules:
- Extract all actionable tasks mentioned
- Infer deadlines from relative terms like "next week", "tomorrow", "by Friday"
- Set priority based on urgency/importance hints (1=highest, 5=lowest)
- Add relevant tags like "interview", "coding", "health", "work", etc.`,
      },
    ],
    max_tokens: 8192,
  });

  let extractedData: { tasks: Array<{ title: string; deadline: string | null; priority: number; tags: string[]; description: string | null }> };
  try {
    extractedData = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const tasks = extractedData.tasks ?? [];

  const savedTasks = await Promise.all(
    tasks.map(async (t) => {
      const [saved] = await db
        .insert(tasksTable)
        .values({
          userId: req.userId!,
          title: t.title,
          description: t.description ?? null,
          priority: Math.min(Math.max(t.priority ?? 3, 1), 5),
          deadline: t.deadline ? new Date(t.deadline) : null,
          tags: t.tags ?? [],
          sourceText: parsed.data.text,
          status: "pending",
        })
        .returning();
      return saved;
    })
  );

  res.json({ tasks, savedTasks });
});

router.post("/ai/breakdown/:taskId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const params = BreakdownTaskParams.safeParse({ taskId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.userId, req.userId!)));

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const credit = await deductCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Break down this task into 4-6 actionable sub-steps.

Task: "${task.title}"
${task.description ? `Description: ${task.description}` : ""}

Return ONLY valid JSON (no markdown, no extra text):
{
  "steps": [
    {
      "title": "sub-step title",
      "estimatedMinutes": 30,
      "description": "brief description or null"
    }
  ]
}

Rules:
- Each step should be concrete and actionable
- Estimate realistic time in minutes
- Steps should be in logical order`,
      },
    ],
    max_tokens: 8192,
  });

  let breakdownData: { steps: Array<{ title: string; estimatedMinutes: number; description: string | null }> };
  try {
    breakdownData = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const steps = breakdownData.steps ?? [];

  const savedSubtasks = await Promise.all(
    steps.map(async (step) => {
      const [saved] = await db
        .insert(tasksTable)
        .values({
          userId: req.userId!,
          title: step.title,
          description: step.description ?? null,
          priority: task.priority,
          parentId: task.id,
          estimatedMinutes: step.estimatedMinutes,
          tags: task.tags ?? [],
          status: "pending",
        })
        .returning();
      return saved;
    })
  );

  res.json({ steps, savedSubtasks });
});

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = ChatWithAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const credit = await deductCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }

  const allTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, req.userId!))
    .orderBy(tasksTable.priority, tasksTable.deadline);

  const today = new Date();
  const taskContext = allTasks.map((t) => {
    const overdue = t.deadline && new Date(t.deadline) < today && t.status !== "completed";
    return `- [${t.status.toUpperCase()}] "${t.title}" (priority: ${t.priority}${t.deadline ? `, due: ${new Date(t.deadline).toLocaleDateString()}` : ""}${overdue ? " ⚠️ OVERDUE" : ""})`;
  }).join("\n");

  const systemPrompt = `You are a helpful AI life admin assistant. You help users manage their tasks, plan their day, and stay productive.

Current task list:
${taskContext || "No tasks yet."}

Answer the user's question about their tasks, schedule, or productivity. Be concise and actionable. If suggesting actions, list them briefly.`;

  const history = (parsed.data.conversationHistory ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: parsed.data.message },
    ],
    max_tokens: 8192,
  });

  const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

  const suggestedActions: string[] = [];
  if (reply.toLowerCase().includes("today")) suggestedActions.push("Generate today's plan");
  if (reply.toLowerCase().includes("overdue")) suggestedActions.push("Reschedule missed tasks");
  if (reply.toLowerCase().includes("break down")) suggestedActions.push("Break down a task");

  res.json({ reply, suggestedActions });
});

router.post("/ai/reschedule", async (req, res): Promise<void> => {
  const credit = await deductCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.userId, req.userId!),
        lte(tasksTable.deadline, today),
        ne(tasksTable.status, "completed"),
        ne(tasksTable.status, "cancelled")
      )
    );

  if (overdueTasks.length === 0) {
    res.json({ rescheduled: [], updatedTasks: [], message: "No overdue tasks found! You're on track." });
    return;
  }

  const taskList = overdueTasks.map((t) => `- ID:${t.id} "${t.title}" (due: ${t.deadline ? new Date(t.deadline).toLocaleDateString() : "no date"}, priority: ${t.priority})`).join("\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Today is ${new Date().toISOString().split("T")[0]}. Reschedule these overdue tasks with realistic new deadlines.

Overdue tasks:
${taskList}

Return ONLY valid JSON (no markdown, no extra text):
{
  "rescheduled": [
    {
      "taskId": 1,
      "title": "task title",
      "oldDeadline": "original deadline date",
      "newDeadline": "new ISO 8601 datetime",
      "reason": "brief reason for the new date"
    }
  ]
}

Rules:
- Higher priority tasks get sooner deadlines
- Space tasks out realistically (not all on the same day)
- Explain the reasoning briefly`,
      },
    ],
    max_tokens: 8192,
  });

  let rescheduleData: { rescheduled: Array<{ taskId: number; title: string; oldDeadline: string; newDeadline: string; reason: string }> };
  try {
    rescheduleData = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const updatedTasks = await Promise.all(
    (rescheduleData.rescheduled ?? []).map(async (r) => {
      const [updated] = await db
        .update(tasksTable)
        .set({ deadline: new Date(r.newDeadline), status: "pending", updatedAt: new Date() })
        .where(and(eq(tasksTable.id, r.taskId), eq(tasksTable.userId, req.userId!)))
        .returning();
      return updated;
    })
  );

  res.json({
    rescheduled: rescheduleData.rescheduled ?? [],
    updatedTasks: updatedTasks.filter(Boolean),
    message: `Rescheduled ${rescheduleData.rescheduled?.length ?? 0} overdue tasks.`,
  });
});

export default router;
