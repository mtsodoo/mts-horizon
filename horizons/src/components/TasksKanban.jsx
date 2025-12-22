import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from 'antd';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const columns = {
  pending: { title: 'قيد الانتظار', color: 'bg-gray-100 dark:bg-gray-800' },
  in_progress: { title: 'قيد التنفيذ', color: 'bg-blue-50 dark:bg-blue-900/20' },
  review: { title: 'قيد المراجعة', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  completed: { title: 'مكتملة', color: 'bg-green-50 dark:bg-green-900/20' }
};

const TaskCard = ({ task, index }) => (
  <Draggable draggableId={task.id} index={index}>
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className="mb-3"
      >
        <Card className="shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-medium text-sm line-clamp-2 leading-tight">{task.title}</h4>
              <Badge variant={task.priority === 'urgent' ? 'destructive' : 'outline'} className="text-[10px] px-1 h-5">
                {task.priority}
              </Badge>
            </div>
            <div className="flex justify-between items-end pt-1">
              <div className="text-xs text-muted-foreground">
                {task.due_date && format(new Date(task.due_date), 'dd MMM', { locale: ar })}
              </div>
              <Avatar size="small" src={task.employee?.employee_photo_url}>
                  {task.employee?.name_ar?.charAt(0)}
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </Draggable>
);

const TasksKanban = ({ tasks, onTaskMove }) => {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    if (destination.droppableId !== result.source.droppableId) {
      onTaskMove(draggableId, destination.droppableId);
    }
  };

  // Group tasks by status
  const tasksByStatus = Object.keys(columns).reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status);
    return acc;
  }, {});

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-w-[1000px]">
        {Object.entries(columns).map(([status, col]) => (
          <div key={status} className={`flex-1 min-w-[280px] rounded-lg p-3 ${col.color} flex flex-col`}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-sm">{col.title}</h3>
              <Badge variant="secondary" className="bg-white dark:bg-gray-700">
                {tasksByStatus[status]?.length || 0}
              </Badge>
            </div>
            <Droppable droppableId={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 overflow-y-auto pr-1 scrollbar-thin"
                >
                  {tasksByStatus[status]?.map((task, index) => (
                    <TaskCard key={task.id} task={task} index={index} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default TasksKanban;