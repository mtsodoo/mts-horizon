import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { ListTodo, CheckCircle, Clock, AlertTriangle, Archive, Paperclip, Calendar, User, FolderOpen, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, DatePicker, Input, Empty, Spin, Modal, Form, message, Tag, Tooltip } from 'antd';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import RatingStars from '@/components/RatingStars';
import TaskFileUpload from '@/components/TaskFileUpload';
import TaskUploadedFiles from '@/components/TaskUploadedFiles';
import { logSystemActivity } from '@/utils/omarTools';

const { RangePicker } = DatePicker;

const priorityConfig = {
  low: { label: 'منخفضة', color: 'green', icon: '🟢' },
  medium: { label: 'متوسطة', color: 'blue', icon: '🔵' },
  high: { label: 'عالية', color: 'orange', icon: '🟠' },
  urgent: { label: 'عاجلة', color: 'red', icon: '🔴' }
};

const statusConfig = {
  pending: { label: 'قيد الانتظار', color: 'default', bgColor: 'bg-gray-100' },
  in_progress: { label: 'قيد التنفيذ', color: 'processing', bgColor: 'bg-blue-100' },
  review: { label: 'قيد المراجعة', color: 'warning', bgColor: 'bg-yellow-100' },
  completed: { label: 'مكتملة', color: 'success', bgColor: 'bg-green-100' },
  cancelled: { label: 'ملغية', color: 'error', bgColor: 'bg-red-100' }
};

const DueDate = ({ date }) => {
  if (!date) return <span className="text-gray-400">غير محدد</span>;
  const d = new Date(date);
  const f = format(d, 'PPP', { locale: ar });
  const remaining = formatDistanceToNow(d, { locale: ar, addSuffix: true });

  let c = 'text-green-600';
  let bg = 'bg-green-50';
  if (isPast(d) && !isToday(d)) { c = 'text-red-600 font-bold'; bg = 'bg-red-50'; }
  else if (isToday(d)) { c = 'text-orange-600 font-bold'; bg = 'bg-orange-50'; }
  else if (isTomorrow(d)) { c = 'text-yellow-600'; bg = 'bg-yellow-50'; }

  return (
    <div className={`${bg} ${c} px-2 py-1 rounded text-xs`}>
      <div>{f}</div>
      <div className="text-[10px] opacity-75">{remaining}</div>
    </div>
  );
};

