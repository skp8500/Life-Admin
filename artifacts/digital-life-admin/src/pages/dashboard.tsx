import { useState } from "react";
import { useGetStats, useGetTodayPlan, useChatWithAssistant, useCreateTask } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, Send, Loader2, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: plan, isLoading: planLoading } = useGetTodayPlan();
  const { toast } = useToast();
  
  const createTask = useCreateTask();
  const chatWithAssistant = useChatWithAssistant();

  const [quickTask, setQuickTask] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);

  const handleQuickAdd = () => {
    if (!quickTask.trim()) return;
    createTask.mutate(
      { data: { title: quickTask, priority: 3, status: 'pending' } },
      {
        onSuccess: () => {
          setQuickTask("");
          toast({ title: "Task added", description: "Quick task added successfully." });
        },
      }
    );
  };

  const handleQuickChat = () => {
    if (!chatMessage.trim()) return;
    chatWithAssistant.mutate(
      { data: { message: chatMessage } },
      {
        onSuccess: (res) => {
          setChatResponse(res.reply);
          setChatMessage("");
        },
      }
    );
  };

  if (statsLoading || planLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM do")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tasks">{stats?.totalTasks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-completed-tasks">{stats?.completedTasks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-tasks">{stats?.pendingTasks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-overdue-tasks">{stats?.overdueTasks || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Today's Plan</CardTitle>
            <CardDescription>Your AI-generated schedule</CardDescription>
          </CardHeader>
          <CardContent>
            {plan?.plannedTasks && plan.plannedTasks.length > 0 ? (
              <div className="space-y-4">
                {plan.plannedTasks.map((t) => (
                  <div key={t.taskId} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.startTime} - {t.endTime}</p>
                    </div>
                    <Badge variant="outline">{t.priority} Prio</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No plan generated for today yet. Head to Planner.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle>Quick Add</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Task title..." 
                  value={quickTask} 
                  onChange={(e) => setQuickTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  data-testid="input-quick-task"
                />
                <Button onClick={handleQuickAdd} disabled={createTask.isPending} data-testid="button-quick-add">
                  {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Quick Chat</CardTitle>
              <CardDescription>Ask the assistant anything</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end space-y-4">
              {chatResponse && (
                <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                  {chatResponse}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Ask about tasks..." 
                  value={chatMessage} 
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="input-quick-chat"
                />
                <Button className="h-auto" onClick={handleQuickChat} disabled={chatWithAssistant.isPending} data-testid="button-send-quick-chat">
                  {chatWithAssistant.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
