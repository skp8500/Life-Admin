import { useState } from "react";
import { useExtractTasks } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SmartInput() {
  const [text, setText] = useState("");
  const extractTasks = useExtractTasks();
  
  const handleExtract = () => {
    if (!text.trim()) return;
    extractTasks.mutate({ data: { text } });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Input</h1>
          <p className="text-muted-foreground">Dump your thoughts. Let AI extract the action items.</p>
        </div>
        
        <Card className="flex-1 flex flex-col border-primary/20">
          <CardHeader>
            <CardTitle>Brain Dump</CardTitle>
            <CardDescription>Paste meeting notes, emails, or random thoughts.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Textarea 
              className="flex-1 min-h-[300px] resize-none text-base bg-transparent border-0 focus-visible:ring-0 p-0"
              placeholder="e.g. Need to email Sarah about the Q3 report by Tuesday. Also remind team to update Jira tickets. Buy coffee beans on the way home."
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="input-smart-text"
            />
          </CardContent>
          <div className="p-4 border-t border-border bg-muted/50 flex justify-end">
            <Button 
              onClick={handleExtract} 
              disabled={extractTasks.isPending || !text.trim()}
              className="gap-2"
              data-testid="button-extract-tasks"
            >
              {extractTasks.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Extract Action Items
            </Button>
          </div>
        </Card>
      </div>

      {(extractTasks.data || extractTasks.isPending) && (
        <div className="flex-1 max-w-md">
          <Card className="h-full border-primary/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                Extracted Tasks
              </CardTitle>
              <CardDescription>Automatically saved to your task list</CardDescription>
            </CardHeader>
            <CardContent>
              {extractTasks.isPending ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing text...</p>
                </div>
              ) : extractTasks.data ? (
                <div className="space-y-4">
                  {extractTasks.data.savedTasks.map((task, i) => (
                    <div key={i} className="p-4 rounded-lg bg-card border border-border shadow-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{task.title}</p>
                        <Badge variant="outline">P{task.priority}</Badge>
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        {task.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {extractTasks.data.savedTasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No actionable tasks found in the text.</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
