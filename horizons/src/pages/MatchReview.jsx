import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, Plus, Trash2, Edit2, Save } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/utils/currencyUtils';

const MatchReview = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [matches, setMatches] = useState([]);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [matchItems, setMatchItems] = useState([]);
    const [matchExpenses, setMatchExpenses] = useState([]);
    
    const [suppliers, setSuppliers] = useState([
        { name: '', amount: 0 },
        { name: '', amount: 0 },
        { name: '', amount: 0 },
        { name: '', amount: 0 },
        { name: '', amount: 0 }
    ]);

    const [additionalProfit, setAdditionalProfit] = useState(0);
    const [editingPrices, setEditingPrices] = useState({});

    useEffect(() => {
        loadPendingMatches();
    }, []);

    const loadPendingMatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('matches')
                .select(`
                    *,
                    profiles:created_by (full_name)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMatches(data || []);
        } catch (error) {
            console.error('Error loading matches:', error);
            toast({
                variant: "destructive",
                title: "خطأ في تحميل المباريات",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const openReviewDialog = async (match) => {
        setSelectedMatch(match);
        setAdditionalProfit(match.additional_profit || 0);
        setLoading(true);
        
        try {
            const { data: items, error: itemsError } = await supabase
                .from('match_items')
                .select(`
                    *,
                    product_categories (id, code, name, unit, category)
                `)
                .eq('match_id', match.id);

            if (itemsError) throw itemsError;

            const { data: expenses, error: expensesError } = await supabase
                .from('match_expenses')
                .select('*')
                .eq('match_id', match.id);

            if (expensesError) throw expensesError;

            const { data: savedSuppliers, error: suppliersError } = await supabase
                .from('match_suppliers')
                .select('*')
                .eq('match_id', match.id);

            if (suppliersError) throw suppliersError;

            if (savedSuppliers && savedSuppliers.length > 0) {
                setSuppliers(savedSuppliers.map(s => ({ name: s.supplier_name, amount: s.amount })));
            } else {
                setSuppliers([
                    { name: '', amount: 0 },
                    { name: '', amount: 0 },
                    { name: '', amount: 0 },
                    { name: '', amount: 0 },
                    { name: '', amount: 0 }
                ]);
            }

            setMatchItems(items || []);
            setMatchExpenses(expenses || []);
            
            // Initialize editing prices
            const pricesObj = {};
            items?.forEach(item => {
                pricesObj[item.id] = item.selling_price;
            });
            setEditingPrices(pricesObj);
            
            setShowDialog(true);
        } catch (error) {
            console.error('Error loading match details:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const addSupplier = () => {
        setSuppliers([...suppliers, { name: '', amount: 0 }]);
    };

    const removeSupplier = (index) => {
        if (suppliers.length <= 1) {
            toast({
                variant: "destructive",
                title: "تنبيه",
                description: "يجب أن يكون هناك مورد واحد على الأقل"
            });
            return;
        }
        setSuppliers(suppliers.filter((_, i) => i !== index));
    };

    const updateSupplier = (index, field, value) => {
        const updated = [...suppliers];
        updated[index][field] = value;
        setSuppliers(updated);
    };

    const updateItemPrice = (itemId, newPrice) => {
        setEditingPrices(prev => ({
            ...prev,
            [itemId]: newPrice
        }));
    };

    const getTotalSuppliersCost = () => {
        return suppliers
            .filter(s => s.name && s.amount > 0)
            .reduce((sum, s) => sum + parseFloat(s.amount), 0);
    };

    const calculateRevenue = () => {
        return matchItems.reduce((sum, item) => {
            const price = parseFloat(editingPrices[item.id]) || 0;
            return sum + (item.quantity * price);
        }, 0);
    };

    const getTotalExpenses = () => {
        return matchExpenses.reduce((sum, exp) => 
            sum + (parseFloat(exp.amount) || 0), 0
        );
    };

    const handleApprove = async () => {
        if (!selectedMatch) return;

        const validSuppliers = suppliers.filter(s => s.name && s.amount > 0);
        
        if (validSuppliers.length === 0) {
            toast({
                variant: "destructive",
                title: "بيانات ناقصة",
                description: "يرجى إدخال مورد واحد على الأقل"
            });
            return;
        }
        
        setLoading(true);
        try {
            // حذف الموردين القديمين
            await supabase
                .from('match_suppliers')
                .delete()
                .eq('match_id', selectedMatch.id);

            // إضافة الموردين الجدد
            const suppliersData = validSuppliers.map(s => ({
                match_id: selectedMatch.id,
                supplier_name: s.name,
                amount: parseFloat(s.amount)
            }));

            const { error: suppliersError } = await supabase
                .from('match_suppliers')
                .insert(suppliersData);

            if (suppliersError) throw suppliersError;

            // تحديث أسعار الأصناف
            const priceUpdates = matchItems.map(item => ({
                id: item.id,
                selling_price: parseFloat(editingPrices[item.id]) || item.selling_price
            }));

            for (const update of priceUpdates) {
                await supabase
                    .from('match_items')
                    .update({ selling_price: update.selling_price })
                    .eq('id', update.id);
            }

            // تحديث حالة المباراة
            const { error } = await supabase
                .from('matches')
                .update({ 
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    actual_total_cost: getTotalSuppliersCost(),
                    additional_profit: parseFloat(additionalProfit) || 0
                })
                .eq('id', selectedMatch.id);

            if (error) throw error;

            toast({
                title: "تم الاعتماد",
                description: "تم اعتماد المباراة وحفظ جميع البيانات",
                className: "bg-green-500 text-white"
            });

            setShowDialog(false);
            loadPendingMatches();
        } catch (error) {
            console.error('Error approving match:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedMatch) return;
        
        const reason = window.prompt('سبب الرفض (اختياري):');
        
        setLoading(true);
        try {
            const { error } = await supabase
                .from('matches')
                .update({ 
                    status: 'rejected',
                    rejection_reason: reason || null
                })
                .eq('id', selectedMatch.id);

            if (error) throw error;

            toast({
                title: "تم الرفض",
                description: "تم رفض المباراة",
                className: "bg-red-500 text-white"
            });

            setShowDialog(false);
            loadPendingMatches();
        } catch (error) {
            console.error('Error rejecting match:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const revenue = calculateRevenue();
    const totalExpenses = getTotalExpenses();
    const totalSuppliersCost = getTotalSuppliersCost();
    const grossProfit = revenue - totalSuppliersCost;
    const netProfit = grossProfit - totalExpenses + parseFloat(additionalProfit || 0);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-4 md:p-6 space-y-6"
        >
            <Helmet><title>مراجعة المباريات | MTS Supreme</title></Helmet>
            
            <PageTitle title="مراجعة واعتماد المباريات" icon={CheckCircle} />

            <Card>
                <CardHeader>
                    <CardTitle>المباريات المعلقة ({matches.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">لا توجد مباريات معلقة</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr className="text-right">
                                        <th className="p-3">اسم المباراة</th>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">رقم الفاتورة</th>
                                        <th className="p-3">المسؤول</th>
                                        <th className="p-3">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {matches.map((match) => (
                                        <tr key={match.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">{match.match_name}</td>
                                            <td className="p-3">{match.match_date}</td>
                                            <td className="p-3 font-mono text-sm text-purple-600">
                                                {match.invoice_number || '-'}
                                            </td>
                                            <td className="p-3">{match.profiles?.full_name}</td>
                                            <td className="p-3">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openReviewDialog(match)}
                                                    className="gap-1"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    مراجعة
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>مراجعة المباراة - {selectedMatch?.match_name}</DialogTitle>
                    </DialogHeader>
                    
                    {selectedMatch && (
                        <div className="space-y-6">
                            {/* معلومات أساسية */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">التاريخ:</span>
                                            <span className="mr-2 font-medium">{selectedMatch.match_date}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">رقم الفاتورة:</span>
                                            <span className="mr-2 font-medium font-mono text-purple-600">{selectedMatch.invoice_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">المدخل:</span>
                                            <span className="mr-2 font-medium">{selectedMatch.profiles?.full_name}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* عرض السعر - الأصناف مع تعديل الأسعار */}
                            <Card className="border-2 border-blue-400 bg-blue-50">
                                <CardHeader>
                                    <CardTitle className="text-base text-blue-700 flex items-center gap-2">
                                        <Edit2 className="h-5 w-5" />
                                        عرض السعر (يمكنك تعديل الأسعار)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto bg-white rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gradient-to-r from-blue-100 to-blue-50">
                                                <tr className="text-right">
                                                    <th className="p-3">#</th>
                                                    <th className="p-3">الصنف</th>
                                                    <th className="p-3">التصنيف</th>
                                                    <th className="p-3">الوحدة</th>
                                                    <th className="p-3">الكمية</th>
                                                    <th className="p-3">السعر/وحدة</th>
                                                    <th className="p-3">الإجمالي</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {matchItems.map((item, idx) => {
                                                    const price = parseFloat(editingPrices[item.id]) || 0;
                                                    const total = item.quantity * price;
                                                    return (
                                                        <tr key={item.id} className="hover:bg-gray-50">
                                                            <td className="p-3 font-bold text-gray-600">{idx + 1}</td>
                                                            <td className="p-3 font-medium">{item.product_categories?.name}</td>
                                                            <td className="p-3 text-sm text-gray-600">{item.product_categories?.category}</td>
                                                            <td className="p-3 text-sm">{item.product_categories?.unit}</td>
                                                            <td className="p-3 number text-center font-bold text-lg">{item.quantity}</td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editingPrices[item.id]}
                                                                    onChange={(e) => updateItemPrice(item.id, e.target.value)}
                                                                    className="w-32 text-right font-bold text-blue-600"
                                                                />
                                                            </td>
                                                            <td className="p-3 number text-blue-600 font-bold text-lg">
                                                                {formatCurrency(total)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-blue-100 font-bold">
                                                    <td colSpan={6} className="p-3 text-left text-lg">إجمالي الإيرادات:</td>
                                                    <td className="p-3 number text-blue-700 text-xl">
                                                        {formatCurrency(revenue)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* تكاليف الموردين */}
                            <Card className="border-2 border-orange-400 bg-orange-50">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base text-orange-700">
                                            تكاليف الموردين (مطلوب)
                                        </CardTitle>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            onClick={addSupplier}
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            إضافة مورد
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {suppliers.map((supplier, index) => (
                                            <div key={index} className="flex gap-2 items-center bg-white p-3 rounded-lg">
                                                <span className="text-sm font-bold text-gray-600 w-8">#{index + 1}</span>
                                                <Input
                                                    placeholder="اسم المورد"
                                                    value={supplier.name}
                                                    onChange={(e) => updateSupplier(index, 'name', e.target.value)}
                                                    className="flex-1 text-right"
                                                />
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="المبلغ"
                                                    value={supplier.amount}
                                                    onChange={(e) => updateSupplier(index, 'amount', e.target.value)}
                                                    className="w-40 text-right font-bold"
                                                />
                                                {suppliers.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="destructive"
                                                        onClick={() => removeSupplier(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        
                                        <div className="flex justify-between items-center pt-3 border-t-2 border-orange-400 bg-white p-3 rounded-lg">
                                            <span className="font-bold text-lg">إجمالي تكاليف الموردين:</span>
                                            <span className="number text-2xl font-bold text-orange-600">
                                                {formatCurrency(totalSuppliersCost)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* الأرباح الإضافية */}
                            <Card className="border-2 border-green-400 bg-green-50">
                                <CardHeader>
                                    <CardTitle className="text-base text-green-700">
                                        أرباح إضافية (اختياري)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label className="text-base font-bold">
                                            هل يوجد أرباح إضافية لهذه المباراة؟
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={additionalProfit}
                                            onChange={(e) => setAdditionalProfit(e.target.value)}
                                            placeholder="0.00"
                                            className="text-right text-xl font-bold"
                                        />
                                        <p className="text-sm text-gray-600">
                                            مثال: مكافآت، عمولات، أو أي إيرادات إضافية خارج عرض السعر الأساسي
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* المصروفات الإضافية */}
                            {matchExpenses.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">المصروفات الإضافية (من الموظف)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr className="text-right">
                                                    <th className="p-3">اسم المصروف</th>
                                                    <th className="p-3">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {matchExpenses.map((exp) => (
                                                    <tr key={exp.id}>
                                                        <td className="p-3">{exp.name}</td>
                                                        <td className="p-3 number text-red-600 font-bold">
                                                            {formatCurrency(exp.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-100 font-bold">
                                                    <td className="p-3">إجمالي المصروفات:</td>
                                                    <td className="p-3 number text-red-600">
                                                        {formatCurrency(totalExpenses)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* الملخص المالي النهائي */}
                            <Card className="border-2 border-[#714b67] bg-gradient-to-br from-purple-50 to-blue-50">
                                <CardContent className="pt-6">
                                    <h3 className="font-bold text-lg mb-4 text-[#714b67]">الملخص المالي النهائي</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">إجمالي الإيرادات (من عرض السعر):</span>
                                            <span className="number text-xl font-bold text-blue-600">
                                                {formatCurrency(revenue)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">تكاليف الموردين:</span>
                                            <span className="number text-xl font-bold text-orange-600">
                                                -{formatCurrency(totalSuppliersCost)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">الربح الإجمالي:</span>
                                            <span className={`number text-xl font-bold ${
                                                grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {formatCurrency(grossProfit)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">المصروفات الإضافية:</span>
                                            <span className="number text-xl font-bold text-red-600">
                                                -{formatCurrency(totalExpenses)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">الأرباح الإضافية:</span>
                                            <span className="number text-xl font-bold text-green-600">
                                                +{formatCurrency(parseFloat(additionalProfit) || 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t-2 border-[#714b67]">
                                            <span className="font-bold text-lg">صافي الربح:</span>
                                            <span className={`number text-2xl font-bold ${
                                                netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                                {formatCurrency(netProfit)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* أزرار الاعتماد/الرفض */}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setShowDialog(false)}>
                                    إلغاء
                                </Button>
                                <Button variant="destructive" onClick={handleReject} disabled={loading}>
                                    <XCircle className="h-4 w-4 ml-2" />
                                    رفض
                                </Button>
                                <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="h-4 w-4 ml-2" />
                                    اعتماد وحفظ
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default MatchReview;