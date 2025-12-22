import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { KanbanSquare, PlusCircle, FolderKanban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Tabs, Modal, Form, Input, Tag, Popconfirm, Avatar, Tooltip, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { format, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import CreateTaskModal from '@/components/CreateTaskModal';
import RatingStars from '@/components/RatingStars';
import { Helmet } from 'react-helmet';
import ProjectCard from '@/components/ProjectCard';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
// 🔥 استيراد أداة التسجيل
import { logSystemActivity } from '@/utils/omarTools';

const { TabPane } = Tabs;

const priorityConfig = {
    low: { label: 'منخفضة', color: 'green' },
    medium: { label: 'متوسطة', color: 'blue' },
    high: { label: 'عالية', color: 'orange' },
    urgent: { label: 'عاجلة', color: 'red' },
};

const statusConfig = {
    pending: { label: 'قيد الانتظار', color: 'default' },
    in_progress: { label: 'قيد التنفيذ', color: 'processing' },
    review: { label: 'قيد المراجعة', color: 'warning' },
    completed: { label: 'مكتملة', color: 'success' },
    cancelled: { label: 'ملغية', color: 'error' },
};

// Separate Evaluation Modal Component
const TaskEvaluationModal = ({ task, visible, onClose, onFinish }) => {
    const [form] = Form.useForm();
    const [results, setResults] = useState([]);
    const [comments, setComments] = useState([]);

    const fetchData = useCallback(async () => {
        if (!task) return;
        const { data: resData } = await supabase.from('task_results').select('*').eq('task_id', task.id);
        setResults(resData || []);
        const { data: comData } = await supabase.from('task_comments').select('*, user:profiles(name_ar)').eq('task_id', task.id);
        setComments(comData || []);
    }, [task]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!task) return null;

    return (
        <Modal title={`مراجعة وتقييم مهمة: ${task.title}`} open={visible} onCancel={onClose} footer={null} width={800}>
            <div className="space-y-4 p-4">
                <p><strong>الموظف:</strong> {task.employee?.name_ar}</p>
                <Card><CardContent className="p-4"><h4>النتائج المرفوعة</h4>{results.length > 0 ? results.map(r => <p key={r.id}><a href={r.file_url} target="_blank" rel="noreferrer" className="text-blue-500">{r.file_name}</a></p>) : <p>لم يتم رفع أي نتائج.</p>}</CardContent></Card>
                <Card><CardContent className="p-4"><h4>التعليقات</h4>{comments.length > 0 ? comments.map(c => <p key={c.id}><strong>{c.user.name_ar}:</strong> {c.comment}</p>) : <p>لا توجد تعليقات.</p>}</CardContent></Card>
                <Form form={form} layout="vertical" onFinish={(values) => onFinish(values, task)}>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <Form.Item name="speed_score" label="السرعة" rules={[{ required: true, message: 'التقييم مطلوب' }]}><RatingStars /></Form.Item>
                        <Form.Item name="accuracy_score" label="الدقة" rules={[{ required: true, message: 'التقييم مطلوب' }]}><RatingStars /></Form.Item>
                        <Form.Item name="creativity_score" label="الإبداع" rules={[{ required: true, message: 'التقييم مطلوب' }]}><RatingStars /></Form.Item>
                    </div>
                    <Form.Item name="feedback" label="ملاحظات"><Input.TextArea rows={3} /></Form.Item>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onFinish({ action: 'changes', feedback: form.getFieldValue('feedback') }, task)}>طلب تعديلات</Button>
                        <Button type="submit">قبول وإنهاء المهمة</Button>
                    </div>
                </Form>
            </div>
        </Modal>
    );
};

const TaskManagementPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [evalModal, setEvalModal] = useState({ visible: false, task: null });

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        
        // Fetch Tasks
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*, employee:profiles!tasks_assigned_to_fkey(id, name_ar, employee_photo_url), project:projects!tasks_project_id_fkey(name)')
            .order('created_at', { ascending: false });
        
        // Fetch Employees
        const { data: employeesData } = await supabase.from('profiles').select('id, name_ar, email').eq('is_active', true);
        
        // Fetch All Active Projects
        const { data: projectsData } = await supabase.from('projects').select('id, name').eq('status', 'active');
        
        // Fetch My Managed Projects
        const { data: myProjData } = await supabase
            .from('projects')
            .select('*, project_manager:profiles!projects_project_manager_id_fkey(name_ar, employee_photo_url)')
            .eq('project_manager_id', user.id);

        if (tasksError) {
            if (tasksError.code !== 'PGRST116') {
                 toast({ variant: "destructive", title: "خطأ", description: `فشل جلب المهام: ${tasksError.message}` });
            }
        } else {
            setTasks(tasksData || []);
        }

        setEmployees(employeesData || []);
        setProjects(projectsData || []);
        setMyProjects(myProjData || []);
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchAllData();
            const tasksChannel = supabase.channel('tasks_management')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                    fetchAllData();
                })
                .subscribe();
            return () => { supabase.removeChannel(tasksChannel); };
        }
    }, [fetchAllData, user]);

    const handleTaskCreated = (newTask) => {
        fetchAllData();
        setCreateModalVisible(false);
    };

    const handleEvaluation = async (values, task) => {
        try {
            if (values.action === 'changes') {
                await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id);
                await supabase.from('task_comments').insert({ task_id: task.id, user_id: user.id, comment: `تم طلب تعديلات: ${values.feedback || ''}` });
                
                // 🔥 تسجيل طلب التعديل
                logSystemActivity(user.id, 'REQUEST_CHANGES', 'TASK', { taskId: task.id, title: task.title }, task.id);

                message.info('تم إعادة المهمة للموظف للتعديل');
            } else {
                const overall_score = ((values.speed_score + values.accuracy_score + values.creativity_score) / 3).toFixed(2);
                const { error: evalError } = await supabase.from('task_evaluations').insert({
                    task_id: task.id,
                    evaluator_id: user.id,
                    employee_id: task.assigned_to,
                    ...values,
                    overall_score,
                });
                if (evalError) throw evalError;
                await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id);
                
                // 🔥 تسجيل تقييم المهمة
                logSystemActivity(user.id, 'EVALUATE_TASK', 'TASK', { taskId: task.id, title: task.title, score: overall_score }, task.id);

                message.success('تم تقييم وإنهاء المهمة بنجاح');
            }
            setEvalModal({ visible: false, task: null });
            fetchAllData();
        } catch (error) {
            console.error('Evaluation error:', error);
            message.error('فشل حفظ التقييم');
        }
    };

    const handleDelete = async (taskId) => {
        const taskTitle = tasks.find(t => t.id === taskId)?.title || 'مهمة';
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) message.error('فشل حذف المهمة');
        else {
            // 🔥 تسجيل حذف المهمة
            logSystemActivity(user.id, 'DELETE_TASK', 'TASK', { taskId: taskId, title: taskTitle }, taskId);
            message.success('تم حذف المهمة');
        }
    };

    const columns = [
        { title: 'العنوان', dataIndex: 'title', key: 'title' },
        { title: 'المشروع', dataIndex: ['project', 'name'], key: 'project_name', render: (text) => text || <span className="text-gray-400">بدون مشروع</span> },
        { title: 'الموظف', key: 'employee', render: (_, r) => <Tooltip title={r.employee?.name_ar}><Avatar src={r.employee?.employee_photo_url} icon={<UserOutlined />} /></Tooltip> },
        { title: 'الأولوية', dataIndex: 'priority', key: 'priority', render: p => <Tag color={priorityConfig[p]?.color}>{priorityConfig[p]?.label}</Tag> },
        { title: 'الحالة', dataIndex: 'status', key: 'status', render: s => <Tag color={statusConfig[s]?.color}>{statusConfig[s]?.label}</Tag> },
        { title: 'تاريخ التسليم', dataIndex: 'due_date', key: 'due_date', render: d => d ? format(new Date(d), 'PPP', { locale: ar }) : '-' },
        { title: 'إجراءات', key: 'actions', render: (_, r) => (
            <div className="flex gap-2">
                {(r.status === 'review' || r.status === 'completed') && <Button size="sm" variant="outline" onClick={() => setEvalModal({ visible: true, task: r })}>تقييم</Button>}
                <Popconfirm title="هل أنت متأكد من حذف هذه المهمة؟" onConfirm={() => handleDelete(r.id)}><Button size="sm" variant="destructive">حذف</Button></Popconfirm>
            </div>
        )},
    ];

    const filteredTasks = useMemo(() => ({
        review: tasks.filter(t => t.status === 'review'),
        overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'),
        mine: tasks.filter(t => t.assigned_by === user.id),
    }), [tasks, user]);

    return (
        <>
            <Helmet><title>إدارة المهام</title></Helmet>
            <div className="space-y-6">
                <PageTitle title="إدارة المهام" icon={KanbanSquare} />
                <Button size="lg" onClick={() => setCreateModalVisible(true)}><PlusCircle className="ml-2" /> إنشاء مهمة جديدة</Button>
                <Card>
                    <CardContent className="p-4">
                        <Tabs defaultActiveKey="1">
                            <TabPane tab="كل المهام" key="1"><Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} /></TabPane>
                            <TabPane tab={`قيد المراجعة (${filteredTasks.review.length})`} key="2"><Table columns={columns} dataSource={filteredTasks.review} rowKey="id" loading={loading} pagination={{ pageSize: 10 }}/></TabPane>
                            <TabPane tab={`متأخرة (${filteredTasks.overdue.length})`} key="3"><Table columns={columns} dataSource={filteredTasks.overdue} rowKey="id" loading={loading} pagination={{ pageSize: 10 }}/></TabPane>
                            <TabPane tab="مهامي المعينة" key="4"><Table columns={columns} dataSource={filteredTasks.mine} rowKey="id" loading={loading} pagination={{ pageSize: 10 }}/></TabPane>
                            
                            <TabPane tab={<span><FolderKanban className="w-4 h-4 inline ml-2"/>مشاريعي</span>} key="5">
                                {myProjects.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">لا توجد مشاريع مسندة إليك كمدير مشروع</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                        {myProjects.map(project => (
                                            <ProjectCard 
                                                key={project.id} 
                                                project={project} 
                                                onCreateTask={(p) => {
                                                    navigate(`/projects/${p.id}`);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabPane>
                        </Tabs>
                    </CardContent>
                </Card>
                
                <CreateTaskModal 
                    visible={createModalVisible} 
                    onCancel={() => setCreateModalVisible(false)} 
                    onFinish={handleTaskCreated} 
                    employees={employees} 
                    projects={projects} 
                    user={user} 
                />
                
                <TaskEvaluationModal task={evalModal.task} visible={evalModal.visible} onClose={() => setEvalModal({ visible: false, task: null })} onFinish={handleEvaluation} />
            </div>
        </>
    );
};

export default TaskManagementPage;