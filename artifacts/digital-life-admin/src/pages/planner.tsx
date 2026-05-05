import { useGetTodayPlan, useGenerateTodayPlan, useRescheduleMissedTasks, getGetTodayPlanQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Planner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: plan, isLoading } = useGetTodayPlan();
  const generatePlan = useGenerateTodayPlan();
  const reschedule = useRescheduleMissedTasks();

  const handleGenerate = () => {
    generatePlan.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayPlanQueryKey() });
        toast({ title: "Plan generated!" });
      }
    });
  };

  const handleReschedule = () => {
    reschedule.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Missed tasks rescheduled." });
      }
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Planner</h1>
          <p className="text-muted-foreground">Your schedule, optimized by AI.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReschedule} disabled={reschedule.isPending} data-testid="button-reschedule">
            {reschedule.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
            Reschedule Missed
          </Button>
          <Button onClick={handleGenerate} disabled={generatePlan.isPending} data-testid="button-generate-plan">
            {generatePlan.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Generate Plan
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : plan && plan.plannedTasks.length > 0 ? (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-sm text-primary-foreground/80">
              {plan.summary || "Here is your optimized schedule for today based on task priorities and time estimates."}
            </CardContent>
          </Card>
          
          <div className="relative border-l-2 border-border ml-4 space-y-8 pb-8">
            {plan.plannedTasks.map((pt, i) => (
              <div key={`${pt.taskId}-${i}`} className="relative pl-6">
                <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-2 ring-4 ring-background" />
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{pt.startTime} - {pt.endTime}</span>
                        <Badge variant="outline" className="text-[10px]">{pt.estimatedMinutes} min</Badge>
                      </div>
                      <h3 className="font-medium text-lg">{pt.title}</h3>
                    </div>
                    <Badge variant={pt.priority > 3 ? "destructive" : "secondary"}>Priority {pt.priority}</Badge>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-lg">No Plan For Today</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Generate a smart schedule based on your pending tasks and priorities.</p>
            </div>
            <Button onClick={handleGenerate} disabled={generatePlan.isPending}>
              {generatePlan.isPending ? "Generating..." : "Generate Today's Plan"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
