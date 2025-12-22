import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';

const ProjectTimeline = ({ milestones }) => {
  const sortedMilestones = [...milestones].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>المحطات الرئيسية والجدول الزمني</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative border-r border-gray-200 dark:border-gray-700 mr-3 space-y-8">
          {sortedMilestones.map((milestone, idx) => {
            const isCompleted = milestone.status === 'completed';
            const isLate = !isCompleted && isPast(new Date(milestone.due_date));
            
            return (
              <div key={milestone.id} className="relative pr-6">
                <div className={`absolute -right-1.5 mt-1.5 h-3 w-3 rounded-full border ${
                  isCompleted ? 'bg-green-500 border-green-500' : 
                  isLate ? 'bg-red-500 border-red-500' : 
                  'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                }`} />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                  <div>
                    <h4 className={`text-sm font-semibold ${isCompleted ? 'text-green-600' : ''}`}>
                      {milestone.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                    <Clock className="w-3 h-3 ml-1" />
                    {format(new Date(milestone.due_date), 'PPP', { locale: ar })}
                  </div>
                </div>
              </div>
            );
          })}
          
          {milestones.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              لا توجد محطات رئيسية مضافة لهذا المشروع بعد.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectTimeline;