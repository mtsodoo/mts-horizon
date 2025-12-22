import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import {
  User, Mail, Phone, Hash, Calendar, Flag, Users, Briefcase, FileText,
  DollarSign, Home, Car, Plus, Edit, ArrowRight, Activity, Clock, Award
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Helmet } from 'react-helmet'; // Added Helmet import

const roleTranslation = {
  'general_manager': 'مدير عام',
  'department_head': 'مدير قسم',
  'project_manager': 'مدير مشروع',
  'finance': 'مالي',
  'employee': 'موظف عادي',
  'admin': 'أدمن',
};

const roleColors = {
  'general_manager': 'bg-blue-500 text-white',
  'admin': 'bg-purple-500 text-white',
  'employee': 'bg-green-500 text-white',
  'default': 'bg-gray-500 text-white'
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center text-sm">
    <div className="flex-shrink-0 w-8 text-center">{icon}</div>
    <span className="font-semibold text-muted-foreground mr-2">{label}:</span>
    <span className="text-foreground">{value || 'غير محدد'}</span>
  </div>
);

const StatCard = ({ icon, title, value }) => (
  <Card className="text-center">
    <CardContent className="p-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-2 text-blue-500">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </CardContent>
  </Card>
);

const EditProfileForm = ({ profileData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: profileData?.name || '',
    email: profileData?.email || '',
    national_id: profileData?.national_id || '',
    birth_date: profileData?.birth_date ? format(new Date(profileData.birth_date), 'yyyy-MM-dd') : '',
    nationality: profileData?.nationality || 'سعودي',
    gender: profileData?.gender || 'ذكر',
    role: profileData?.role || 'employee',
    department: profileData?.department || '',
    job_title: profileData?.job_title || '',
    contract_type: profileData?.contract_type || 'دوام كامل',
    base_salary: profileData?.base_salary || 0,
    housing_allowance: profileData?.housing_allowance || 0,
    transportation_allowance: profileData?.transportation_allowance || 0,
    other_allowances: profileData?.other_allowances || 0,
    annual_leave_balance: profileData?.annual_leave_balance || 30,
    sick_leave_balance: profileData?.sick_leave_balance || 30,
    address: profileData?.address || '',
    emergency_contact: profileData?.emergency_contact || '',
    notes: profileData?.notes || '',
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  const formSectionStyles = "grid grid-cols-1 md:grid-cols-2 gap-4 p-4";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
       <Accordion type="multiple" defaultValue={['personal']} className="w-full">
            <AccordionItem value="personal">
                <AccordionTrigger className="font-bold">المعلومات الشخصية</AccordionTrigger>
                <AccordionContent className={formSectionStyles}>
                    <div><Label>الاسم الكامل</Label><Input name="name" value={formData.name} onChange={handleChange}/></div>
                    <div><Label>البريد الإلكتروني</Label><Input name="email" value={formData.email} onChange={handleChange}/></div>
                    <div><Label>رقم الهوية</Label><Input name="national_id" value={formData.national_id} onChange={handleChange}/></div>
                    <div><Label>تاريخ الميلاد</Label><Input name="birth_date" type="date" value={formData.birth_date} onChange={handleChange}/></div>
                    <div><Label>الجنسية</Label><Input name="nationality" value={formData.nationality} onChange={handleChange}/></div>
                    <div><Label>الجنس</Label><Select name="gender" value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem></SelectContent></Select></div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="employment">
                <AccordionTrigger className="font-bold">معلومات التوظيف</AccordionTrigger>
                <AccordionContent className={formSectionStyles}>
                    <div><Label>الدور</Label><Select name="role" value={formData.role} onValueChange={(v) => handleSelectChange('role', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(roleTranslation).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>القسم</Label><Input name="department" value={formData.department} onChange={handleChange}/></div>
                    <div><Label>المسمى الوظيفي</Label><Input name="job_title" value={formData.job_title} onChange={handleChange}/></div>
                    <div><Label>نوع العقد</Label><Select name="contract_type" value={formData.contract_type} onValueChange={(v) => handleSelectChange('contract_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="دوام كامل">دوام كامل</SelectItem><SelectItem value="دوام جزئي">دوام جزئي</SelectItem><SelectItem value="مؤقت">مؤقت</SelectItem></SelectContent></Select></div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="financial">
                <AccordionTrigger className="font-bold">المعلومات المالية</AccordionTrigger>
                <AccordionContent className={formSectionStyles}>
                    <div><Label>الراتب الأساسي</Label><Input type="number" name="base_salary" value={formData.base_salary} onChange={handleChange}/></div>
                    <div><Label>بدل السكن</Label><Input type="number" name="housing_allowance" value={formData.housing_allowance} onChange={handleChange}/></div>
                    <div><Label>بدل المواصلات</Label><Input type="number" name="transportation_allowance" value={formData.transportation_allowance} onChange={handleChange}/></div>
                    <div><Label>بدلات أخرى</Label><Input type="number" name="other_allowances" value={formData.other_allowances} onChange={handleChange}/></div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="leave">
                <AccordionTrigger className="font-bold">رصيد الإجازات</AccordionTrigger>
                <AccordionContent className={formSectionStyles}>
                    <div><Label>رصيد الإجازات السنوية</Label><Input type="number" name="annual_leave_balance" value={formData.annual_leave_balance} onChange={handleChange}/></div>
                    <div><Label>رصيد الإجازات المرضية</Label><Input type="number" name="sick_leave_balance" value={formData.sick_leave_balance} onChange={handleChange}/></div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="additional">
                <AccordionTrigger className="font-bold">معلومات إضافية</AccordionTrigger>
                <AccordionContent className={formSectionStyles}>
                    <div className="md:col-span-2"><Label>العنوان</Label><Textarea name="address" value={formData.address} onChange={handleChange}/></div>
                    <div><Label>رقم الطوارئ</Label><Input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange}/></div>
                    <div className="md:col-span-2"><Label>ملاحظات</Label><Textarea name="notes" value={formData.notes} onChange={handleChange}/></div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
        <Button type="submit">حفظ التغييرات</Button>
      </div>
    </form>
  );
};


const ProfilePage = () => {
  const { id } = useParams();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ presentDays: 0, totalHours: 0, leavesTaken: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const profileId = id || user?.id;
  const isOwnProfile = !id || id === user?.id;
  const canEdit = currentUserProfile?.role === 'general_manager' || isOwnProfile;

  const fetchData = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError || !profileData) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على ملف الموظف.' });
      navigate('/');
      return;
    }
    setProfile(profileData);

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('work_date, check_in, check_out')
      .eq('user_id', profileId)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd);

    if (attendanceError) console.error('Error fetching attendance stats:', attendanceError);
    if (attendanceData) {
      const presentDays = new Set(attendanceData.map(r => r.work_date)).size;
      const totalHours = attendanceData.reduce((acc, curr) => {
        if (curr.check_in && curr.check_out) {
          const minutes = differenceInMinutes(parseISO(curr.check_out), parseISO(curr.check_in));
          return acc + minutes / 60;
        }
        return acc;
      }, 0);
      setStats({ presentDays, totalHours: Math.round(totalHours), leavesTaken: 0 }); // Placeholder for leaves
    }

    setLoading(false);
  }, [profileId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveProfile = async (formData) => {
     const dbData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === '' ? null : value])
    );
    const { error } = await supabase.from('profiles').update(dbData).eq('id', profileId);
    if (error) {
      toast({ variant: 'destructive', title: 'فشل التحديث', description: error.message });
    } else {
      toast({ title: 'نجاح', description: 'تم تحديث الملف الشخصي.' });
      setIsEditing(false);
      fetchData();
    }
  };

  const totalSalary = useMemo(() => {
    if (!profile) return 0;
    return (
      (profile.base_salary || 0) +
      (profile.housing_allowance || 0) +
      (profile.transportation_allowance || 0) +
      (profile.other_allowances || 0)
    );
  }, [profile]);

  if (loading) return <div className="flex h-full items-center justify-center">جاري تحميل الملف الشخصي...</div>;
  if (!profile) return <div className="flex h-full items-center justify-center text-red-500">لا يمكن عرض الملف الشخصي.</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Helmet>
        <title>{`الملف الشخصي: ${profile?.name || 'Loading...'}`}</title>
      </Helmet>
      {/* Header */}
      <div className="flex justify-between items-start">
        {!isOwnProfile && (
            <Button variant="ghost" onClick={() => navigate('/employees')} className="mb-4">
            <ArrowRight className="ml-2 h-4 w-4" /> العودة إلى الموظفين
            </Button>
        )}
        <div className="flex-grow"></div>
         {canEdit && <Button onClick={() => setIsEditing(true)}><Edit className="ml-2 h-4 w-4"/> تعديل الملف</Button>}
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-8 text-center relative">
          <div className="w-28 h-28 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg -mb-14 relative z-10">
            <User className="w-16 h-16 text-blue-500"/>
          </div>
        </div>
        <CardContent className="pt-20 text-center">
            <h2 className="text-3xl font-bold">{profile.name}</h2>
            <p className="text-muted-foreground">{profile.job_title || 'غير محدد'}</p>
            <div className="flex justify-center items-center gap-2 mt-2">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${roleColors[profile.role] || roleColors.default}`}>{roleTranslation[profile.role] || profile.role}</span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{profile.is_active ? 'نشط' : 'معطل'}</span>
            </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Activity />} title="أيام الحضور هذا الشهر" value={stats.presentDays} />
        <StatCard icon={<Clock />} title="إجمالي ساعات العمل هذا الشهر" value={stats.totalHours} />
        <StatCard icon={<Award />} title="الإجازات المستخدمة هذا العام" value={stats.leavesTaken} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal & Employment Info */}
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>المعلومات الشخصية</CardTitle></CardHeader><CardContent className="space-y-3"><InfoRow icon={<User/>} label="الاسم الكامل" value={profile.name} /><InfoRow icon={<Phone/>} label="رقم الجوال" value={profile.phone} /><InfoRow icon={<Mail/>} label="البريد الإلكتروني" value={profile.email} /><InfoRow icon={<Hash/>} label="رقم الهوية" value={profile.national_id} /><InfoRow icon={<Calendar/>} label="تاريخ الميلاد" value={profile.birth_date ? format(parseISO(profile.birth_date), 'PPP', {locale: ar}) : ''} /><InfoRow icon={<Flag/>} label="الجنسية" value={profile.nationality} /><InfoRow icon={<Users/>} label="الجنس" value={profile.gender} /></CardContent></Card>
          <Card><CardHeader><CardTitle>معلومات التوظيف</CardTitle></CardHeader><CardContent className="space-y-3"><InfoRow icon={<Briefcase/>} label="الدور الوظيفي" value={roleTranslation[profile.role]} /><InfoRow icon={<Users/>} label="القسم" value={profile.department} /><InfoRow icon={<Award/>} label="المسمى الوظيفي" value={profile.job_title} /><InfoRow icon={<Calendar/>} label="تاريخ التوظيف" value={profile.hire_date ? format(parseISO(profile.hire_date), 'PPP', {locale: ar}) : ''} /><InfoRow icon={<FileText/>} label="نوع العقد" value={profile.contract_type} /></CardContent></Card>
        </div>

        {/* Financial & Leave Info */}
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>المعلومات المالية</CardTitle></CardHeader><CardContent className="space-y-3"><InfoRow icon={<DollarSign/>} label="الراتب الأساسي" value={new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(profile.base_salary || 0)} /><InfoRow icon={<Home/>} label="بدل السكن" value={new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(profile.housing_allowance || 0)} /><InfoRow icon={<Car/>} label="بدل المواصلات" value={new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(profile.transportation_allowance || 0)} /><InfoRow icon={<Plus/>} label="البدلات الأخرى" value={new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(profile.other_allowances || 0)} /><hr/><InfoRow icon={<DollarSign className="text-green-500"/>} label="إجمالي الراتب" value={<span className="font-bold text-green-500">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(totalSalary)}</span>} /></CardContent></Card>
          <Card><CardHeader><CardTitle>رصيد الإجازات</CardTitle></CardHeader><CardContent className="space-y-4"><div><div className="flex justify-between mb-1 text-sm"><p>الإجازات السنوية</p><p>{profile.annual_leave_balance || 0} يوم متبقي</p></div><Progress value={((profile.annual_leave_balance || 0) / 30) * 100} /></div><div><div className="flex justify-between mb-1 text-sm"><p>الإجازات المرضية</p><p>{profile.sick_leave_balance || 0} يوم متبقي</p></div><Progress value={((profile.sick_leave_balance || 0) / 30) * 100} /></div></CardContent></Card>
        </div>
      </div>
      
       <Card><CardHeader><CardTitle>معلومات إضافية</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm"><strong className="text-muted-foreground">العنوان:</strong> {profile.address || 'غير محدد'}</p><p className="text-sm"><strong className="text-muted-foreground">رقم الطوارئ:</strong> {profile.emergency_contact || 'غير محدد'}</p><p className="text-sm"><strong className="text-muted-foreground">ملاحظات:</strong> {profile.notes || 'لا يوجد'}</p></CardContent></Card>
       
       <Dialog open={isEditing} onOpenChange={setIsEditing}>
         <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>تعديل الملف الشخصي لـ: {profile.name}</DialogTitle>
           </DialogHeader>
           {isEditing && <EditProfileForm profileData={profile} onSave={handleSaveProfile} onCancel={() => setIsEditing(false)} />}
         </DialogContent>
       </Dialog>

    </motion.div>
  );
};

export default ProfilePage;