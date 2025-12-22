import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Package, Plus, Edit2, Trash2, Search, Save, X } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/utils/currencyUtils';

const ProductCategories = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        cost_price: 0,
        selling_price: 0,
        unit: 'شخص',
        category: ''
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const openAddDialog = () => {
        setEditMode(false);
        setSelectedCategory(null);
        setFormData({
            code: '',
            name: '',
            cost_price: 0,
            selling_price: 0,
            unit: 'شخص',
            category: ''
        });
        setShowDialog(true);
    };

    const openEditDialog = (category) => {
        setEditMode(true);
        setSelectedCategory(category);
        setFormData({
            code: category.code,
            name: category.name,
            cost_price: category.cost_price,
            selling_price: category.selling_price,
            unit: category.unit,
            category: category.category
        });
        setShowDialog(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editMode) {
                const { error } = await supabase
                    .from('product_categories')
                    .update(formData)
                    .eq('id', selectedCategory.id);

                if (error) throw error;

                toast({
                    title: "تم التحديث",
                    description: "تم تحديث الصنف بنجاح",
                    className: "bg-green-500 text-white"
                });
            } else {
                const { error } = await supabase
                    .from('product_categories')
                    .insert([formData]);

                if (error) throw error;

                toast({
                    title: "تم الإضافة",
                    description: "تم إضافة الصنف بنجاح",
                    className: "bg-green-500 text-white"
                });
            }

            setShowDialog(false);
            loadCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('product_categories')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "تم الحذف",
                description: "تم حذف الصنف بنجاح",
                className: "bg-green-500 text-white"
            });

            loadCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedCategories = filteredCategories.reduce((acc, cat) => {
        const group = cat.category || 'أخرى';
        if (!acc[group]) acc[group] = [];
        acc[group].push(cat);
        return acc;
    }, {});

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-4 md:p-6 space-y-6"
        >
            <Helmet><title>إدارة الأصناف | MTS Supreme</title></Helmet>
            
            <PageTitle title="إدارة أصناف المنتجات" icon={Package} />

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle>الأصناف ({categories.length})</CardTitle>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="بحث..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-10"
                                />
                            </div>
                            <Button onClick={openAddDialog} className="gap-2">
                                <Plus className="h-4 w-4" />
                                إضافة صنف
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                    ) : Object.keys(groupedCategories).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">لا توجد أصناف</div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedCategories).map(([group, items]) => (
                                <div key={group}>
                                    <h3 className="text-lg font-bold mb-3 text-[#714b67]">{group}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr className="text-right">
                                                    <th className="p-3">الكود</th>
                                                    <th className="p-3">الاسم</th>
                                                    <th className="p-3">الوحدة</th>
                                                    <th className="p-3">التكلفة</th>
                                                    <th className="p-3">سعر البيع</th>
                                                    <th className="p-3">الربح</th>
                                                    <th className="p-3">الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {items.map((cat) => {
                                                    const profit = cat.selling_price - cat.cost_price;
                                                    return (
                                                        <tr key={cat.id} className="hover:bg-gray-50">
                                                            <td className="p-3 font-mono text-sm">{cat.code}</td>
                                                            <td className="p-3 font-medium">{cat.name}</td>
                                                            <td className="p-3">{cat.unit}</td>
                                                            <td className="p-3 number text-orange-600">
                                                                {formatCurrency(cat.cost_price)}
                                                            </td>
                                                            <td className="p-3 number text-blue-600">
                                                                {formatCurrency(cat.selling_price)}
                                                            </td>
                                                            <td className={`p-3 number font-bold ${profit > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                                {formatCurrency(profit)}
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => openEditDialog(cat)}
                                                                    >
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => handleDelete(cat.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editMode ? 'تعديل الصنف' : 'إضافة صنف جديد'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <Label>الكود *</Label>
                            <Input
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value})}
                                placeholder="f001"
                                required
                                disabled={editMode}
                            />
                        </div>
                        <div>
                            <Label>الاسم *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="اسم الصنف"
                                className="text-right"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>التكلفة *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value)})}
                                    required
                                />
                            </div>
                            <div>
                                <Label>سعر البيع *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.selling_price}
                                    onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>الوحدة *</Label>
                                <Input
                                    value={formData.unit}
                                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                    placeholder="شخص"
                                    className="text-right"
                                    required
                                />
                            </div>
                            <div>
                                <Label>التصنيف</Label>
                                <Input
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    placeholder="جماهير"
                                    className="text-right"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                <X className="h-4 w-4 ml-2" />
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading}>
                                <Save className="h-4 w-4 ml-2" />
                                {loading ? 'جاري الحفظ...' : 'حفظ'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default ProductCategories;