import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Helmet } from 'react-helmet';
import { FolderPlus, Save, Search, Plus, User, Building2, Phone, Mail, MapPin, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { logSystemActivity } from '@/utils/omarTools';
import { motion, AnimatePresence } from 'framer-motion';

const CLIENT_TYPES = [
  { value: 'company', label: 'شركة' },
  { value: 'individual', label: 'فرد' },
  { value: 'government', label: 'جهة حكومية' },
];

const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة',
  'الخبر', 'الطائف', 'بريدة', 'تبوك', 'خميس مشيط',
  'حائل', 'نجران', 'الأحساء', 'أخرى'
];

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

const CreateProject = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    company_name: '',
    client_type: 'company',
    address: '',
    city: '',
    notes: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_name: '',
    client_id: null,
    project_type: 'external',
    status: 'active',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: '',
    project_manager_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const [managersRes, clientsRes] = await Promise.all([
        supabase.from('profiles').select('id, name_ar').eq('is_active', true),
        supabase.from('project_clients').select('*').eq('is_active', true).order('client_name')
      ]);
      setManagers(managersRes.data || []);
      setClients(clientsRes.data || []);
    };
    fetchData();
  }, []);

  const filteredClients = clients.filter(c => 
    c.client_name?.includes(clientSearch) || 
    c.company_name?.includes(clientSearch) ||
    c.client_phone?.includes(clientSearch)
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientSearchChange = (e) => {
    const value = e.target.value;
    setClientSearch(value);
    setShowClientDropdown(true);
    
    if (!value) {
      setSelectedClient(null);
      setFormData(prev => ({ ...prev, client_name: '', client_id: null }));
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(client.client_name);
    setFormData(prev => ({ 
      ...prev, 
      client_name: client.client_name,
      client_id: client.id 
    }));
    setShowClientDropdown(false);
  };

  const handleAddNewClient = () => {
    setNewClientData({
      client_name: clientSearch,
      client_phone: '',
      client_email: '',
      company_name: '',
      client_type: 'company',
      address: '',
      city: '',
      notes: ''
    });
    setIsNewClientModalOpen(true);
    setShowClientDropdown(false);
  };

  const handleSaveNewClient = async () => {
    if (!newClientData.client_name) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اسم العميل مطلوب' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_clients')
        .insert([{ ...newClientData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [data, ...prev]);
      setSelectedClient(data);
      setClientSearch(data.client_name);
      setFormData(prev => ({ 
        ...prev, 
        client_name: data.client_name,
        client_id: data.id 
      }));
      
      setIsNewClientModalOpen(false);
      toast({ title: 'تم إضافة العميل بنجاح' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message });
    }
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setFormData(prev => ({ ...prev, client_name: '', client_id: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{ 
          ...formData, 
          budget: parseFloat(formData.budget) || 0, 
          created_by: user.id 
        }])
        .select()
        .single();

      if (projectError) throw projectError;

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

      if (formData.project_manager_id) {
        await supabase.from('notifications').insert([{ 
          user_id: formData.project_manager_id, 
          type: 'project_assigned', 
          title: 'تعيين مدير مشروع', 
          message: `تم تعيينك كمدير مشروع: ${formData.name}`, 
          link: `/projects/${projectData.id}` 
        }]);
      }

      const { error: discussionError } = await supabase
        .from('project_discussions')
        .insert([{
          project_id: projectData.id,
          status: 'pending',
          created_by: user.id
        }]);

      if (discussionError) console.error('Discussion creation error:', discussionError);

      // ✅ إرسال واتساب للمدراء
      try {
        const whatsappMessage = `🆕 مشروع جديد

📋 ${formData.name}
👤 العميل: ${formData.client_name || 'غير محدد'}
📅 البدء: ${formData.start_date || 'غير محدد'}
📅 الانتهاء: ${formData.end_date || 'غير محدد'}
💰 الميزانية: ${formData.budget ? formData.budget + ' ريال' : 'غير محددة'}

📌 لإكمال تفاصيل المشروع ومناقشته، يرجى زيارة صفحة مناقشة المشروع من خلال النظام.

✍️ تم الإنشاء بواسطة: ${profile?.name_ar || 'مدير المشاريع'}`;

        const { data: managersData } = await supabase
          .from('profiles')
          .select('phone, role')
          .in('role', ['general_manager', 'operations_manager'])
          .eq('is_active', true);

        const gm = managersData?.find(m => m.role === 'general_manager');
        if (gm?.phone) await sendWhatsAppMessage(gm.phone, whatsappMessage);

        const om = managersData?.find(m => m.role === 'operations_manager');
        if (om?.phone) await sendWhatsAppMessage(om.phone, whatsappMessage);

        if (formData.project_manager_id && formData.project_manager_id !== user.id) {
          const { data: pmData } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', formData.project_manager_id)
            .single();

          if (pmData?.phone) await sendWhatsAppMessage(pmData.phone, whatsappMessage);
        }

      } catch (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
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
              
              <div className="space-y-2">
                <Label>اسم المشروع *</Label>
                <Input 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="مثال: تطوير تطبيق الجوال" 
                />
              </div>
              
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  rows={3} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2 relative">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    العميل
                  </Label>
                  
                  {selectedClient ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-green-800">{selectedClient.client_name}</p>
                        {selectedClient.company_name && (
                          <p className="text-xs text-green-600">{selectedClient.company_name}</p>
                        )}
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:bg-green-100"
                        onClick={handleClearClient}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        value={clientSearch}
                        onChange={handleClientSearchChange}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="ابحث عن عميل أو أضف جديد..."
                        className="pr-10"
                      />
                      
                      <AnimatePresence>
                        {showClientDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            <button
                              type="button"
                              onClick={handleAddNewClient}
                              className="w-full p-3 text-right flex items-center gap-2 hover:bg-teal-50 text-teal-600 border-b"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="font-medium">
                                {clientSearch ? `إضافة "${clientSearch}" كعميل جديد` : 'إضافة عميل جديد'}
                              </span>
                            </button>
                            
                            {filteredClients.length > 0 ? (
                              filteredClients.slice(0, 5).map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleSelectClient(client)}
                                  className="w-full p-3 text-right flex items-center gap-3 hover:bg-gray-50 border-b last:border-0"
                                >
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{client.client_name}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {client.company_name || client.client_phone || 'بدون تفاصيل'}
                                    </p>
                                  </div>
                                  {client.client_type && (
                                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full">
                                      {CLIENT_TYPES.find(t => t.value === client.client_type)?.label}
                                    </span>
                                  )}
                                </button>
                              ))
                            ) : clientSearch ? (
                              <div className="p-3 text-center text-gray-500 text-sm">
                                لا يوجد عميل بهذا الاسم
                              </div>
                            ) : null}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>مدير المشروع</Label>
                  <Select 
                    value={formData.project_manager_id} 
                    onValueChange={(val) => handleSelectChange('project_manager_id', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مدير المشروع" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ البدء</Label>
                  <Input 
                    type="date" 
                    name="start_date" 
                    value={formData.start_date} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء</Label>
                  <Input 
                    type="date" 
                    name="end_date" 
                    value={formData.end_date} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع المشروع</Label>
                  <Select 
                    value={formData.project_type} 
                    onValueChange={(val) => handleSelectChange('project_type', val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">خارجي (عميل)</SelectItem>
                      <SelectItem value="internal">داخلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(val) => handleSelectChange('priority', val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الميزانية (ريال)</Label>
                  <Input 
                    type="number" 
                    name="budget" 
                    value={formData.budget} 
                    onChange={handleChange} 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              
              <div className="pt-4 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 ml-2" />
                  {loading ? 'جاري الحفظ...' : 'حفظ المشروع'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      <Dialog open={isNewClientModalOpen} onOpenChange={setIsNewClientModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-600" />
              إضافة عميل جديد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم العميل <span className="text-red-500">*</span></Label>
                <Input
                  value={newClientData.client_name}
                  onChange={(e) => setNewClientData({ ...newClientData, client_name: e.target.value })}
                  placeholder="الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع العميل</Label>
                <Select 
                  value={newClientData.client_type} 
                  onValueChange={(val) => setNewClientData({ ...newClientData, client_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>اسم الشركة / الجهة</Label>
              <Input
                value={newClientData.company_name}
                onChange={(e) => setNewClientData({ ...newClientData, company_name: e.target.value })}
                placeholder="شركة ABC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  رقم الجوال
                </Label>
                <Input
                  value={newClientData.client_phone}
                  onChange={(e) => setNewClientData({ ...newClientData, client_phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  البريد الإلكتروني
                </Label>
                <Input
                  type="email"
                  value={newClientData.client_email}
                  onChange={(e) => setNewClientData({ ...newClientData, client_email: e.target.value })}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  المدينة
                </Label>
                <Select 
                  value={newClientData.city} 
                  onValueChange={(val) => setNewClientData({ ...newClientData, city: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={newClientData.address}
                  onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                  placeholder="الحي، الشارع"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={newClientData.notes}
                onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewClientModalOpen(false)}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button onClick={handleSaveNewClient} className="bg-teal-600 hover:bg-teal-700">
              <Check className="w-4 h-4 ml-2" />
              حفظ وإضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showClientDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowClientDropdown(false)}
        />
      )}
    </>
  );
};

export default CreateProject;