const TaskCard = ({ task, onAction }) => {
  const progressPercent = task.status === 'completed' ? 100 :
    task.status === 'review' ? 80 :
      task.status === 'in_progress' ? 50 : 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`hover:shadow-lg transition-all border-r-4 ${task.priority === 'urgent' ? 'border-r-red-500' :
          task.priority === 'high' ? 'border-r-orange-500' :
            task.priority === 'medium' ? 'border-r-blue-500' : 'border-r-green-500'
        }`}>
        <CardContent className="p-4 space-y-3">
          {/* Header: العنوان والأولوية */}
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-base leading-tight flex-1">{task.title}</h3>
            <Tag color={priorityConfig[task.priority]?.color} className="shrink-0">
              {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
            </Tag>
          </div>

          {/* اسم المشروع */}
          {task.project && (
            <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded">
              <FolderOpen className="w-4 h-4" />
              <span className="font-medium">{task.project.name}</span>
            </div>
          )}

          {/* الوصف */}
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description || 'لا يوجد وصف'}</p>

          {/* معلومات إضافية */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-600">
              <User className="w-3 h-3" />
              <span>من: {task.assigned_by_profile?.name_ar || 'غير محدد'}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-3 h-3" />
              <span>أُنشئت: {task.created_at ? format(new Date(task.created_at), 'dd/MM/yyyy') : '-'}</span>
            </div>
          </div>

          {/* شريط التقدم */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <Tag color={statusConfig[task.status]?.color}>{statusConfig[task.status]?.label}</Tag>
              <span className="text-gray-500">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'review' ? 'bg-yellow-500' :
                      task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* تاريخ التسليم والمرفقات */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <DueDate date={task.due_date} />
            </div>
            <div className="flex items-center gap-2">
              {task.attachments?.length > 0 && (
                <Tooltip title={`${task.attachments.length} مرفقات`}>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Paperclip className="w-4 h-4" />
                    <span>{task.attachments.length}</span>
                  </div>
                </Tooltip>
              )}
              {task.estimated_hours && (
                <Tooltip title="الساعات المقدرة">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {task.estimated_hours} س
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onAction('details', task)}>
              التفاصيل
            </Button>
            {task.status === 'pending' && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => onAction('start', task)}>
                بدء العمل
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700" onClick={() => onAction('review', task)}>
                طلب مراجعة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TaskDetailsModal = ({ task, visible, onClose, onAction, onTaskUpdate }) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [fileCount, setFileCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [uploadVersion, setUploadVersion] = useState(1);

  const fetchData = useCallback(async () => {
    if (!task) return;
    const { data: commentsData } = await supabase.from('task_comments').select('*, user:profiles(name_ar)').eq('task_id', task.id).order('created_at');
    setComments(commentsData || []);

    if (task.status === 'completed') {
      const { data: evalData } = await supabase.from('task_evaluations').select('*').eq('task_id', task.id).maybeSingle();
      setEvaluation(evalData);
    } else {
      setEvaluation(null);
    }
  }, [task]);

  useEffect(() => { fetchData(); }, [fetchData, visible]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    const { error } = await supabase.from('task_comments').insert({ task_id: task.id, user_id: user.id, comment });
    if (error) message.error('فشل'); else { setComment(''); fetchData(); }
  };

  const handleRequestReview = async () => {
    setIsSubmitting(true);
    await onAction('review', task);
    setIsSubmitting(false);
    onClose();
  };

  if (!task) return null;
  const isEmployeeOnTask = task.assigned_to === user.id;

  return (
    <Modal title={`تفاصيل: ${task.title}`} open={visible} onCancel={onClose} footer={null} width={900}>
      <div className="space-y-6 max-h-[80vh] overflow-y-auto p-4">
        {/* معلومات المشروع */}
        {task.project && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-purple-700">المشروع: {task.project.name}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <p><strong>الوصف:</strong> {task.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-500 block text-xs">الحالة</span>
                <Tag color={statusConfig[task.status]?.color}>{statusConfig[task.status]?.label}</Tag>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-500 block text-xs">الأولوية</span>
                <Tag color={priorityConfig[task.priority]?.color}>{priorityConfig[task.priority]?.label}</Tag>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-500 block text-xs">تاريخ التسليم</span>
                <DueDate date={task.due_date} />
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-500 block text-xs">الساعات المقدرة</span>
                <span className="font-medium">{task.estimated_hours || '-'} ساعة</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <TaskUploadedFiles key={uploadVersion} taskId={task.id} taskStatus={task.status} onFilesChange={setFileCount} />

        {isEmployeeOnTask && (task.status === 'in_progress' || task.status === 'pending') && (
          <TaskFileUpload taskId={task.id} projectId={task.project_id} onUploadComplete={() => setUploadVersion(v => v + 1)} />
        )}

        {evaluation && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-bold mb-2">التقييم</h4>
              <RatingStars initialValue={evaluation.overall_score} readonly />
              <p className="mt-2 text-gray-600">{evaluation.feedback}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <h4 className="font-bold mb-2">التعليقات ({comments.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm">لا توجد تعليقات</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-gray-50 p-2 rounded">
                    <strong className="text-sm">{c.user.name_ar}:</strong>
                    <p className="text-sm text-gray-600">{c.comment}</p>
                    <span className="text-[10px] text-gray-400">{format(new Date(c.created_at), 'PPp', { locale: ar })}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input.TextArea value={comment} onChange={e => setComment(e.target.value)} placeholder="أضف تعليقاً..." />
              <Button onClick={handleAddComment}>إرسال</Button>
            </div>
          </CardContent>
        </Card>

        {isEmployeeOnTask && (
          <div className="flex gap-2 justify-end pt-4 border-t">
            {task.status === 'pending' && (
              <Button onClick={() => { onAction('start', task); onClose(); }} className="bg-blue-600 hover:bg-blue-700">
                بدء العمل
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button
                onClick={handleRequestReview}
                disabled={fileCount === 0 || isSubmitting}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {isSubmitting ? 'جاري...' : 'طلب مراجعة'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

const MyTasksPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: null, priority: null, dateRange: null });
  const [detailsModal, setDetailsModal] = useState({ visible: false, task: null });

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select(`
        *, 
        project_id, 
        project:projects(id, name),
        assigned_by_profile:profiles!tasks_assigned_by_fkey(name_ar)
      `)
      .eq('assigned_to', user.id);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);

    const { data, error } = await query.order('due_date', { ascending: true });
    if (!error) setTasks(data || []);
    setLoading(false);
  }, [user, filters]);

  useEffect(() => {
    fetchTasks();
    const sub = supabase.channel('my-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assigned_to=eq.${user?.id}` }, fetchTasks).subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchTasks, user]);

  const handleAction = async (action, task) => {
    if (action === 'details') { setDetailsModal({ visible: true, task }); return; }

    let newStatus;
    let updateData = {};
    if (action === 'start') { newStatus = 'in_progress'; updateData.start_date = new Date().toISOString(); }
    else if (action === 'review') { newStatus = 'review'; }

    if (newStatus) {
      updateData.status = newStatus;
      updateData.updated_at = new Date().toISOString();
      const { error } = await supabase.from('tasks').update(updateData).eq('id', task.id);
      if (error) toast({ variant: 'destructive', title: 'خطأ', description: error.message });
      else {
        toast({ title: 'نجاح', description: 'تم تحديث المهمة' });
        logSystemActivity(user.id, 'TASK_UPDATE', 'TASK', { taskId: task.id, status: newStatus, title: task.title });
        await fetchTasks();
      }
    }
  };

  // إحصائيات المهام
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !['completed', 'cancelled'].includes(t.status)).length
  }), [tasks]);

  return (
    <div className="space-y-6">
      <PageTitle title="مهامي" icon={ListTodo} />

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gray-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">إجمالي المهام</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-100">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">قيد الانتظار</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500">قيد التنفيذ</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.review}</p>
            <p className="text-xs text-gray-500">قيد المراجعة</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-gray-500">مكتملة</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-gray-500">متأخرة</p>
          </CardContent>
        </Card>
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select
              placeholder="الحالة"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilters(f => ({ ...f, status: value }))}
              options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <Select
              placeholder="الأولوية"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilters(f => ({ ...f, priority: value }))}
              options={Object.entries(priorityConfig).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* قائمة المهام */}
      {loading ? (
        <div className="text-center p-10"><Spin size="large" /></div>
      ) : tasks.length === 0 ? (
        <Empty description="لا توجد مهام" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(t => <TaskCard key={t.id} task={t} onAction={handleAction} />)}
        </div>
      )}

      <TaskDetailsModal
        task={detailsModal.task}
        visible={detailsModal.visible}
        onClose={() => setDetailsModal({ visible: false, task: null })}
        onAction={handleAction}
        onTaskUpdate={fetchTasks}
      />
    </div>
  );
};

export default MyTasksPage;