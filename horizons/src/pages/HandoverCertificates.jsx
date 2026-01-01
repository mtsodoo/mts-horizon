import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, Trash2, 
  Edit, Eye, MoreVertical, X, Save, 
  PlusCircle, MinusCircle, FileCheck, Pen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { generateHandoverPDF } from '@/utils/generateHandoverPDF';
import PageTitle from '@/components/PageTitle';
import { format } from 'date-fns';

const HandoverCertificates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentCert, setCurrentCert] = useState(null);
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    venue: '',
    related_invoices: '',
    recipient_name: '',
    recipient_address: '',
    delivery_location: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_title: '',
    deliverer_name: '',
    deliverer_title: '',
    notes: '',
    status: 'draft'
  });

  const units = ['قطعة', 'علم', 'شال', 'تيشيرت', 'بنر', 'متر', 'رول', 'صندوق', 'حبة', 'طقم', 'خدمة', 'جهاز'];

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('handover_certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل محاضر التسليم'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      event_name: '',
      event_date: format(new Date(), 'yyyy-MM-dd'),
      venue: '',
      related_invoices: '',
      recipient_name: '',
      recipient_address: '',
      delivery_location: '',
      receiver_name: '',
      receiver_phone: '',
      receiver_title: '',
      deliverer_name: '',
      deliverer_title: '',
      notes: '',
      status: 'draft'
    });
    setItems([{ item_description: '', quantity: 1, unit: 'قطعة', status: 'delivered' }]);
    setServices([]);
    setCurrentCert(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = async (cert) => {
    try {
      // Fetch items and services
      const [itemsRes, servicesRes] = await Promise.all([
        supabase.from('handover_certificate_items').select('*').eq('certificate_id', cert.id).order('created_at', { ascending: true }),
        supabase.from('handover_certificate_services').select('*').eq('certificate_id', cert.id).order('created_at', { ascending: true })
      ]);

      setFormData({
        event_name: cert.event_name,
        event_date: cert.event_date,
        venue: cert.venue || '',
        related_invoices: cert.related_invoices || '',
        recipient_name: cert.recipient_name || '',
        recipient_address: cert.recipient_address || '',
        delivery_location: cert.delivery_location || '',
        receiver_name: cert.receiver_name || '',
        receiver_phone: cert.receiver_phone || '',
        receiver_title: cert.receiver_title || '',
        deliverer_name: cert.deliverer_name || '',
        deliverer_title: cert.deliverer_title || '',
        notes: cert.notes || '',
        status: cert.status
      });
      
      setItems(itemsRes.data || []);
      setServices(servicesRes.data || []);
      setCurrentCert(cert);
      setIsViewMode(false);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل في تحميل تفاصيل المحضر' });
    }
  };

  const handleView = async (cert) => {
    await handleEdit(cert);
    setIsViewMode(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المحضر؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    try {
      const { error } = await supabase
        .from('handover_certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCertificates(prev => prev.filter(c => c.id !== id));
      toast({ title: 'تم الحذف بنجاح' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ variant: 'destructive', title: 'خطأ في الحذف' });
    }
  };

  const handleSave = async () => {
    if (!formData.event_name || !formData.recipient_name) {
      toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'يرجى تعبئة اسم الفعالية واسم المستلم على الأقل' });
      return;
    }

    try {
      let certId = currentCert?.id;

      if (currentCert) {
        // Update existing certificate
        const { error } = await supabase
          .from('handover_certificates')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', certId);
        
        if (error) throw error;
      } else {
        // Create new certificate
        const { data, error } = await supabase
          .from('handover_certificates')
          .insert([{
            ...formData,
            created_by: user.id
          }])
          .select()
          .single();
        
        if (error) throw error;
        certId = data.id;
      }

      // Handle Items (Full replacement strategy for simplicity)
      if (currentCert) {
        await supabase.from('handover_certificate_items').delete().eq('certificate_id', certId);
        await supabase.from('handover_certificate_services').delete().eq('certificate_id', certId);
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, idx) => ({
          certificate_id: certId,
          item_number: idx + 1,
          item_description: item.item_description,
          quantity: parseInt(item.quantity) || 0,
          unit: item.unit,
          status: item.status || 'delivered'
        })).filter(i => i.item_description.trim() !== '');
        
        if (itemsToInsert.length > 0) {
            await supabase.from('handover_certificate_items').insert(itemsToInsert);
        }
      }

      if (services.length > 0) {
        const servicesToInsert = services.map((service, idx) => ({
          certificate_id: certId,
          service_number: idx + 1,
          service_description: service.service_description,
          status: service.status || 'completed'
        })).filter(s => s.service_description.trim() !== '');
        
        if (servicesToInsert.length > 0) {
             await supabase.from('handover_certificate_services').insert(servicesToInsert);
        }
      }

      toast({ title: currentCert ? 'تم التحديث بنجاح' : 'تم إنشاء المحضر بنجاح' });
      setIsModalOpen(false);
      fetchCertificates();
    } catch (error) {
      console.error('Save error:', error);
      toast({ variant: 'destructive', title: 'خطأ في الحفظ', description: error.message });
    }
  };

  const handleDownloadPDF = async (cert) => {
    toast({ title: 'جاري تجهيز الملف...', description: 'يرجى الانتظار قليلاً' });
    
    try {
      let certItems = [];
      let certServices = [];
      
      const { data: iData } = await supabase.from('handover_certificate_items').select('*').eq('certificate_id', cert.id);
      const { data: sData } = await supabase.from('handover_certificate_services').select('*').eq('certificate_id', cert.id);
      
      certItems = iData || [];
      certServices = sData || [];

      await generateHandoverPDF(cert, certItems, certServices);
      toast({ title: 'تم تحميل الملف بنجاح' });
    } catch (error) {
      console.error('PDF Error:', error);
      toast({ variant: 'destructive', title: 'فشل إنشاء الملف' });
    }
  };

  // Helper for dynamic fields
  const addItem = () => setItems([...items, { item_description: '', quantity: 1, unit: 'قطعة', status: 'delivered' }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  const addService = () => setServices([...services, { service_description: '', status: 'completed' }]);
  const removeService = (idx) => setServices(services.filter((_, i) => i !== idx));
  const updateService = (idx, field, value) => {
    const newServices = [...services];
    newServices[idx][field] = value;
    setServices(newServices);
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.certificate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      sent: "bg-blue-100 text-blue-800 border-blue-200",
      signed: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-emerald-100 text-emerald-800 border-emerald-200"
    };
    const labels = {
      draft: "مسودة",
      sent: "مُرسل",
      signed: "موقّع",
      completed: "مكتمل"
    };
    return <Badge variant="outline" className={styles[status] || styles.draft}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageTitle title="محاضر التسليم" icon={FileText} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم المحضر أو الفعالية..."
              className="pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="sent">مُرسل</SelectItem>
              <SelectItem value="signed">موقّع</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 ml-2" />
          محضر جديد
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم المحضر</TableHead>
                <TableHead className="text-right">الفعالية</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">موقع التسليم</TableHead>
                <TableHead className="text-right">المستلم</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">جاري التحميل...</TableCell>
                </TableRow>
              ) : filteredCertificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">لا توجد محاضر تسليم</TableCell>
                </TableRow>
              ) : (
                filteredCertificates.map((cert) => (
                  <TableRow key={cert.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-bold" dir="ltr">{cert.certificate_number}</TableCell>
                    <TableCell className="font-medium">{cert.event_name}</TableCell>
                    <TableCell>{format(new Date(cert.event_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{cert.delivery_location || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{cert.receiver_name || cert.recipient_name}</span>
                        {cert.receiver_phone && <span className="text-xs text-muted-foreground" dir="ltr">{cert.receiver_phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(cert.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleView(cert)} title="عرض">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(cert)} title="تحميل PDF">
                          <Download className="w-4 h-4 text-blue-600" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(cert)}>
                              <Edit className="w-4 h-4 ml-2" /> تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(cert.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 ml-2" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              {currentCert ? (isViewMode ? 'تفاصيل المحضر' : 'تعديل المحضر') : 'إنشاء محضر تسليم جديد'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="info">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="recipient">الطرف المستلم</TabsTrigger>
              <TabsTrigger value="items">البنود والخدمات</TabsTrigger>
              <TabsTrigger value="signatures">التوقيعات</TabsTrigger>
              <TabsTrigger value="notes">ملاحظات</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الفعالية <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.event_name} 
                    onChange={(e) => setFormData({...formData, event_name: e.target.value})}
                    disabled={isViewMode}
                    placeholder="اسم الفعالية أو المشروع"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الفعالية</Label>
                  <Input 
                    type="date"
                    value={formData.event_date} 
                    onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع (Venue)</Label>
                  <Input 
                    value={formData.venue} 
                    onChange={(e) => setFormData({...formData, venue: e.target.value})}
                    disabled={isViewMode}
                    placeholder="موقع الفعالية"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الفواتير المرتبطة</Label>
                  <Input 
                    value={formData.related_invoices} 
                    onChange={(e) => setFormData({...formData, related_invoices: e.target.value})}
                    placeholder="مثال: INV-1001, INV-1002"
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>حالة المحضر</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val) => setFormData({...formData, status: val})}
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="sent">مُرسل</SelectItem>
                      <SelectItem value="signed">موقّع</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Recipient Tab */}
            <TabsContent value="recipient" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الجهة المستلمة <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.recipient_name} 
                    onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                    disabled={isViewMode}
                    placeholder="اسم الشركة أو الجهة"
                  />
                </div>
                <div className="space-y-2">
                  <Label>عنوان الجهة</Label>
                  <Input 
                    value={formData.recipient_address} 
                    onChange={(e) => setFormData({...formData, recipient_address: e.target.value})}
                    disabled={isViewMode}
                    placeholder="المدينة، الحي، الشارع"
                  />
                </div>
                <div className="space-y-2">
                  <Label>موقع التسليم</Label>
                  <Input 
                    value={formData.delivery_location} 
                    onChange={(e) => setFormData({...formData, delivery_location: e.target.value})}
                    disabled={isViewMode}
                    placeholder="الموقع الفعلي للتسليم"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم الشخص المستلم</Label>
                  <Input 
                    value={formData.receiver_name} 
                    onChange={(e) => setFormData({...formData, receiver_name: e.target.value})}
                    disabled={isViewMode}
                    placeholder="الشخص المسؤول عن الاستلام"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم جوال المستلم</Label>
                  <Input 
                    value={formData.receiver_phone} 
                    onChange={(e) => setFormData({...formData, receiver_phone: e.target.value})}
                    disabled={isViewMode}
                    dir="ltr"
                    placeholder="05xxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>منصب المستلم</Label>
                  <Input 
                    value={formData.receiver_title} 
                    onChange={(e) => setFormData({...formData, receiver_title: e.target.value})}
                    disabled={isViewMode}
                    placeholder="مثال: مدير العمليات"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-6">
              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">قائمة البنود والمواد</h3>
                  {!isViewMode && (
                    <Button type="button" size="sm" onClick={addItem} variant="outline">
                      <PlusCircle className="w-4 h-4 ml-2" /> إضافة بند
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[40%]">وصف البند</TableHead>
                        <TableHead className="w-[15%]">الكمية</TableHead>
                        <TableHead className="w-[20%]">الوحدة</TableHead>
                        <TableHead className="w-[20%]">الحالة</TableHead>
                        {!isViewMode && <TableHead className="w-[5%]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input 
                              value={item.item_description} 
                              onChange={(e) => updateItem(idx, 'item_description', e.target.value)}
                              placeholder="وصف البند"
                              className="border-0 bg-transparent focus-visible:ring-0"
                              disabled={isViewMode}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={item.quantity} 
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="border-0 bg-transparent focus-visible:ring-0 text-center"
                              disabled={isViewMode}
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.unit} 
                              onValueChange={(val) => updateItem(idx, 'unit', val)}
                              disabled={isViewMode}
                            >
                              <SelectTrigger className="border-0 bg-transparent focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                             <Select 
                                value={item.status} 
                                onValueChange={(val) => updateItem(idx, 'status', val)}
                                disabled={isViewMode}
                              >
                                <SelectTrigger className="border-0 bg-transparent focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="delivered">تم التسليم</SelectItem>
                                  <SelectItem value="pending">معلق</SelectItem>
                                  <SelectItem value="missing">ناقص</SelectItem>
                                </SelectContent>
                              </Select>
                          </TableCell>
                          {!isViewMode && (
                            <TableCell>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeItem(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Services Section */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">الخدمات المنفذة</h3>
                  {!isViewMode && (
                    <Button type="button" size="sm" onClick={addService} variant="outline">
                      <PlusCircle className="w-4 h-4 ml-2" /> إضافة خدمة
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[70%]">وصف الخدمة</TableHead>
                        <TableHead className="w-[25%]">الحالة</TableHead>
                        {!isViewMode && <TableHead className="w-[5%]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input 
                              value={service.service_description} 
                              onChange={(e) => updateService(idx, 'service_description', e.target.value)}
                              placeholder="وصف الخدمة المنفذة"
                              className="border-0 bg-transparent focus-visible:ring-0"
                              disabled={isViewMode}
                            />
                          </TableCell>
                          <TableCell>
                             <Select 
                                value={service.status} 
                                onValueChange={(val) => updateService(idx, 'status', val)}
                                disabled={isViewMode}
                              >
                                <SelectTrigger className="border-0 bg-transparent focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="completed">منفذة</SelectItem>
                                  <SelectItem value="pending">قيد التنفيذ</SelectItem>
                                  <SelectItem value="cancelled">ملغاة</SelectItem>
                                </SelectContent>
                              </Select>
                          </TableCell>
                          {!isViewMode && (
                            <TableCell>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeService(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Signatures Tab - NEW */}
            <TabsContent value="signatures" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* الطرف المُسلِّم */}
                <div className="space-y-4 p-4 border rounded-xl bg-blue-50/50">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-blue-800">
                    <Pen className="w-5 h-5" />
                    الطرف المُسلِّم (MTS)
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>الاسم</Label>
                      <Input 
                        value={formData.deliverer_name} 
                        onChange={(e) => setFormData({...formData, deliverer_name: e.target.value})}
                        disabled={isViewMode}
                        placeholder="اسم المسؤول عن التسليم"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المنصب</Label>
                      <Input 
                        value={formData.deliverer_title} 
                        onChange={(e) => setFormData({...formData, deliverer_title: e.target.value})}
                        disabled={isViewMode}
                        placeholder="مثال: مدير العمليات"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>التوقيع</Label>
                      <div className="h-24 border-2 border-dashed border-blue-300 rounded-lg bg-white flex items-center justify-center">
                        <span className="text-gray-400 text-sm">خانة التوقيع</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* الطرف المُستلِم */}
                <div className="space-y-4 p-4 border rounded-xl bg-green-50/50">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-green-800">
                    <Pen className="w-5 h-5" />
                    الطرف المُستلِم
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>الاسم</Label>
                      <Input 
                        value={formData.receiver_name} 
                        onChange={(e) => setFormData({...formData, receiver_name: e.target.value})}
                        disabled={isViewMode}
                        placeholder="اسم المستلم"
                        className="bg-green-100/50"
                      />
                      <p className="text-xs text-gray-500">* يتم تعبئته تلقائياً من بيانات المستلم</p>
                    </div>
                    <div className="space-y-2">
                      <Label>المنصب</Label>
                      <Input 
                        value={formData.receiver_title} 
                        onChange={(e) => setFormData({...formData, receiver_title: e.target.value})}
                        disabled={isViewMode}
                        placeholder="مثال: مدير المشتريات"
                        className="bg-green-100/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>التوقيع</Label>
                      <div className="h-24 border-2 border-dashed border-green-300 rounded-lg bg-white flex items-center justify-center">
                        <span className="text-gray-400 text-sm">خانة التوقيع</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* معلومات إضافية */}
              <div className="p-4 bg-gray-50 rounded-xl border">
                <p className="text-sm text-gray-600 text-center">
                  بتوقيع الطرفين أعلاه، يُقر كل طرف بصحة البيانات الواردة في هذا المحضر وتمام عملية التسليم والاستلام.
                </p>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes">
              <div className="space-y-2">
                <Label>ملاحظات إضافية</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={8}
                  placeholder="أي ملاحظات إضافية بخصوص التسليم..."
                  disabled={isViewMode}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex justify-between sm:justify-between items-center w-full">
            <div className="flex gap-2">
               {isViewMode && (
                 <Button onClick={() => handleDownloadPDF(currentCert)} variant="outline" className="gap-2">
                   <Download className="w-4 h-4" /> تحميل PDF
                 </Button>
               )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>إغلاق</Button>
              {!isViewMode && (
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 ml-2" /> حفظ
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandoverCertificates;