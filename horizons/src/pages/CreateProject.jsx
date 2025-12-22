import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Helmet } from 'react-helmet';
import { FolderPlus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
// 🔥 استيراد أداة التسجيل
import { logSystemActivity } from '@/utils/omarTools';

const CreateProject = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '', description: '', client_name: '', project_type: 'external', status: 'active', priority: 'medium', start_date: '', end_date: '', budget: '', project_manager_id: '',
  });

  useEffect(() => {
    const fetchManagers = async () => {
      const { data } = await supabase.from('profiles').select('id, name_ar').eq('is_active', true);
      setManagers(data || []);
    };
    fetchManagers();
  }, []);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSelectChange = (name, value) => { setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{ ...formData, budget: parseFloat(formData.budget) || 0, created_by: user.id }])
        .select().single();

      if (projectError) throw projectError;

      // 🔥 تسجيل العملية في السجل الشامل
      logSystemActivity(
          user.id, 
          'CREATE_PROJECT', 
          'PROJECT', 
          { 
              name: formData.name, 
              client: formData.client_name,
              priority: formData.priority
          }, 
          projectData.id
      );

      // 2. Create Notification
      if (formData.project_manager_id) {
        await supabase.from('notifications').insert([{ user_id: formData.project_manager_id, type: 'project_assigned', title: 'تعيين مدير مشروع', message: `تم تعيينك كمدير مشروع: ${formData.name}`, link: `/projects/${projectData.id}` }]);
      }

      toast({ title: 'تم إنشاء المشروع', description: 'تمت إضافة المشروع الجديد بنجاح.' });
      navigate(`/projects/${projectData.id}`);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إنشاء المشروع.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>إنشاء مشروع جديد</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-6">
        <PageTitle title="إنشاء مشروع جديد" icon={FolderPlus} />
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader><CardTitle>بيانات المشروع</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>اسم المشروع *</Label><Input name="name" required value={formData.name} onChange={handleChange} placeholder="مثال: تطوير تطبيق الجوال" /></div>
              <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" value={formData.description} onChange={handleChange} rows={3} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>العميل</Label><Input name="client_name" value={formData.client_name} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>مدير المشروع</Label><Select value={formData.project_manager_id} onValueChange={(val) => handleSelectChange('project_manager_id', val)}><SelectTrigger><SelectValue placeholder="اختر مدير المشروع" /></SelectTrigger><SelectContent>{managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>تاريخ البدء</Label><Input type="date" name="start_date" value={formData.start_date} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input type="date" name="end_date" value={formData.end_date} onChange={handleChange} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2"><Label>نوع المشروع</Label><Select value={formData.project_type} onValueChange={(val) => handleSelectChange('project_type', val)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="external">خارجي (عميل)</SelectItem><SelectItem value="internal">داخلي</SelectItem></SelectContent></Select></div>
                 <div className="space-y-2"><Label>الأولوية</Label><Select value={formData.priority} onValueChange={(val) => handleSelectChange('priority', val)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">منخفضة</SelectItem><SelectItem value="medium">متوسطة</SelectItem><SelectItem value="high">عالية</SelectItem></SelectContent></Select></div>
                 <div className="space-y-2"><Label>الميزانية (ريال)</Label><Input type="number" name="budget" value={formData.budget} onChange={handleChange} placeholder="0.00" /></div>
              </div>
              <div className="pt-4 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/projects')}>إلغاء</Button>
                <Button type="submit" disabled={loading}><Save className="w-4 h-4 ml-2" />{loading ? 'جاري الحفظ...' : 'حفظ المشروع'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </>
  );
};

export default CreateProject;