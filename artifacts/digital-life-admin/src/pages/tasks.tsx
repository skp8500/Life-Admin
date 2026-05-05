import { useState } from "react";
import { useListTasks, useUpdateTask, useBreakdownTask, useDeleteTask, useCreateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, MoreVertical, Trash2, BrainCircuit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const { data: tasks, isLoading } = useListTasks(
    filterStatus !== "all" ? { status: filterStatus } : undefined
  );

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const breakdownTask = useBreakdownTask();
  const createTask = useCreateTask();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task deleted" });
        }
      }
    );
  };

  const handleBreakdown = (id: number) => {
    breakdownTask.mutate(
      { taskId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task broken down into subtasks" });
        }
      }
    );
  };

  const handleCreate = () => {
    if (!newTaskTitle) return;
    createTask.mutate(
      { data: { title: newTaskTitle, description: newTaskDesc, priority: 3, status: 'pending' } },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setNewTaskTitle("");
          setNewTaskDesc("");
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task created" });
        }
      }
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your action items.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task"><Plus className="w-4 h-4 mr-2" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input 
                placeholder="Title" 
                value={newTaskTitle} 
                onChange={(e) => setNewTaskTitle(e.target.value)} 
                data-testid="input-task-title"
              />
              <Textarea 
                placeholder="Description" 
                value={newTaskDesc} 
                onChange={(e) => setNewTaskDesc(e.target.value)} 
                data-testid="input-task-desc"
              />
              <Button onClick={handleCreate} disabled={createTask.isPending} data-testid="button-save-task">
                {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {tasks?.map((task) => (
            <Card key={task.id} className={`transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`} data-testid={`card-task-${task.id}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <Checkbox 
                  checked={task.status === 'completed'} 
                  onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                  className="mt-1"
                  data-testid={`checkbox-task-${task.id}`}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority > 3 ? "destructive" : "secondary"}>P{task.priority}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`menu-task-${task.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleBreakdown(task.id)} disabled={breakdownTask.isPending} data-testid={`menu-breakdown-${task.id}`}>
                            <BrainCircuit className="w-4 h-4 mr-2" /> AI Breakdown
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive" data-testid={`menu-delete-${task.id}`}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {task.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No tasks found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
