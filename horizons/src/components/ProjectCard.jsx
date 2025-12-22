import React from 'react';
import { Tooltip } from 'antd';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar } from 'antd';
import { Calendar, DollarSign, ArrowRight, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const statusColors = {
  active: 'default',
  completed: 'success',
  on_hold: 'warning',
  cancelled: 'destructive'
};

const statusLabels = {
  active: 'نشط',
  completed: 'مكتمل',
  on_hold: 'معلق',
  cancelled: 'ملغي'
};

const ProjectCard = ({ project, onCreateTask }) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-all duration-300 group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold truncate" title={project.name}>
            {project.name}
          </CardTitle>
          <Badge variant={statusColors[project.status] || 'secondary'}>
            {statusLabels[project.status] || project.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {project.client_name || 'مشروع داخلي'}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 h-10">
          {project.description || 'لا يوجد وصف'}
        </p>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>الإنجاز</span>
            <span>{project.progress_percentage || 0}%</span>
          </div>
          <Progress value={project.progress_percentage || 0} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{project.end_date ? format(new Date(project.end_date), 'PP', { locale: ar }) : 'غير محدد'}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span>{Number(project.budget).toLocaleString()} ريال</span>
          </div>
        </div>
        
        <div className="flex items-center -space-x-2 space-x-reverse overflow-hidden pt-2">
          <Avatar.Group maxCount={4} size="small">
            <Tooltip title={project.project_manager?.name_ar}>
              <Avatar src={project.project_manager?.employee_photo_url}>
                {project.project_manager?.name_ar?.charAt(0)}
              </Avatar>
            </Tooltip>
          </Avatar.Group>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex gap-2">
        <Button 
          className="flex-1" 
          variant="outline" 
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          التفاصيل
          <ArrowRight className="w-4 h-4 mr-2" />
        </Button>
        {onCreateTask && (
            <Button 
                className="px-3" 
                variant="secondary" 
                onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask(project);
                }}
                title="إضافة مهمة سريعة"
            >
                <PlusCircle className="w-4 h-4" />
            </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;