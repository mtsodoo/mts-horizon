import React, { useState, useEffect } from 'react';
import { Tooltip } from 'antd';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar } from 'antd';
import { Calendar, DollarSign, ArrowRight, PlusCircle, MessageSquare, CheckCircle, Clock, Users } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

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

// ✅ دالة إرسال واتساب
const sendWhatsAppMessage = async (phone, message) => {
  if (!phone) return;
  const formattedPhone = phone.startsWith('966') ? phone : '966' + phone.replace(/^0/, '');
  try {
    await fetch('https://api.ultramsg.com/instance157134/messages/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: '8cmlm9zr0ildffsu',
        to: formattedPhone,
        body: message
      })
    });
  } catch (e) {
    console.error('WhatsApp error:', e);
  }
};

// ✅ العداد التنازلي
const CountdownTimer = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [colorClass, setColorClass] = useState('text-green-600 bg-green-50 border-green-200');

  useEffect(() => {
    const calculateTime = () => {
      const end = new Date(endDate);
      const now = new Date();
      
      if (isPast(end)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true });
        setColorClass('text-red-600 bg-red-50 border-red-200');
        return;
      }

      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;

      setTimeLeft({ days, hours, minutes, expired: false });

      if (days <= 1) {
        setColorClass('text-red-600 bg-red-50 border-red-200');
      } else if (days <= 3) {
        setColorClass('text-orange-600 bg-orange-50 border-orange-200');
      } else if (days <= 7) {
        setColorClass('text-yellow-600 bg-yellow-50 border-yellow-200');
      } else {
        setColorClass('text-green-600 bg-green-50 border-green-200');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!endDate) return null;

  if (timeLeft.expired) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-bold ${colorClass}`}>
        <Clock className="w-4 h-4" />
        <span>منتهي</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 px-3 py-2 rounded-xl border-2 ${colorClass}`}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <div className="flex items-center gap-1 font-mono">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black leading-none">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="text-[9px] opacity-70">يوم</span>
        </div>
        <span className="text-xl font-bold opacity-50 mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[9px] opacity-70">ساعة</span>
        </div>
        <span className="text-xl font-bold opacity-50 mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[9px] opacity-70">دقيقة</span>
        </div>
      </div>
    </div>
  );
};

const ProjectCard = ({ project, onCreateTask, onProjectComplete }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('assigned_to, employee:profiles!tasks_assigned_to_fkey(id, name_ar, employee_photo_url)')
          .eq('project_id', project.id)
          .not('assigned_to', 'is', null);

        if (data) {
          const uniqueMembers = [];
          const seenIds = new Set();
          data.forEach(task => {
            if (task.employee && !seenIds.has(task.employee.id)) {
              seenIds.add(task.employee.id);
              uniqueMembers.push(task.employee);
            }
          });
          setTeamMembers(uniqueMembers);
        }
      } catch (error) {
        console.error('Error fetching team:', error);
      }
    };

    fetchTeamMembers();
  }, [project.id]);

  // ✅ إنهاء المشروع مع واتساب
  const handleCompleteProject = async (e) => {
    e.stopPropagation();
    
    if (!window.confirm('هل أنت متأكد من إنهاء هذا المشروع؟')) return;
    
    setCompleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'completed', 
          progress_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      // ✅ إرسال واتساب
      try {
        const whatsappMessage = `🎉 تم إنهاء المشروع بنجاح

📋 المشروع: ${project.name}
👤 العميل: ${project.client_name || 'غير محدد'}
📅 تاريخ البدء: ${project.start_date || 'غير محدد'}
📅 تاريخ الإنهاء: ${new Date().toLocaleDateString('ar-SA')}
💰 الميزانية: ${project.budget ? project.budget + ' ريال' : 'غير محددة'}

✅ نسبة الإنجاز: 100%

✍️ تم الإنهاء بواسطة: ${profile?.name_ar}

شكراً لجهود الفريق! 🌟`;

        const { data: managersData } = await supabase
          .from('profiles')
          .select('phone, role')
          .in('role', ['general_manager', 'operations_manager'])
          .eq('is_active', true);

        const gm = managersData?.find(m => m.role === 'general_manager');
        if (gm?.phone) await sendWhatsAppMessage(gm.phone, whatsappMessage);

        const om = managersData?.find(m => m.role === 'operations_manager');
        if (om?.phone) await sendWhatsAppMessage(om.phone, whatsappMessage);

        if (project.project_manager?.phone) {
          await sendWhatsAppMessage(project.project_manager.phone, whatsappMessage);
        }

      } catch (whatsappError) {
        console.error('WhatsApp error:', whatsappError);
      }

      toast({ title: 'تم إنهاء المشروع بنجاح' });
      
      if (onProjectComplete) {
        onProjectComplete(project.id);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'فشل إنهاء المشروع' });
    } finally {
      setCompleting(false);
    }
  };

  const isCompleted = project.status === 'completed';

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-all duration-300 group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-bold truncate flex-1" title={project.name}>
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
      
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 h-10">
          {project.description || 'لا يوجد وصف'}
        </p>
        
        {!isCompleted && project.end_date && (
          <div className="flex justify-center">
            <CountdownTimer endDate={project.end_date} />
          </div>
        )}

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
            <span>{Number(project.budget || 0).toLocaleString()} ريال</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <Users className="w-3 h-3 text-muted-foreground" />
          <div className="flex items-center -space-x-2 space-x-reverse overflow-hidden flex-1">
            <Avatar.Group maxCount={5} size="small">
              {project.project_manager && (
                <Tooltip title={`مدير: ${project.project_manager.name_ar}`}>
                  <Avatar 
                    src={project.project_manager.employee_photo_url}
                    style={{ border: '2px solid #3b82f6' }}
                  >
                    {project.project_manager.name_ar?.charAt(0)}
                  </Avatar>
                </Tooltip>
              )}
              {teamMembers.map(member => (
                <Tooltip key={member.id} title={member.name_ar}>
                  <Avatar src={member.employee_photo_url}>
                    {member.name_ar?.charAt(0)}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          </div>
          {teamMembers.length > 0 && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              +{teamMembers.length} عضو
            </span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Button 
            className="flex-1" 
            variant="outline" 
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            التفاصيل
            <ArrowRight className="w-4 h-4 mr-2" />
          </Button>
          {onCreateTask && !isCompleted && (
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
        </div>
        
        <div className="flex gap-2 w-full">
          <Button 
            className="flex-1 gap-1" 
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}/discussion`);
            }}
          >
            <MessageSquare className="w-4 h-4" />
            مناقشة
          </Button>
          
          {!isCompleted && (
            <Button 
              className="flex-1 gap-1" 
              variant="ghost"
              size="sm"
              onClick={handleCompleteProject}
              disabled={completing}
            >
              <CheckCircle className="w-4 h-4" />
              {completing ? 'جاري...' : 'إنهاء'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;