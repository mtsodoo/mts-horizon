import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MessageSquare, FileText, Target, Lightbulb, Send, Save, 
  ArrowRight, Clock, User, CheckCircle, AlertCircle, 
  RefreshCw, Calendar, Building2, Phone, Mail, Edit2, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import PageTitle from '@/components/PageTitle';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ✅ دالة إرسال واتساب موحدة
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

const ProjectDiscussion = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [discussion, setDiscussion] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [editingSection, setEditingSection] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          project_manager:profiles!projects_project_manager_id_fkey(id, name_ar, employee_photo_url, phone)
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: discussionData, error: discussionError } = await supabase
        .from('project_discussions')
        .select(`
          *,
          creator:profiles!project_discussions_created_by_fkey(name_ar, employee_photo_url),
          approver:profiles!project_discussions_approved_by_fkey(name_ar)
        `)
        .eq('project_id', projectId)
        .single();

      if (discussionError && discussionError.code !== 'PGRST116') throw discussionError;
      setDiscussion(discussionData);

      if (discussionData) {
        const { data: commentsData } = await supabase
          .from('project_discussion_comments')
          .select(`
            *,
            user:profiles!project_discussion_comments_user_id_fkey(name_ar, employee_photo_url)
          `)
          .eq('discussion_id', discussionData.id)
          .order('created_at', { ascending: true });

        setComments(commentsData || []);
      }

    } catch (e) {
      console.error('Error:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل جلب البيانات' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSection = async (section) => {
    if (!discussion) return;
    setSaving(true);

    try {
      const updateData = {
        [section]: editedContent,
        [`${section}_updated_at`]: new Date().toISOString(),
        [`${section}_updated_by`]: user.id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('project_discussions')
        .update(updateData)
        .eq('id', discussion.id);

      if (error) throw error;

      toast({ title: 'تم الحفظ بنجاح' });
      setEditingSection(null);
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !discussion) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('project_discussion_comments')
        .insert([{
          discussion_id: discussion.id,
          user_id: user.id,
          comment: newComment,
          comment_type: activeTab === 'overview' ? 'general' : activeTab
        }]);

      if (error) throw error;

      setNewComment('');
      fetchData();
      toast({ title: 'تم إضافة التعليق' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  // ✅ تحديث حالة المناقشة مع إرسال واتساب عند الاعتماد
  const handleUpdateStatus = async (newStatus) => {
    if (!discussion) return;

    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('project_discussions')
        .update(updateData)
        .eq('id', discussion.id);

      if (error) throw error;

      // ✅ إرسال واتساب عند اعتماد المناقشة
      if (newStatus === 'completed') {
        try {
          const whatsappMessage = `✅ تم اعتماد مناقشة المشروع

📋 المشروع: ${project.name}
👤 العميل: ${project.client_name || 'غير محدد'}

📝 ملخص المناقشة:
━━━━━━━━━━━━━━
📌 الخطط: ${discussion.plans ? 'تم إضافتها' : 'لم تُضف'}
📌 الاستراتيجيات: ${discussion.strategies ? 'تم إضافتها' : 'لم تُضف'}
📌 المرئيات: ${discussion.recommendations ? 'تم إضافتها' : 'لم تُضف'}
━━━━━━━━━━━━━━

✍️ تم الاعتماد بواسطة: ${profile?.name_ar}
📅 تاريخ الاعتماد: ${new Date().toLocaleDateString('ar-SA')}

📌 يمكنكم الاطلاع على التفاصيل من خلال صفحة المشروع في النظام.`;

          // جلب أرقام المدراء
          const { data: managersData } = await supabase
            .from('profiles')
            .select('phone, role')
            .in('role', ['general_manager', 'operations_manager'])
            .eq('is_active', true);

          // إرسال للمدير العام
          const gm = managersData?.find(m => m.role === 'general_manager');
          if (gm?.phone) await sendWhatsAppMessage(gm.phone, whatsappMessage);

          // إرسال لمدير العمليات
          const om = managersData?.find(m => m.role === 'operations_manager');
          if (om?.phone) await sendWhatsAppMessage(om.phone, whatsappMessage);

          // إرسال لمدير المشروع
          if (project.project_manager?.phone) {
            await sendWhatsAppMessage(project.project_manager.phone, whatsappMessage);
          }

        } catch (whatsappError) {
          console.error('WhatsApp error:', whatsappError);
        }
      }

      toast({ title: 'تم تحديث الحالة' });
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  const startEditing = (section, content) => {
    setEditingSection(section);
    setEditedContent(content || '');
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200'
    };
    const labels = {
      pending: 'قيد الانتظار',
      in_progress: 'جاري المناقشة',
      completed: 'مكتمل'
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const EditableSection = ({ title, icon: Icon, section, content, color }) => (
    <Card className={`border-t-4 ${color}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </CardTitle>
          {editingSection !== section && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => startEditing(section, content)}
            >
              <Edit2 className="w-4 h-4 ml-1" />
              تعديل
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editingSection === section ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={6}
              placeholder={`أدخل ${title}...`}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditingSection(null)}
              >
                <X className="w-4 h-4 ml-1" />
                إلغاء
              </Button>
              <Button 
                size="sm"
                onClick={() => handleSaveSection(section)}
                disabled={saving}
              >
                <Save className="w-4 h-4 ml-1" />
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[100px]">
            {content ? (
              <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
            ) : (
              <p className="text-gray-400 italic">لم يتم إضافة {title} بعد</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-600">المشروع غير موجود</h2>
        <Button variant="link" onClick={() => navigate('/projects')}>
          العودة للمشاريع
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 pb-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <PageTitle title="مناقشة المشروع" icon={MessageSquare} />
        </div>
        {discussion && getStatusBadge(discussion.status)}
      </div>

      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
              {project.description && (
                <p className="text-sm text-gray-600">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {project.client_name && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{project.client_name}</span>
                  </div>
                )}
                {project.end_date && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(project.end_date), 'dd MMMM yyyy', { locale: ar })}</span>
                  </div>
                )}
              </div>
            </div>
            
            {project.project_manager && (
              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                <Avatar>
                  <AvatarImage src={project.project_manager.employee_photo_url} />
                  <AvatarFallback>{project.project_manager.name_ar?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-gray-500">مدير المشروع</p>
                  <p className="font-medium">{project.project_manager.name_ar}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {discussion && (profile?.role === 'general_manager' || profile?.role === 'admin') && (
        <div className="flex gap-2">
          <Button
            variant={discussion.status === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleUpdateStatus('pending')}
          >
            قيد الانتظار
          </Button>
          <Button
            variant={discussion.status === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleUpdateStatus('in_progress')}
          >
            جاري المناقشة
          </Button>
          <Button
            variant={discussion.status === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleUpdateStatus('completed')}
            className={discussion.status === 'completed' ? 'bg-green-600' : ''}
          >
            <CheckCircle className="w-4 h-4 ml-1" />
            اعتماد
          </Button>
        </div>
      )}

      {discussion ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="plans">الخطط</TabsTrigger>
            <TabsTrigger value="strategies">الاستراتيجيات</TabsTrigger>
            <TabsTrigger value="recommendations">المرئيات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-t-4 border-t-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    الخطط
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {discussion.plans || 'لم يتم إضافة خطط بعد'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    الاستراتيجيات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {discussion.strategies || 'لم يتم إضافة استراتيجيات بعد'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    المرئيات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {discussion.recommendations || 'لم يتم إضافة مرئيات بعد'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="plans">
            <EditableSection
              title="الخطط"
              icon={FileText}
              section="plans"
              content={discussion.plans}
              color="border-t-purple-500"
            />
          </TabsContent>

          <TabsContent value="strategies">
            <EditableSection
              title="الاستراتيجيات"
              icon={Target}
              section="strategies"
              content={discussion.strategies}
              color="border-t-blue-500"
            />
          </TabsContent>

          <TabsContent value="recommendations">
            <EditableSection
              title="المرئيات"
              icon={Lightbulb}
              section="recommendations"
              content={discussion.recommendations}
              color="border-t-amber-500"
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد مناقشة لهذا المشروع</h3>
          <p className="text-gray-500 mb-4">سيتم إنشاء صفحة المناقشة تلقائياً عند إنشاء المشروع</p>
        </Card>
      )}

      {discussion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              التعليقات والملاحظات ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد تعليقات بعد</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.user?.employee_photo_url} />
                      <AvatarFallback>{comment.user?.name_ar?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user?.name_ar}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(comment.created_at), 'dd/MM HH:mm')}
                        </span>
                        {comment.comment_type !== 'general' && (
                          <Badge variant="outline" className="text-[10px]">
                            {comment.comment_type === 'plans' ? 'خطط' : 
                             comment.comment_type === 'strategies' ? 'استراتيجيات' : 
                             comment.comment_type === 'recommendations' ? 'مرئيات' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="أضف تعليقاً..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim() || saving}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default ProjectDiscussion;