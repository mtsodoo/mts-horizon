import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Trophy, Plus, Save, AlertCircle, Trash2, Package, Edit, XCircle } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency } from '@/utils/currencyUtils';

const MatchDataEntry = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [matches, setMatches] = useState([]);
    const [rejectedMatches, setRejectedMatches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editingMatch, setEditingMatch] = useState(null);
    
    const [formData, setFormData] = useState({
        match_name: '',
        match_date: '',
        invoice_number: ''
    });

    const [matchItems, setMatchItems] = useState([]);
    const [expenses, setExpenses] = useState([]);

    useEffect(() => {
        loadCategories();
        loadMyMatches();
        loadRejectedMatches();
    }, []);

    const loadCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast({
                variant: "destructive",
                title: "خطأ في تحميل الأصناف",
                description: error.message
            });
        }
    };

    const loadMyMatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('id, match_name, match_date, invoice_number, created_at, status')
                .eq('created_by', user.id)
                .in('status', ['pending', 'approved'])
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setMatches(data || []);
        } catch (error) {
            console.error('Error loading matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRejectedMatches = async () => {
        try {
            const { data, error } = await supabase
                .from('matches')
                .select('id, match_name, match_date, invoice_number, created_at, status, rejection_reason')
                .eq('created_by', user.id)
                .eq('status', 'rejected')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRejectedMatches(data || []);
        } catch (error) {
            console.error('Error loading rejected matches:', error);
        }
    };

    const editRejectedMatch = async (match) => {
        setEditingMatch(match);
        setFormData({
            match_name: match.match_name,
            match_date: match.match_date,
            invoice_number: match.invoice_number
        });

        try {
            const { data: items, error: itemsError } = await supabase
                .from('match_items')
                .select('*')
                .eq('match_id', match.id);

            if (itemsError) throw itemsError;

            const { data: expenses, error: expensesError } = await supabase
                .from('match_expenses')
                .select('*')
                .eq('match_id', match.id);

            if (expensesError) throw expensesError;

            setMatchItems(items?.map(item => ({
                category_id: item.category_id,
                quantity: item.quantity
            })) || []);

            setExpenses(expenses?.map(exp => ({
                name: exp.name,
                amount: exp.amount
            })) || []);

        } catch (error) {
            console.error('Error loading match details:', error);
        }
    };

    const addMatchItem = () => {
        setMatchItems([...matchItems, { category_id: '', quantity: 0 }]);
    };

    const removeMatchItem = (index) => {
        setMatchItems(matchItems.filter((_, i) => i !== index));
    };

    const updateMatchItem = (index, field, value) => {
        const updated = [...matchItems];
        updated[index][field] = value;
        setMatchItems(updated);
    };

    const addExpense = () => {
        setExpenses([...expenses, { name: '', amount: 0 }]);
    };

    const removeExpense = (index) => {
        setExpenses(expenses.filter((_, i) => i !== index));
    };

    const updateExpense = (index, field, value) => {
        const updated = [...expenses];
        updated[index][field] = value;
        setExpenses(updated);
    };

    const getTotalExpenses = () => {
        return expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    };

    const resetForm = () => {
        setFormData({
            match_name: '',
            match_date: '',
            invoice_number: ''
        });
        setMatchItems([]);
        setExpenses([]);
        setEditingMatch(null);
    };

    const saveMatch = async (e) => {
        e.preventDefault();

        if (!formData.match_name || !formData.match_date || !formData.invoice_number) {
            toast({
                variant: "destructive",
                title: "بيانات ناقصة",
                description: "يرجى إدخال جميع الحقول المطلوبة"
            });
            return;
        }

        if (matchItems.length === 0) {
            toast({
                variant: "destructive",
                title: "بيانات ناقصة",
                description: "يرجى إضافة صنف واحد على الأقل"
            });
            return;
        }

        setLoading(true);
        try {
            const matchData = {
                match_name: formData.match_name,
                match_date: formData.match_date,
                invoice_number: formData.invoice_number,
                total_expenses: getTotalExpenses(),
                tax_rate: 15,
                status: 'pending',
                rejection_reason: null,
                created_by: user.id
            };

            let matchId;

            if (editingMatch) {
                // تعديل مباراة مرفوضة
                const { error } = await supabase
                    .from('matches')
                    .update(matchData)
                    .eq('id', editingMatch.id);

                if (error) throw error;
                matchId = editingMatch.id;

                // حذف الأصناف والمصروفات القديمة
                await supabase.from('match_items').delete().eq('match_id', matchId);
                await supabase.from('match_expenses').delete().eq('match_id', matchId);

            } else {
                // إنشاء مباراة جديدة
                const { data: newMatch, error: matchError } = await supabase
                    .from('matches')
                    .insert([matchData])
                    .select()
                    .single();

                if (matchError) throw matchError;
                matchId = newMatch.id;
            }

            const itemsToInsert = matchItems
                .filter(item => item.category_id && item.quantity > 0)
                .map(item => {
                    const category = categories.find(c => c.id === item.category_id);
                    return {
                        match_id: matchId,
                        category_id: item.category_id,
                        quantity: parseInt(item.quantity),
                        cost_price: category?.cost_price || 0,
                        selling_price: category?.selling_price || 0
                    };
                });

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase
                    .from('match_items')
                    .insert(itemsToInsert);
                
                if (itemsError) throw itemsError;
            }

            if (expenses.length > 0) {
                const expenseData = expenses
                    .filter(e => e.name && e.amount > 0)
                    .map(e => ({
                        match_id: matchId,
                        name: e.name,
                        amount: parseFloat(e.amount)
                    }));

                if (expenseData.length > 0) {
                    const { error: expError } = await supabase
                        .from('match_expenses')
                        .insert(expenseData);
                    
                    if (expError) throw expError;
                }
            }

            toast({
                title: editingMatch ? "تم التعديل والإرسال" : "تم الحفظ",
                description: editingMatch 
                    ? "تم تعديل المباراة وإعادة إرسالها للمراجعة" 
                    : "تم حفظ بيانات المباراة بنجاح",
                className: "bg-green-500 text-white"
            });

            resetForm();
            loadMyMatches();
            loadRejectedMatches();

        } catch (error) {
            console.error('Error saving match:', error);
            toast({
                variant: "destructive",
                title: "خطأ في الحفظ",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-4 md:p-6 space-y-6"
        >
            <Helmet><title>إدخال بيانات المباريات | MTS Supreme</title></Helmet>
            
            <PageTitle title="إدخال بيانات المباريات" icon={Trophy} />

            <Card className="border-t-4 border-[#714b67]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {editingMatch ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        {editingMatch ? 'تعديل مباراة مرفوضة' : 'إضافة مباراة جديدة'}
                    </CardTitle>
                    <CardDescription>
                        {editingMatch 
                            ? 'قم بتعديل البيانات وإعادة الإرسال للمراجعة' 
                            : 'أدخل البيانات الأساسية واختر الأصناف والكميات'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={saveMatch} className="space-y-6">
                        {editingMatch && (
                            <Alert className="bg-red-50 border-red-200">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-900">سبب الرفض</AlertTitle>
                                <AlertDescription className="text-red-800">
                                    {editingMatch.rejection_reason || 'لم يتم تحديد سبب'}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>اسم المباراة *</Label>
                                <Input
                                    value={formData.match_name}
                                    onChange={(e) => setFormData({...formData, match_name: e.target.value})}
                                    placeholder="مثال: القادسية vs النصر"
                                    className="text-right"
                                    required
                                />
                            </div>

                            <div>
                                <Label>تاريخ المباراة *</Label>
                                <Input
                                    type="date"
                                    value={formData.match_date}
                                    onChange={(e) => setFormData({...formData, match_date: e.target.value})}
                                    className="text-right"
                                    required
                                />
                            </div>

                            <div>
                                <Label>رقم الفاتورة *</Label>
                                <Input
                                    value={formData.invoice_number}
                                    onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                                    placeholder="مثال: INV-2025-001"
                                    className="text-right"
                                    required
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <Label className="text-lg font-bold flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    الأصناف ({categories.length} متاح)
                                </Label>
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    onClick={addMatchItem} 
                                    variant="outline" 
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    إضافة صنف
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {matchItems.map((item, index) => (
                                    <div key={index} className="flex gap-2">
                                        <select
                                            value={item.category_id}
                                            onChange={(e) => updateMatchItem(index, 'category_id', e.target.value)}
                                            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            required
                                        >
                                            <option value="">اختر الصنف</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name} ({cat.unit})
                                                </option>
                                            ))}
                                        </select>
                                        
                                        <Input
                                            type="number"
                                            placeholder="الكمية"
                                            value={item.quantity}
                                            onChange={(e) => updateMatchItem(index, 'quantity', e.target.value)}
                                            className="w-32 text-right"
                                            min="0"
                                            required
                                        />
                                        
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            onClick={() => removeMatchItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {matchItems.length === 0 && (
                                    <div className="text-center py-4 text-gray-400 text-sm">
                                        لا توجد أصناف. اضغط "إضافة صنف" لإضافة صنف جديد
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <Label className="text-lg font-bold">المصروفات</Label>
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    onClick={addExpense} 
                                    variant="outline" 
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    إضافة مصروف
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {expenses.map((expense, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            placeholder="اسم المصروف"
                                            value={expense.name}
                                            onChange={(e) => updateExpense(index, 'name', e.target.value)}
                                            className="flex-1 text-right"
                                        />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="المبلغ"
                                            value={expense.amount}
                                            onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                                            className="w-32 text-right"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            onClick={() => removeExpense(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {expenses.length === 0 && (
                                    <div className="text-center py-4 text-gray-400 text-sm">
                                        لا توجد مصروفات (اختياري)
                                    </div>
                                )}
                            </div>
                        </div>

                        {!editingMatch && (
                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-900">ملاحظة</AlertTitle>
                                <AlertDescription className="text-blue-800">
                                    قم بإدخال الأصناف والكميات فقط. سيقوم المدير المالي بمراجعة البيانات وإدخال الأسعار والتكاليف.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-end gap-2">
                            {editingMatch && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    إلغاء
                                </Button>
                            )}
                            <Button type="submit" disabled={loading} className="gap-2">
                                <Save className="h-4 w-4" />
                                {loading ? 'جاري الحفظ...' : editingMatch ? 'تعديل وإعادة الإرسال' : 'حفظ المباراة'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>مبارياتي</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">الكل</TabsTrigger>
                            <TabsTrigger value="rejected" className="gap-2">
                                المرفوضة
                                {rejectedMatches.length > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        {rejectedMatches.length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr className="text-right">
                                            <th className="p-3">اسم المباراة</th>
                                            <th className="p-3">التاريخ</th>
                                            <th className="p-3">رقم الفاتورة</th>
                                            <th className="p-3">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                                    جاري التحميل...
                                                </td>
                                            </tr>
                                        ) : matches.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                                    لم تقم بإدخال أي مباريات بعد
                                                </td>
                                            </tr>
                                        ) : (
                                            matches.map((match) => (
                                                <tr key={match.id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium">{match.match_name}</td>
                                                    <td className="p-3">{match.match_date}</td>
                                                    <td className="p-3 text-purple-600 font-mono text-sm">
                                                        {match.invoice_number || '-'}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            match.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            match.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {match.status === 'approved' ? 'معتمد' :
                                                             match.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </TabsContent>

                        <TabsContent value="rejected">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr className="text-right">
                                            <th className="p-3">اسم المباراة</th>
                                            <th className="p-3">التاريخ</th>
                                            <th className="p-3">سبب الرفض</th>
                                            <th className="p-3">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rejectedMatches.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                                    لا توجد مباريات مرفوضة
                                                </td>
                                            </tr>
                                        ) : (
                                            rejectedMatches.map((match) => (
                                                <tr key={match.id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium">{match.match_name}</td>
                                                    <td className="p-3">{match.match_date}</td>
                                                    <td className="p-3 text-red-600 text-sm">
                                                        {match.rejection_reason || 'لم يتم تحديد سبب'}
                                                    </td>
                                                    <td className="p-3">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => editRejectedMatch(match)}
                                                            className="gap-1"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                            تعديل وإعادة الإرسال
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default MatchDataEntry;