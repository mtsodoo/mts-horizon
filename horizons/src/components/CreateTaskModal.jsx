import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, DatePicker, Select } from 'antd';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import TaskFileUpload from '@/components/TaskFileUpload';
import { uploadTaskFiles } from '@/utils/taskUtils';
import { logSystemActivity } from '@/utils/omarTools';

const { Option } = Select;
const { TextArea } = Input;

const CreateTaskModal = ({ 
    visible, 
    onCancel, 
    onFinish, 
    employees = [], 
    projects = [], 
    defaultProjectId = null, 
    defaultProjectName = null 
}) => {
    const [form] = Form.useForm();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [filesData, setFilesData] = useState({ files: [], notes: '' });

    useEffect(() => {
        if (visible) {
            form.resetFields();
            setFilesData({ files: [], notes: '' });
            if (defaultProjectId) {
                form.setFieldsValue({ 
                    project_id: defaultProjectId,
                    created_from: 'project'
                });
            } else {
                form.setFieldsValue({ created_from: 'manual' });
            }
        }
    }, [visible, defaultProjectId, form]);

    const handleFilesChange = useCallback((data) => {
        setFilesData(data);
    }, []);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const taskData = {
                title: values.title,
                description: values.description,
                assigned_to: values.assigned_to,
                assigned_by: user.id,
                priority: values.priority,
                status: 'pending',
                due_date: values.due_date ? values.due_date.toISOString() : null,
                estimated_hours: values.estimated_hours ? Math.min(Math.max(Number(values.estimated_hours), 0), 99999.99) : 0, // 🔥 حد أقصى 99999.99
                project_id: values.project_id || null,
                created_from: values.created_from || 'manual',
                tags: values.tags || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data: newTask, error: taskError } = await supabase
                .from('tasks')
                .insert(taskData)
                .select()
                .single();

            if (taskError) {
                throw new Error(`فشل إنشاء السجل: ${taskError.message}`);
            }

            if (!newTask) {
                throw new Error("تم إنشاء المهمة ولكن لم يتم استرجاع البيانات.");
            }

            const taskId = newTask.id;

            if (logSystemActivity) {
                await logSystemActivity(
                    user.id, 
                    'CREATE_TASK', 
                    'TASK', 
                    { 
                        title: values.title, 
                        project_id: values.project_id,
                        assigned_to: values.assigned_to 
                    }, 
                    taskId
                );
            }

            // 🔥 رفع الملفات مع projectId
            if (filesData.files && filesData.files.length > 0) {
                try {
                    await uploadTaskFiles(
                        filesData.files,
                        taskId,
                        values.project_id,
                        user.id,
                        filesData.notes
                    );
                } catch (fileError) {
                    console.error("File upload error:", fileError);
                    toast({ variant: "warning", title: "تنبيه", description: "تم إنشاء المهمة ولكن فشل رفع بعض الملفات." });
                }
            }

            if (values.assigned_to && values.assigned_to !== user.id) {
                try {
                    const projectName = defaultProjectName || projects.find(p => p.id === values.project_id)?.name || 'مهمة جديدة';
                    
                    await supabase.from('notifications').insert({
                        user_id: values.assigned_to,
                        type: 'task_assigned',
                        title: 'مهمة جديدة',
                        message: `تم تعيين مهمة جديدة لك: ${values.title} (مشروع: ${projectName})`,
                        link: '/my-tasks'
                    });
                } catch (notifError) {
                    console.warn("Notification failed:", notifError);
                }
            }

            toast({ title: "نجاح", description: "تم إنشاء المهمة بنجاح" });
            
            if (onFinish) onFinish(newTask);
            onCancel();
        } catch (error) {
            console.error('Error creating task:', error);
            toast({ variant: "destructive", title: "خطأ", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="إضافة مهمة جديدة"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    priority: 'medium',
                    created_from: 'manual'
                }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                        name="title"
                        label="عنوان المهمة"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <Input placeholder="عنوان المهمة" />
                    </Form.Item>

                    <Form.Item
                        name="assigned_to"
                        label="تعيين إلى"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <Select 
                            placeholder="اختر الموظف" 
                            showSearch 
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {employees.map(emp => (
                                <Option key={emp.id} value={emp.id}>{emp.name_ar || emp.email || 'مستخدم غير معروف'}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                        name="priority"
                        label="الأولوية"
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value="low">منخفضة</Option>
                            <Option value="medium">متوسطة</Option>
                            <Option value="high">عالية</Option>
                            <Option value="urgent">عاجلة</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="due_date"
                        label="تاريخ الاستحقاق"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                        name="project_id"
                        label="المشروع (اختياري)"
                    >
                        <Select 
                            placeholder="اختر المشروع" 
                            disabled={!!defaultProjectId}
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {projects.map(proj => (
                                <Option key={proj.id} value={proj.id}>{proj.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="estimated_hours"
                        label="الساعات المقدرة"
                    >
                        <Input type="number" min={0} max={99999} step={0.01} placeholder="0" />
                    </Form.Item>
                </div>

                <Form.Item
                    name="description"
                    label="وصف المهمة"
                    rules={[{ required: true, message: 'مطلوب' }]}
                >
                    <TextArea rows={4} placeholder="تفاصيل المهمة..." />
                </Form.Item>
                
                <Form.Item name="created_from" hidden>
                    <Input />
                </Form.Item>

                <div className="mb-6 border rounded-md p-4 bg-gray-50">
                    <h4 className="mb-2 font-medium">المرفقات</h4>
                    <TaskFileUpload 
                        mode="deferred" 
                        projectId={form.getFieldValue('project_id')}
                        onFilesChange={handleFilesChange} 
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        إلغاء
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default CreateTaskModal;