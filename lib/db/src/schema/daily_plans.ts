import { pgTable, text, serial, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dailyPlansTable = pgTable("daily_plans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  plannedTasks: jsonb("planned_tasks").notNull().default([]),
  summary: text("summary"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyPlanSchema = createInsertSchema(dailyPlansTable).omit({ id: true, generatedAt: true, userId: true });
export type InsertDailyPlan = z.infer<typeof insertDailyPlanSchema>;
export type DailyPlan = typeof dailyPlansTable.$inferSelect;
