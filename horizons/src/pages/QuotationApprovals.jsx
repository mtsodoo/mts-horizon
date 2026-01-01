
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { createOdooQuotation } from '@/utils/quotationOdoo';
import { CheckCircle, XCircle, FileText, Search, Loader2, Edit, Save, Trash2, Plus, Percent } from 'lucide-react';
import { format } from 'date-fns';

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'قطعة' },
  { value: 'box', label: 'كرتون' },
  { value: 'set', label: 'طقم' },
  { value: 'kg', label: 'كيلوجرام' },
  { value: 'm', label: 'متر' },
  { value: 'm2', label: 'متر مربع' },
  { value: 'm3', label: 'متر مكعب' },
  { value: 'hour', label: 'ساعة' },
  { value: 'day', label: 'يوم' },
  { value: 'lump_sum', label: 'مقطوعية' },
];

const QuotationApprovals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for Review/Edit Modal
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewCustomer, setReviewCustomer] = useState('');
  const [reviewSummary, setReviewSummary] = useState({ supplierTotal: 0, finalTotal: 0, profitTotal: 0, profitPercent: 0 });
  
  // States for Rejection
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  useEffect(() => {
    fetchPendingQuotations();
  }, []);

  // Update summary when review items change
  useEffect(() => {
    if (isReviewOpen && reviewItems.length > 0) {
      const summary = reviewItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const supplierPrice = Number(item.supplier_price) || 0;
        const finalPrice = Number(item.final_price) || 0;
        
        acc.supplierTotal += (supplierPrice * qty);
        acc.finalTotal += (finalPrice * qty);
        return acc;
      }, { supplierTotal: 0, finalTotal: 0 });

      summary.profitTotal = summary.finalTotal - summary.supplierTotal;
      summary.profitPercent = summary.supplierTotal > 0 
        ? (summary.profitTotal / summary.supplierTotal) * 100 
        : 0;

      setReviewSummary(summary);
    }
  }, [reviewItems, isReviewOpen]);

  const fetchPendingQuotations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (quotation) => {
    setEditingQuotation(quotation);
    
    // Ensure items have necessary structure (backward compatibility)
    const itemsWithStructure = (quotation.items || []).map(item => ({
      ...item,
      supplier_price: item.supplier_price || 0,
      markup_percentage: item.markup_percentage || 0,
      final_price: item.final_price || 0,
      total: (item.final_price || 0) * (item.quantity || 1)
    }));

    setReviewItems(JSON.parse(JSON.stringify(itemsWithStructure)));
    setReviewCustomer(quotation.customer_name);
    setIsReviewOpen(true);
  };

  const calculateRow = (item) => {
    const qty = Number(item.quantity) || 0;
    const supplierPrice = Number(item.supplier_price) || 0;
    const markup = Number(item.markup_percentage) || 0;
    
    // Calculate final unit price
    const finalPrice = supplierPrice * (1 + (markup / 100));
    
    // Calculate total line amount
    const total = finalPrice * qty;
    
    return { ...item, final_price: finalPrice, total: total };
  };

  const handleReviewItemChange = (index, field, value) => {
    const newItems = [...reviewItems];
    let updatedItem = { ...newItems[index], [field]: value };
    
    // Recalculate if financial fields change
    if (['quantity', 'supplier_price', 'markup_percentage'].includes(field)) {
      updatedItem = calculateRow(updatedItem);
    }

    newItems[index] = updatedItem;
    setReviewItems(newItems);
  };

  const handleSaveChanges = async () => {
    if (!editingQuotation) return;
    
    setActionLoading('save');
    try {
        const updates = {
            customer_name: reviewCustomer,
            items: reviewItems,
            original_total: reviewSummary.finalTotal, // Client total
            final_total: reviewSummary.finalTotal,    // Client total
            supplier_total: reviewSummary.supplierTotal,
            profit_total: reviewSummary.profitTotal,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('quotations')
            .update(updates)
            .eq('id', editingQuotation.id);

        if (error) throw error;

        // Update local state
        setQuotations(prev => prev.map(q => 
            q.id === editingQuotation.id ? { ...q, ...updates } : q
        ));
        setEditingQuotation(prev => ({ ...prev, ...updates }));

        toast({
            title: "تم حفظ التعديلات",
            className: "bg-green-50 border-green-200 text-green-800"
        });
    } catch (error) {
        console.error("Error saving changes:", error);
        toast({
            variant: "destructive",
            title: "فشل الحفظ",
            description: error.message
        });
    } finally {
        setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!editingQuotation) return;
    
    // Use current summary state
    const approvedData = {
        ...editingQuotation,
        customer_name: reviewCustomer,
        items: reviewItems,
        original_total: reviewSummary.finalTotal,
        final_total: reviewSummary.finalTotal,
        supplier_total: reviewSummary.supplierTotal,
        profit_total: reviewSummary.profitTotal
    };

    setActionLoading('approve');
    try {
      // 1. Update DB first to ensure consistent state
       const { error: updateError } = await supabase
            .from('quotations')
            .update({
                customer_name: reviewCustomer,
                items: reviewItems,
                original_total: reviewSummary.finalTotal,
                final_total: reviewSummary.finalTotal,
                supplier_total: reviewSummary.supplierTotal,
                profit_total: reviewSummary.profitTotal,
                status: 'approved', // Changed from sent_to_odoo to approved first
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', editingQuotation.id);
            
      if (updateError) throw updateError;

      // 2. Call Odoo Utility
      const odooResult = await createOdooQuotation(approvedData);
      
      // 3. Update Supabase with Odoo ID
      const { error } = await supabase
        .from('quotations')
        .update({
          status: 'sent_to_odoo',
          odoo_quotation_id: odooResult.id,
          odoo_synced_at: new Date().toISOString()
        })
        .eq('id', editingQuotation.id);

      if (error) throw error;

      // 4. Notify Creator
      await supabase.from('notifications').insert({
          user_id: editingQuotation.created_by,
          title: 'تمت الموافقة على عرض السعر',
          message: `تم اعتماد عرض السعر رقم ${editingQuotation.quotation_number} وإرساله لنظام Odoo`,
          type: 'quotation_approved',
          reference_id: editingQuotation.id,
          is_read: false,
          created_at: new Date().toISOString()
      });

      toast({
        title: "تمت الموافقة بنجاح",
        description: `تم إنشاء عرض السعر في Odoo برقم ${odooResult.name}`,
        className: "bg-green-50 border-green-200 text-green-800"
      });

      setQuotations(prev => prev.filter(q => q.id !== editingQuotation.id));
      setIsReviewOpen(false);
      setEditingQuotation(null);

    } catch (error) {
      console.error('Error approving quotation:', error);
      toast({
        variant: "destructive",
        title: "فشل العملية",
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!editingQuotation) return;
    setIsReviewOpen(false); // Close review, open reject dialog
    setIsRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ variant: "destructive", title: "مطلوب سبب الرفض" });
      return;
    }

    setActionLoading('reject');
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          status: 'needs_revision', // Status updated to needs_revision instead of rejected
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: rejectionReason
        })
        .eq('id', editingQuotation.id);

      if (error) throw error;

      // Notify Creator
      await supabase.from('notifications').insert({
          user_id: editingQuotation.created_by,
          title: 'عرض السعر يحتاج تعديل',
          message: `عرض السعر رقم ${editingQuotation.quotation_number} يحتاج تعديل. السبب: ${rejectionReason}`,
          type: 'quotation_needs_revision',
          reference_id: editingQuotation.id,
          is_read: false,
          created_at: new Date().toISOString()
      });

      toast({
        title: "تم طلب التعديل",
        description: "تم إشعار مدير المشروع بالملاحظات.",
        className: "bg-orange-50 border-orange-200 text-orange-800"
      });

      setQuotations(prev => prev.filter(q => q.id !== editingQuotation.id));
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setEditingQuotation(null);

    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast({
        variant: "destructive",
        title: "فشل العملية",
        description: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            مراجعة عروض الأسعار
          </h1>
          <p className="text-muted-foreground mt-1">العروض التي تنتظر موافقتك لإرسالها لنظام Odoo</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم العرض أو اسم العميل..."
              className="pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center py-10">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم العرض</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">التكلفة (المورد)</TableHead>
                    <TableHead className="text-right">الإجمالي (النهائي)</TableHead>
                    <TableHead className="text-right">الربح</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد عروض أسعار بانتظار الموافقة حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-medium">{quotation.quotation_number}</TableCell>
                        <TableCell>{quotation.customer_name}</TableCell>
                        <TableCell>{format(new Date(quotation.created_at), 'yyyy-MM-dd')}</TableCell>
                        <TableCell className="text-muted-foreground">{Number(quotation.supplier_total || 0).toLocaleString()} SAR</TableCell>
                        <TableCell className="font-bold text-primary">
                          {Number(quotation.final_total || 0).toLocaleString()} SAR
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {Number(quotation.profit_total || 0).toLocaleString()} SAR
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 h-8"
                              onClick={() => openReviewModal(quotation)}
                            >
                              <Edit className="h-3 w-3 ml-2" />
                              مراجعة
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <DialogTitle>مراجعة وتعديل عرض السعر</DialogTitle>
                        <DialogDescription>
                            {editingQuotation?.quotation_number} - بتاريخ {editingQuotation && format(new Date(editingQuotation.created_at), 'yyyy-MM-dd')}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="md:col-span-2 space-y-2">
                        <Label>اسم العميل</Label>
                        <Input 
                            value={reviewCustomer} 
                            onChange={(e) => setReviewCustomer(e.target.value)} 
                        />
                    </div>
                    
                    {/* Summary Cards */}
                    <div className="md:col-span-2 grid grid-cols-4 gap-4 text-center">
                        <div className="bg-white p-2 rounded shadow-sm border">
                            <p className="text-[10px] text-gray-500">عدد الأصناف</p>
                            <p className="font-bold text-lg">{reviewItems.length}</p>
                        </div>
                        <div className="bg-white p-2 rounded shadow-sm border">
                            <p className="text-[10px] text-gray-500">تكلفة المورد</p>
                            <p className="font-bold text-sm">{reviewSummary.supplierTotal.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-2 rounded shadow-sm border border-green-100">
                            <p className="text-[10px] text-green-600">إجمالي الربح ({reviewSummary.profitPercent.toFixed(1)}%)</p>
                            <p className="font-bold text-sm text-green-700">{reviewSummary.profitTotal.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-2 rounded shadow-sm border border-blue-100">
                            <p className="text-[10px] text-primary">السعر النهائي</p>
                            <p className="font-bold text-lg text-primary">{reviewSummary.finalTotal.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Items Table */}
                <div className="border rounded-md overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-gray-100 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[15%] text-right">الصنف</TableHead>
                                    <TableHead className="w-[15%] text-right">الوصف</TableHead>
                                    <TableHead className="w-[8%] text-center">الكمية</TableHead>
                                    <TableHead className="w-[10%] text-center">الوحدة</TableHead>
                                    <TableHead className="w-[10%] text-center">سعر المورد</TableHead>
                                    <TableHead className="w-[8%] text-center">نسبة %</TableHead>
                                    <TableHead className="w-[10%] text-center">السعر النهائي</TableHead>
                                    <TableHead className="w-[10%] text-center">الإجمالي</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviewItems.map((item, index) => (
                                    <TableRow key={index} className="hover:bg-gray-50">
                                        <TableCell className="p-2">
                                            <Input 
                                                value={item.name} 
                                                onChange={(e) => handleReviewItemChange(index, 'name', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input 
                                                value={item.description} 
                                                onChange={(e) => handleReviewItemChange(index, 'description', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={(e) => handleReviewItemChange(index, 'quantity', Number(e.target.value))}
                                                className="h-8 text-center text-sm"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Select 
                                              value={item.unit} 
                                              onValueChange={(val) => handleReviewItemChange(index, 'unit', val)}
                                            >
                                              <SelectTrigger className="h-8 text-sm">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {UNIT_OPTIONS.map(opt => (
                                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={item.supplier_price} 
                                                onChange={(e) => handleReviewItemChange(index, 'supplier_price', Number(e.target.value))}
                                                className="h-8 text-center text-sm bg-yellow-50/50 border-yellow-200"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <div className="relative">
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    max="500"
                                                    value={item.markup_percentage} 
                                                    onChange={(e) => handleReviewItemChange(index, 'markup_percentage', Number(e.target.value))}
                                                    className="h-8 text-center text-sm pl-4 font-bold text-blue-600"
                                                />
                                                <span className="absolute left-1 top-2 text-[10px] text-gray-400">%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-sm bg-gray-50">
                                            {item.final_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-sm text-primary bg-gray-50">
                                            {item.total?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="p-1 text-center">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
                                                const newItems = reviewItems.filter((_, i) => i !== index);
                                                setReviewItems(newItems);
                                            }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4">
                <div className="flex justify-between w-full">
                    <Button variant="destructive" onClick={handleReject}>
                        طلب تعديل
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSaveChanges} disabled={actionLoading === 'save'}>
                             {actionLoading === 'save' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                             حفظ التعديلات
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={actionLoading === 'approve'}>
                             {actionLoading === 'approve' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                             موافقة ورفع لـ Odoo
                        </Button>
                    </div>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب تعديل على العرض</DialogTitle>
            <DialogDescription>
              الرجاء توضيح سبب الرفض/التعديل ليتم إشعار مدير المشروع به.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="الملاحظات..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>إلغاء</Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || actionLoading === 'reject'}
            >
              {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              تأكيد الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationApprovals;
