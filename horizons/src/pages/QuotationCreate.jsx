
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Upload, Save, Send, Trash2, Plus, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

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

const QuotationCreate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState('draft');
  const [reviewNotes, setReviewNotes] = useState(null);
  
  // New Item Structure: 
  // { name, description, quantity, unit, supplier_price, markup_percentage, final_price, total }
  const [items, setItems] = useState([]);
  
  const [summary, setSummary] = useState({
    supplierTotal: 0,
    finalTotal: 0,
    profitTotal: 0
  });

  useEffect(() => {
    if (quotationId) {
      fetchQuotationData(quotationId);
    }
  }, [quotationId]);

  const fetchQuotationData = async (id) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setCustomerName(data.customer_name);
        setItems(data.items || []);
        setStatus(data.status);
        setReviewNotes(data.review_notes);
      }
    } catch (error) {
      console.error("Error fetching quotation:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل تحميل بيانات العرض"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals whenever items change
  useEffect(() => {
    const newSummary = items.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0;
      const supplierPrice = Number(item.supplier_price) || 0;
      const finalPrice = Number(item.final_price) || 0;
      
      acc.supplierTotal += (supplierPrice * qty);
      acc.finalTotal += (finalPrice * qty);
      return acc;
    }, { supplierTotal: 0, finalTotal: 0 });

    newSummary.profitTotal = newSummary.finalTotal - newSummary.supplierTotal;
    setSummary(newSummary);
  }, [items]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map data to new structure
        const mappedItems = data.map((row) => {
           const supplierPrice = Number(row['Price'] || row['Unit Price'] || row['Cost'] || 0);
           const quantity = Number(row['Quantity'] || row['Qty'] || 1);
           const markupPercentage = 0; // Default 0
           const finalPrice = supplierPrice; // Initially same as supplier price

           return {
            name: row['Item'] || row['Name'] || row['Description'] || 'New Item',
            description: '',
            quantity: quantity,
            unit: 'pcs',
            supplier_price: supplierPrice,
            markup_percentage: markupPercentage,
            final_price: finalPrice,
            total: finalPrice * quantity
          };
        });

        setItems(mappedItems);
        toast({
          title: "تم استيراد الملف بنجاح",
          description: `تم تحميل ${mappedItems.length} عنصر من الملف.`,
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } catch (error) {
        console.error("Error parsing Excel:", error);
        toast({
          variant: "destructive",
          title: "خطأ في قراءة الملف",
          description: "تأكد من أن الملف بصيغة Excel صحيحة."
        });
      }
    };
    reader.readAsBinaryString(file);
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

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    let updatedItem = { ...newItems[index], [field]: value };
    
    // Recalculate if financial fields change
    if (['quantity', 'supplier_price', 'markup_percentage'].includes(field)) {
      updatedItem = calculateRow(updatedItem);
    }

    newItems[index] = updatedItem;
    setItems(newItems);
  };

  const deleteItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const addItem = () => {
    const newItem = { 
      name: '', 
      description: '', 
      quantity: 1, 
      unit: 'pcs', 
      supplier_price: 0, 
      markup_percentage: 0, 
      final_price: 0, 
      total: 0 
    };
    setItems([...items, newItem]);
  };

  const handleSave = async (targetStatus) => {
    if (!customerName.trim()) {
      toast({ variant: "destructive", title: "مطلوب اسم العميل" });
      return;
    }
    
    if (items.length === 0) {
      toast({ variant: "destructive", title: "قائمة العناصر فارغة" });
      return;
    }

    setLoading(true);
    try {
      const quotationData = {
        created_by: user.id,
        customer_name: customerName,
        items: items,
        original_total: summary.finalTotal, // Maintain compatibility
        final_total: summary.finalTotal,
        supplier_total: summary.supplierTotal,
        profit_total: summary.profitTotal,
        status: targetStatus, // 'draft' or 'pending_approval'
        updated_at: new Date().toISOString()
      };
      
      // If it was needs_revision and we are resubmitting, clear notes
      if (status === 'needs_revision' && targetStatus === 'pending_approval') {
          quotationData.review_notes = null;
      }

      let data, error;

      if (quotationId) {
          // Update existing
          const response = await supabase
            .from('quotations')
            .update(quotationData)
            .eq('id', quotationId)
            .select();
            
          data = response.data;
          error = response.error;
      } else {
          // Create new
          quotationData.created_at = new Date().toISOString();
          const response = await supabase
            .from('quotations')
            .insert([quotationData])
            .select();
            
          data = response.data;
          error = response.error;
      }

      if (error) throw error;
      const savedQuotation = data[0];

      if (targetStatus === 'pending_approval') {
        // Find Managers
        const { data: managers } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['general_manager', 'manager', 'operations_manager'])
          .limit(1);

        const managerId = managers?.[0]?.id;

        if (managerId) {
            await supabase.from('notifications').insert({
                user_id: managerId, 
                title: status === 'needs_revision' ? 'عرض سعر معدل للمراجعة' : 'عرض سعر جديد للمراجعة',
                message: `عرض سعر رقم ${savedQuotation.quotation_number} بانتظار موافقتك`,
                type: 'quotation_approval',
                reference_id: savedQuotation.id,
                is_read: false,
                created_at: new Date().toISOString()
            });
        }

        toast({
          title: "تم رفع عرض السعر للمدير للموافقة",
          description: "سيتم إشعار المدير لمراجعة العرض.",
          className: "bg-blue-50 border-blue-200 text-blue-800"
        });

        setTimeout(() => {
            navigate('/quotations');
        }, 2000);
      } else {
        toast({
          title: "تم حفظ المسودة",
          description: "يمكنك العودة وتعديل العرض لاحقاً.",
          className: "bg-green-50 border-green-200 text-green-800"
        });
        navigate('/quotations');
      }

    } catch (error) {
      console.error('Error saving quotation:', error);
      toast({
        variant: "destructive",
        title: "فشل الحفظ",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[95%] mx-auto pb-10">
      
      {/* Revision Banner */}
      {status === 'needs_revision' && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800 font-bold mb-2">مرفوض - يحتاج تعديل</AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="font-semibold mb-1">ملاحظات المدير:</div>
            <div className="bg-white/50 p-2 rounded text-sm border border-red-100">
                {reviewNotes || 'لا توجد ملاحظات'}
            </div>
            <div className="mt-2 text-xs opacity-90">الرجاء تعديل العرض بناءً على الملاحظات وإعادة إرساله للموافقة.</div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          {quotationId ? 'تعديل عرض سعر' : 'إنشاء عرض سعر جديد'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={loading}>
            <Save className="ml-2 h-4 w-4" />
            حفظ كمسودة
          </Button>
          <Button onClick={() => handleSave('pending_approval')} disabled={loading} className="bg-primary">
            <Send className="ml-2 h-4 w-4" />
            {status === 'needs_revision' ? 'تعديل وإعادة الرفع' : 'رفع للمدير'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>بيانات العرض</CardTitle>
            <CardDescription>قم بتحميل ملف Excel أو إدخال البيانات يدوياً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>اسم العميل</Label>
                <Input 
                  placeholder="أدخل اسم العميل..." 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              
              <div className="p-2 border border-dashed rounded-lg bg-gray-50 flex items-center gap-2">
                <Upload className="h-5 w-5 text-gray-400" />
                <Input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="max-w-xs h-8 text-xs" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 bg-gray-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ملخص مالي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">إجمالي تكلفة المورد:</span>
              <span className="font-medium">{summary.supplierTotal.toLocaleString()} SAR</span>
            </div>
            <div className="flex justify-between text-sm">
               <span className="text-gray-500">إجمالي الربح:</span>
               <span className="text-green-600 font-bold">
                 {summary.profitTotal.toLocaleString()} SAR
               </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
              <span>إجمالي السعر النهائي:</span>
              <span className="text-primary">{summary.finalTotal.toLocaleString()} SAR</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg">قائمة الأصناف</CardTitle>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4 ml-1" /> إضافة صنف
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-right w-[20%]">الصنف</TableHead>
                  <TableHead className="text-right w-[20%]">الوصف</TableHead>
                  <TableHead className="text-center w-[8%]">الكمية</TableHead>
                  <TableHead className="text-center w-[10%]">الوحدة</TableHead>
                  <TableHead className="text-center w-[10%]">سعر المورد</TableHead>
                  <TableHead className="text-center w-[8%]">النسبة %</TableHead>
                  <TableHead className="text-center w-[10%]">السعر النهائي</TableHead>
                  <TableHead className="text-center w-[10%]">الإجمالي</TableHead>
                  <TableHead className="w-[4%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      لا توجد عناصر مضافة. قم برفع ملف Excel أو إضافة عناصر يدوياً.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50/50">
                      <TableCell className="p-2">
                        <Input 
                          value={item.name} 
                          placeholder="اسم الصنف"
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={item.description} 
                          placeholder="وصف إضافي"
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          min="1"
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="h-8 text-center"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select 
                          value={item.unit} 
                          onValueChange={(val) => handleItemChange(index, 'unit', val)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="الوحدة" />
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
                          min="0"
                          step="0.01"
                          value={item.supplier_price} 
                          onChange={(e) => handleItemChange(index, 'supplier_price', Number(e.target.value))}
                          className="h-8 text-center bg-yellow-50/30 border-yellow-200"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                         <div className="relative">
                            <Input 
                              type="number" 
                              min="0"
                              max="500"
                              value={item.markup_percentage} 
                              onChange={(e) => handleItemChange(index, 'markup_percentage', Number(e.target.value))}
                              className="h-8 text-center pr-1 pl-4 font-bold text-blue-600"
                            />
                            <span className="absolute left-1 top-2 text-[10px] text-gray-400">%</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center font-medium bg-gray-50">
                        {item.final_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary bg-gray-50">
                        {item.total?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationCreate;
