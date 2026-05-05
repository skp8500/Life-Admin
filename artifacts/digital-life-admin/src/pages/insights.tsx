import { useGetStats, useListInsights, useGenerateInsights, getListInsightsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, RefreshCw, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";

export default function Insights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: insights, isLoading: insightsLoading } = useListInsights();
  const generateInsights = useGenerateInsights();

  const handleGenerate = () => {
    generateInsights.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
        toast({ title: "Insights generated!" });
      }
    });
  };

  const isLoading = statsLoading || insightsLoading;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const pieData = stats ? [
    { name: 'Completed', value: stats.completedTasks, color: 'hsl(var(--primary))' },
    { name: 'Pending', value: stats.pendingTasks, color: 'hsl(var(--muted-foreground))' },
    { name: 'Overdue', value: stats.overdueTasks, color: 'hsl(var(--destructive))' }
  ] : [];

  const barData = stats?.tasksByPriority 
    ? Object.entries(stats.tasksByPriority).map(([prio, count]) => ({
        priority: `P${prio}`,
        count
      }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">AI analysis of your productivity patterns.</p>
        </div>
        <Button onClick={handleGenerate} disabled={generateInsights.isPending} data-testid="button-generate-insights">
          {generateInsights.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Generate Insights
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
            <CardDescription>Overall completion distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-sm mt-4">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary" /> Completed ({stats?.completedTasks})</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-muted-foreground" /> Pending ({stats?.pendingTasks})</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-destructive" /> Overdue ({stats?.overdueTasks})</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
            <CardDescription>Current workload distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="priority" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">AI Observations</h2>
        {insights?.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <Card key={insight.id} className="border-primary/20 bg-card/50" data-testid={`card-insight-${insight.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed py-8">
            <CardContent className="flex flex-col items-center text-center space-y-2">
              <TrendingUp className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No insights generated yet. Click generate to analyze your patterns.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
