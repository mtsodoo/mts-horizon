import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { FolderKanban, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProjectCard from '@/components/ProjectCard';
import ProjectStats from '@/components/ProjectStats';
import { useNavigate } from 'react-router-dom';
import { Empty, Spin } from 'antd';
import CreateTaskModal from '@/components/CreateTaskModal';
import { useToast } from '@/components/ui/use-toast';
import dayjs from 'dayjs';

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Task Creation State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState(null);
  const [employees, setEmployees] = useState([]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_manager:profiles!projects_project_manager_id_fkey(name_ar, employee_photo_url)')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // Pre-fetch employees for task assignment
      const { data: empData } = await supabase.from('profiles').select('id, name_ar').eq('is_active', true);
      setEmployees(empData || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    
    // Realtime subscription
    const channel = supabase
      .channel('projects_page_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchProjects]);

  const handleCreateTaskClick = (project) => {
    setSelectedProjectForTask(project);
    setIsTaskModalOpen(true);
  };

  // ✅ معالجة إنهاء المشروع
  const handleProjectComplete = (projectId) => {
    // تحديث محلي سريع
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, status: 'completed', progress_percentage: 100 }
        : p
    ));
  };

  const handleTaskCreated = async (values) => {
      try {
        const { error } = await supabase.from('tasks').insert({
            title: values.title,
            description: values.description,
            assigned_to: values.assigned_to,
            project_id: values.project_id,
            priority: values.priority,
            due_date: values.due_date.format('YYYY-MM-DD'),
            estimated_hours: values.estimated_hours,
            tags: values.tags,
            attachments: values.attachments,
            assigned_by: user.id,
            created_from: values.created_from
        });

        if (error) throw error;
        
        // Create notification for assigned employee
        await supabase.from('notifications').insert({
            user_id: values.assigned_to,
            type: 'task_assigned',
            title: 'مهمة جديدة',
            message: `تم إسناد مهمة جديدة لك: ${values.title}`,
            link: '/my-tasks'
        });

        toast({ title: 'تم إنشاء المهمة بنجاح', description: 'تمت إضافة المهمة وإشعار الموظف.' });
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'فشل إنشاء المهمة' });
      }
  };

  // ✅ إحصائيات محسّنة
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    delayed: projects.filter(p => {
      // المشروع متأخر إذا: غير مكتمل + تاريخ الانتهاء فات
      return p.status !== 'completed' && 
             p.status !== 'cancelled' && 
             p.end_date && 
             new Date(p.end_date) < new Date();
    }).length,
    // ✅ نسبة الإنجاز = المشاريع المكتملة ÷ إجمالي المشاريع (بدون الملغية)
    successRate: (() => {
      const nonCancelled = projects.filter(p => p.status !== 'cancelled');
      if (nonCancelled.length === 0) return 0;
      const completed = nonCancelled.filter(p => p.status === 'completed').length;
      return Math.round((completed / nonCancelled.length) * 100);
    })()
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      <Helmet>
        <title>إدارة المشاريع</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageTitle title="المشاريع" icon={FolderKanban} />
          <Button onClick={() => navigate('/projects/new')} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            مشروع جديد
          </Button>
        </div>

        <ProjectStats stats={stats} />

        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم المشروع أو العميل..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="on_hold">معلق</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spin size="large" /></div>
        ) : filteredProjects.length === 0 ? (
          <Empty description="لا توجد مشاريع مطابقة للبحث" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onCreateTask={handleCreateTaskClick}
                onProjectComplete={handleProjectComplete}
              />
            ))}
          </div>
        )}

        <CreateTaskModal 
            visible={isTaskModalOpen}
            onCancel={() => setIsTaskModalOpen(false)}
            onFinish={handleTaskCreated}
            employees={employees}
            projects={projects}
            defaultProjectId={selectedProjectForTask?.id}
            defaultProjectName={selectedProjectForTask?.name}
        />
      </div>
    </>
  );
};

export default Projects;