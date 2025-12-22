import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import { FolderOpen, Calendar, Users, DollarSign, CheckSquare, Clock, FileText, PlusCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import TasksKanban from '@/components/TasksKanban';
import ProjectTimeline from '@/components/ProjectTimeline';
import ProjectTeamCard from '@/components/ProjectTeamCard';
import ProjectFileUpload from '@/components/ProjectFileUpload';
import ProjectFilesViewer from '@/components/ProjectFilesViewer';
import CreateTaskModal from '@/components/CreateTaskModal';
import ProjectFinancial from '@/components/ProjectFinancial';
import { Spin, Empty } from 'antd';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*, project_manager:profiles!projects_project_manager_id_fkey(*)')
        .eq('id', projectId)
        .single();

      if (projError) throw projError;
      setProject(projData);

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, employee:profiles!tasks_assigned_to_fkey(*)')
        .eq('project_id', projectId)
        .order('due_date');
      setTasks(taskData || []);

      const { data: milData } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId);
      setMilestones(milData || []);

      const { data: teamData } = await supabase
        .from('project_members')
        .select('*, profile:profiles(*)')
        .eq('project_id', projectId);
      setTeam(teamData || []);
      
      const { data: empData } = await supabase.from('profiles').select('id, name_ar').eq('is_active', true);
      setEmployees(empData || []);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحميل بيانات المشروع' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchProjectData();
    
    const channel = supabase
      .channel(`project_details_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, fetchProjectData)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [fetchProjectData, projectId]);

  const handleTaskMove = async (taskId, newStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      toast({ variant: 'destructive', title: 'فشل تحديث المهمة' });
      fetchProjectData();
    }
  };
  
  const handleTaskCreated = (newTask) => {
    // CreateTaskModal already handles everything (insert, files, notifications)
    // We just need to refresh the data
    fetchProjectData();
    setIsTaskModalOpen(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  if (!project) return <div className="text-center py-20">المشروع غير موجود</div>;

  const canDeleteFiles = ['general_manager', 'admin', 'project_manager'].includes(profile?.role);

  return (
    <>
      <Helmet>
        <title>{project.name} - تفاصيل المشروع</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <Badge>{project.status}</Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>العميل: {project.client_name || 'داخلي'}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>تاريخ الانتهاء: {project.end_date ? format(new Date(project.end_date), 'PP', { locale: ar }) : 'غير محدد'}</span>
              </div>
            </div>
          </div>
          
          <div className="min-w-[200px] space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span>نسبة الإنجاز</span>
              <span>{project.progress_percentage || 0}%</span>
            </div>
            <Progress value={project.progress_percentage || 0} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>المهام المكتملة: {tasks.filter(t => t.status === 'completed').length}</span>
              <span>الإجمالي: {tasks.length}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <div className="flex justify-between items-center mb-4">
             <TabsList className="grid w-full max-w-4xl grid-cols-2 md:grid-cols-5 bg-muted/50 p-1">
                <TabsTrigger value="tasks">
                <CheckSquare className="w-4 h-4 ml-2" />
                المهام
                </TabsTrigger>
                <TabsTrigger value="timeline">
                <Clock className="w-4 h-4 ml-2" />
                الجدول الزمني
                </TabsTrigger>
                <TabsTrigger value="team">
                <Users className="w-4 h-4 ml-2" />
                الفريق
                </TabsTrigger>
                <TabsTrigger value="files">
                <FileText className="w-4 h-4 ml-2" />
                الملفات
                </TabsTrigger>
                <TabsTrigger value="finance">
                <DollarSign className="w-4 h-4 ml-2" />
                المالية
                </TabsTrigger>
             </TabsList>
             <Button onClick={() => setIsTaskModalOpen(true)} size="sm">
                <PlusCircle className="w-4 h-4 ml-2" />
                إضافة مهمة
             </Button>
          </div>

          <TabsContent value="tasks" className="mt-2">
             <TasksKanban tasks={tasks} onTaskMove={handleTaskMove} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <ProjectTimeline milestones={milestones} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.project_manager && (
                <ProjectTeamCard member={{ profile: project.project_manager, role: 'manager', is_active: true }} />
              )}
              {team.map(member => (
                <ProjectTeamCard key={member.id} member={member} />
              ))}
            </div>
            {team.length === 0 && !project.project_manager && <Empty description="لا يوجد أعضاء في الفريق" />}
          </TabsContent>

          <TabsContent value="files" className="mt-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <ProjectFileUpload 
                        projectId={project.id} 
                        onUploadComplete={() => {
                            window.dispatchEvent(new Event('project-files-updated'));
                        }} 
                    />
                </div>
                <div className="lg:col-span-2">
                    <ProjectFilesViewer 
                        projectId={project.id} 
                        canDelete={canDeleteFiles} 
                    />
                </div>
             </div>
          </TabsContent>

          <TabsContent value="finance" className="mt-6">
            <ProjectFinancial project={project} />
          </TabsContent>
        </Tabs>

        <CreateTaskModal 
            visible={isTaskModalOpen}
            onCancel={() => setIsTaskModalOpen(false)}
            onFinish={handleTaskCreated}
            employees={employees}
            projects={[]}
            defaultProjectId={project.id}
            defaultProjectName={project.name}
        />
      </div>
    </>
  );
};

export default ProjectDetails;