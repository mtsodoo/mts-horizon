
import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpCircle, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { logSystemActivity } from '@/utils/omarTools';

const RequestOther = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال عنوان للطلب",
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare request data
      const requestData = {
        user_id: user.id,
        request_type: 'other',
        title: formData.title,
        description: formData.description || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('employee_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) throw error;

      // Log the activity
      await logSystemActivity(
        user.id, 
        'CREATE_REQUEST', 
        'REQUEST', 
        { type: 'other', title: formData.title }, 
        data.id
      );

      // Success feedback
      toast({
        title: "تم إرسال الطلب",
        description: "تم استلام طلبك بنجاح وسيتم مراجعته قريباً.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // Navigate back to requests list
      navigate('/my-requests');

    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "فشل الإرسال",
        description: error.message || "حدث خطأ أثناء إرسال الطلب.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="طلب آخر" icon={HelpCircle} />

      <Card>
        <CardHeader>
          <CardTitle>تقديم طلب جديد</CardTitle>
          <CardDescription>
            استخدم هذا النموذج لتقديم الطلبات العامة أو الإدارية التي لا تندرج تحت الفئات الأخرى.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الطلب <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="أدخل عنواناً مختصراً للطلب..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">تفاصيل الطلب</Label>
              <Textarea
                id="description"
                placeholder="اكتب تفاصيل طلبك هنا..."
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[150px]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    جاري الإرسال...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    إرسال الطلب
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestOther;
