import React, { useState, useEffect } from 'react';
import { Landmark, RefreshCw, FileText, BookOpen, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTitle from '@/components/PageTitle';
import { getCustomerInvoices, getJournalEntries, getQuotations } from '@/integrations/odoo/client';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const OdooDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ invoices: [], journals: [], quotations: [] });
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const cachedData = localStorage.getItem('odoo_cache');
    if (cachedData) {
      try {
        const parsedCache = JSON.parse(cachedData);
        setData(parsedCache.data || { invoices: [], journals: [], quotations: [] });
        setLastSync(parsedCache.timestamp);
      } catch (e) {
        console.error("Failed to parse odoo cache", e);
      }
    }
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, journalsRes, quotesRes] = await Promise.all([
        getCustomerInvoices(),
        getJournalEntries(),
        getQuotations()
      ]);

      const newData = {
        invoices: invoicesRes.data || [],
        journals: journalsRes.data || [],
        quotations: quotesRes.data || [],
      };

      const timestamp = new Date().toISOString();
      
      setData(newData);
      setLastSync(timestamp);

      localStorage.setItem('odoo_cache', JSON.stringify({
        data: newData,
        timestamp: timestamp
      }));

      toast({
        title: "تمت المزامنة",
        description: "تم تحديث البيانات من Odoo بنجاح",
        className: "bg-green-500 text-white border-none"
      });

    } catch (error) {
      console.error("Failed to fetch Odoo data", error);
      toast({
        variant: "destructive",
        title: "خطأ في المزامنة",
        description: "تأكد من إعدادات الاتصال"
      });
    } finally {
      setLoading(false);
    }
  };

  const DataTable = ({ items, type }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="p-3">الرقم</th>
            <th className="p-3">
                {type === 'quote' ? 'العميل' : type === 'journal' ? 'الدفتر' : 'الشريك'}
            </th>
            <th className="p-3">التاريخ</th>
            {type === 'journal' && <th className="p-3">المرجع</th>}
            <th className="p-3">المبلغ</th>
            <th className="p-3">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.length === 0 ? (
            <tr><td colSpan={type === 'journal' ? 6 : 5} className="p-4 text-center text-gray-500">لا توجد بيانات</td></tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{item.name}</td>
                
                <td className="p-3">
                    {type === 'journal' 
                        ? (Array.isArray(item.journal_id) ? item.journal_id[1] : '-') 
                        : (item.partner_id ? item.partner_id[1] : '-')}
                </td>

                <td className="p-3">{item.invoice_date || item.date_order || item.date || '-'}</td>
                
                {type === 'journal' && <td className="p-3 text-gray-500">{item.ref || '-'}</td>}

                <td className="p-3 font-bold text-blue-600">
                  {item.amount_total?.toLocaleString()} ر.س
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700`}>
                    {item.payment_state || item.state}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <PageTitle title="البيانات المالية (Odoo)" icon={Landmark} />
        <div className="flex items-center gap-3">
            {lastSync && (
                <span className="text-xs text-muted-foreground">
                    آخر تحديث: {format(new Date(lastSync), 'yyyy-MM-dd HH:mm:ss')}
                </span>
            )}
            <Button onClick={fetchAllData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            مزامنة البيانات
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">فواتير العملاء</p>
                <h3 className="text-2xl font-bold">{data.invoices.length}</h3>
              </div>
              <FileText className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-purple-500">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">قيود اليومية</p>
                <h3 className="text-2xl font-bold">{data.journals.length}</h3>
              </div>
              <BookOpen className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">عروض الأسعار</p>
                <h3 className="text-2xl font-bold">{data.quotations.length}</h3>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الجداول التفصيلية</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="invoices">فواتير المبيعات</TabsTrigger>
              <TabsTrigger value="journals">قيود اليومية</TabsTrigger>
              <TabsTrigger value="quotes">عروض الأسعار</TabsTrigger>
            </TabsList>
            
            <TabsContent value="invoices">
              <DataTable items={data.invoices} type="invoice" />
            </TabsContent>
            <TabsContent value="journals">
              <DataTable items={data.journals} type="journal" />
            </TabsContent>
            <TabsContent value="quotes">
              <DataTable items={data.quotations} type="quote" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OdooDashboard;