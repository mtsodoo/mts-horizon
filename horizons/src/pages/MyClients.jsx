
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Plus, Edit2, Trash2, Save, X, Phone, Mail, 
  Building2, MapPin, FileText, RefreshCw, User, Briefcase,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import PageTitle from '@/components/PageTitle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ✅ أنواع العملاء
const CLIENT_TYPES = [
  { value: 'company', label: 'شركة' },
  { value: 'individual', label: 'فرد' },
  { value: 'government', label: 'جهة حكومية' },
];

// ✅ المدن
const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة',
  'الخبر', 'الطائف', 'بريدة', 'تبوك', 'خميس مشيط',
  'حائل', 'نجران', 'الأحساء', 'أخرى'
];

const MyClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    company_name: '',
    client_type: 'company',
    address: '',
    city: '',
    notes: ''
  });

  // ✅ جلب العملاء
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_clients')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (e) {
      console.error('Error:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل جلب العملاء' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ✅ فلترة العملاء
  const filteredClients = clients.filter(c => 
    c.client_name?.includes(searchTerm) || 
    c.company_name?.includes(searchTerm) ||
    c.client_phone?.includes(searchTerm)
  );

  // ✅ إحصائيات
  const stats = {
    total: clients.length,
    companies: clients.filter(c => c.client_type === 'company').length,
    individuals: clients.filter(c => c.client_type === 'individual').length,
    government: clients.filter(c => c.client_type === 'government').length,
  };

  // ✅ فتح نافذة الإضافة
  const handleAddNew = () => {
    setIsAddMode(true);
    setFormData({
      client_name: '',
      client_phone: '',
      client_email: '',
      company_name: '',
      client_type: 'company',
      address: '',
      city: '',
      notes: ''
    });
    setIsDialogOpen(true);
  };

  // ✅ فتح نافذة التعديل
  const handleEdit = (client) => {
    setIsAddMode(false);
    setEditingClient(client);
    setFormData({
      client_name: client.client_name || '',
      client_phone: client.client_phone || '',
      client_email: client.client_email || '',
      company_name: client.company_name || '',
      client_type: client.client_type || 'company',
      address: client.address || '',
      city: client.city || '',
      notes: client.notes || ''
    });
    setIsDialogOpen(true);
  };

  // ✅ حفظ العميل
  const handleSave = async () => {
    if (!formData.client_name) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'اسم العميل مطلوب' });
      return;
    }

    try {
      if (isAddMode) {
        const { error } = await supabase
          .from('project_clients')
          .insert([{ ...formData, created_by: user?.id }]);

        if (error) throw error;
        toast({ title: 'تم إضافة العميل بنجاح' });
      } else {
        const { error } = await supabase
          .from('project_clients')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({ title: 'تم تحديث العميل بنجاح' });
      }

      setIsDialogOpen(false);
      fetchClients();
    } catch (e) {
      console.error('Save error:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  // ✅ حذف عميل
  const handleDelete = async (client) => {
    // Fixed: Use window.confirm instead of global confirm to satisfy linter
    if (!window.confirm(`هل تريد حذف "${client.client_name}"؟`)) return;

    try {
      const { error } = await supabase
        .from('project_clients')
        .update({ is_active: false })
        .eq('id', client.id);

      if (error) throw error;
      toast({ title: 'تم حذف العميل' });
      fetchClients();
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  // ✅ الحصول على لون نوع العميل
  const getTypeColor = (type) => {
    switch (type) {
      case 'company': return 'bg-blue-100 text-blue-700';
      case 'individual': return 'bg-green-100 text-green-700';
      case 'government': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type) => {
    return CLIENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 pb-8"
    >
      <PageTitle title="عملائي" icon={Users} />

      {/* ✅ إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي العملاء</p>
              <p className="text-xl font-bold text-blue-700">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">شركات</p>
              <p className="text-xl font-bold text-indigo-700">{stats.companies}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">أفراد</p>
              <p className="text-xl font-bold text-green-700">{stats.individuals}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">جهات حكومية</p>
              <p className="text-xl font-bold text-purple-700">{stats.government}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ أدوات البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم أو الشركة أو الجوال..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Button onClick={fetchClients} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 ml-2" />
              إضافة عميل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ✅ قائمة العملاء */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            العملاء ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">جاري التحميل...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>لا يوجد عملاء</p>
              <Button onClick={handleAddNew} variant="link" className="mt-2 text-teal-600">
                أضف عميل جديد
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="rounded-xl p-4 border bg-white hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{client.client_name}</h3>
                        {client.company_name && (
                          <p className="text-xs text-gray-500">{client.company_name}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${getTypeColor(client.client_type)}`}>
                      {getTypeLabel(client.client_type)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.client_phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span dir="ltr">{client.client_phone}</span>
                      </div>
                    )}
                    {client.client_email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{client.client_email}</span>
                      </div>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{client.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit2 className="w-4 h-4 ml-1" />
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(client)}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ نافذة الإضافة/التعديل */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAddMode ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              {isAddMode ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم العميل <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="محمد أحمد"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع العميل</Label>
                <Select 
                  value={formData.client_type} 
                  onValueChange={(val) => setFormData({ ...formData, client_type: val })}
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
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="شركة ABC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الجوال</Label>
                <Input
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Select 
                  value={formData.city} 
                  onValueChange={(val) => setFormData({ ...formData, city: val })}
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
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="الحي، الشارع"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MyClients;
