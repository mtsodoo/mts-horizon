
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FileText, Plus, Search, Filter, Download, Eye, MoreHorizontal, FileDown, AlertCircle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QuotationPDF from '@/components/QuotationPDFGenerator';

const QuotationsList = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReviewNotes, setSelectedReviewNotes] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          creator:created_by (name_ar, email)
        `)
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'draft': 
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">مسودة</Badge>;
      case 'pending_approval': 
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">بانتظار الموافقة</Badge>;
      case 'needs_revision': 
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
             <AlertCircle className="w-3 h-3" /> يحتاج تعديل
          </Badge>
        );
      case 'approved': 
        return <Badge className="bg-green-100 text-green-700 border-green-200">موافق عليه</Badge>;
      case 'sent_to_odoo': 
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">مرفوع لـ Odoo</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            عروض الأسعار
          </h1>
          <p className="text-muted-foreground mt-1">إدارة ومتابعة عروض أسعار المشاريع</p>
        </div>
        <Button onClick={() => navigate('/quotations/create')} className="bg-primary hover:bg-primary/90">
          <Plus className="ml-2 h-4 w-4" />
          عرض سعر جديد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم العرض أو اسم العميل..."
                className="pr-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                  <SelectValue placeholder="تصفية بالحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="pending_approval">بانتظار الموافقة</SelectItem>
                  <SelectItem value="needs_revision">يحتاج تعديل</SelectItem>
                  <SelectItem value="approved">موافق عليه</SelectItem>
                  <SelectItem value="sent_to_odoo">مرفوع لـ Odoo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم العرض</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">أنشئ بواسطة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التكلفة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8">جاري التحميل...</TableCell>
                   </TableRow>
                ) : filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد عروض أسعار مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">{quotation.quotation_number}</TableCell>
                      <TableCell>{quotation.customer_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {quotation.creator?.name_ar || 'مستخدم'}
                      </TableCell>
                      <TableCell>{format(new Date(quotation.created_at), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                             {getStatusBadge(quotation.status)}
                             {quotation.status === 'needs_revision' && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setSelectedReviewNotes(quotation.review_notes)}>
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                                <AlertCircle className="w-5 h-5" /> ملاحظات التعديل
                                            </DialogTitle>
                                            <DialogDescription>
                                                الرجاء مراجعة الملاحظات التالية من المدير:
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="p-4 bg-red-50 text-red-800 rounded-md border border-red-100 my-2">
                                            {quotation.review_notes || 'لا توجد ملاحظات مسجلة.'}
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={() => navigate(`/quotations/create?id=${quotation.id}`)}>
                                                <Edit className="w-4 h-4 ml-2" />
                                                تعديل العرض
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                             )}
                         </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{Number(quotation.supplier_total || 0).toLocaleString()} SAR</TableCell>
                      <TableCell className="font-bold">{Number(quotation.final_total).toLocaleString()} SAR</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                           
                           <PDFDownloadLink
                             document={<QuotationPDF quotation={quotation} />}
                             fileName={`Quotation-${quotation.quotation_number}.pdf`}
                           >
                             {({ loading: pdfLoading }) => (
                               <Button variant="ghost" size="icon" disabled={pdfLoading} title="تحميل PDF">
                                 <FileDown className="h-4 w-4 text-blue-600" />
                               </Button>
                             )}
                           </PDFDownloadLink>

                           {(quotation.status === 'draft' || quotation.status === 'needs_revision') && quotation.created_by === user.id && (
                             <Button variant="ghost" size="icon" onClick={() => navigate(`/quotations/create?id=${quotation.id}`)} title="تعديل">
                               <Edit className="h-4 w-4 text-gray-600" />
                             </Button>
                           )}
                        </div>
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

export default QuotationsList;
