
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Search, Plus, Edit2, Trash2, Save, X, Upload, 
  AlertTriangle, CheckCircle, Image as ImageIcon, RefreshCw,
  Filter, BarChart3, ArrowUpDown, Box
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import PageTitle from '@/components/PageTitle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ✅ الشعار
const LOGO_URL = 'https://sys.mtserp.com/logo/b-logo.png';

// ✅ الفئات المتاحة
const CATEGORIES = [
  'شالات', 'أعلام', 'بنرات', 'تيشيرتات', 'قبعات', 
  'إكسسوارات', 'مايكات', 'طبول', 'بطاريات', 'مياه شرب'
];

const WarehouseManagement = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category: '',
    unit: 'قطعة',
    current_stock: 0,
    min_stock: 10,
    image_url: ''
  });

  // ✅ جلب المنتجات
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_products')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      console.error('Error:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل جلب المنتجات' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ✅ فلترة المنتجات
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.product_name.includes(searchTerm) || p.product_code.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ✅ إحصائيات
  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.current_stock <= p.min_stock).length,
    outOfStock: products.filter(p => p.current_stock === 0).length,
    categories: [...new Set(products.map(p => p.category))].length
  };

  // ✅ فتح نافذة الإضافة
  const handleAddNew = () => {
    setIsAddMode(true);
    setFormData({
      product_code: '',
      product_name: '',
      category: '',
      unit: 'قطعة',
      current_stock: 0,
      min_stock: 10,
      image_url: ''
    });
    setIsDialogOpen(true);
  };

  // ✅ فتح نافذة التعديل
  const handleEdit = (product) => {
    setIsAddMode(false);
    setEditingProduct(product);
    setFormData({
      product_code: product.product_code,
      product_name: product.product_name,
      category: product.category,
      unit: product.unit,
      current_stock: product.current_stock,
      min_stock: product.min_stock,
      image_url: product.image_url || ''
    });
    setIsDialogOpen(true);
  };

  // ✅ رفع صورة
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى اختيار ملف صورة' });
      return;
    }

    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'حجم الصورة يجب أن يكون أقل من 5MB' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `product_${Date.now()}.${fileExt}`;
      const filePath = `warehouse_products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'تم رفع الصورة بنجاح' });
    } catch (e) {
      console.error('Upload error:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل رفع الصورة' });
    } finally {
      setUploading(false);
    }
  };

  // ✅ حفظ المنتج
  const handleSave = async () => {
    if (!formData.product_code || !formData.product_name || !formData.category) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'أكمل جميع الحقول المطلوبة' });
      return;
    }

    try {
      if (isAddMode) {
        // إضافة منتج جديد
        const { error } = await supabase
          .from('warehouse_products')
          .insert([formData]);

        if (error) throw error;
        toast({ title: 'تم إضافة المنتج بنجاح' });
      } else {
        // تعديل منتج موجود
        const { error } = await supabase
          .from('warehouse_products')
          .update({
            product_name: formData.product_name,
            category: formData.category,
            unit: formData.unit,
            current_stock: formData.current_stock,
            min_stock: formData.min_stock,
            image_url: formData.image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'تم تحديث المنتج بنجاح' });
      }

      setIsDialogOpen(false);
      fetchProducts();
    } catch (e) {
      console.error('Save error:', e);
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  // ✅ فتح نافذة تأكيد الحذف
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  // ✅ تأكيد حذف المنتج
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('warehouse_products')
        .update({ is_active: false })
        .eq('id', productToDelete.id);

      if (error) throw error;
      toast({ title: 'تم حذف المنتج' });
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  // ✅ تحديث الكمية السريع
  const handleQuickStockUpdate = async (product, newStock) => {
    try {
      const { error } = await supabase
        .from('warehouse_products')
        .update({ 
          current_stock: parseInt(newStock) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;
      
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, current_stock: parseInt(newStock) || 0 } : p
      ));
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 pb-8"
    >
      <PageTitle title="إدارة المخزون" icon={Package} />

      {/* ✅ إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Box className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي المنتجات</p>
              <p className="text-xl font-bold text-blue-700">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">مخزون منخفض</p>
              <p className="text-xl font-bold text-amber-700">{stats.lowStock}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">نفذ من المخزون</p>
              <p className="text-xl font-bold text-red-700">{stats.outOfStock}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">الفئات</p>
              <p className="text-xl font-bold text-green-700">{stats.categories}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ أدوات البحث والفلترة */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={fetchProducts} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 ml-2" />
              إضافة منتج
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ✅ قائمة المنتجات */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            المنتجات ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">جاري التحميل...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>لا توجد منتجات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right p-3 text-xs font-bold text-gray-600">الصورة</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">الكود</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">المنتج</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">الفئة</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">الوحدة</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">المخزون</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">الحد الأدنى</th>
                    <th className="text-right p-3 text-xs font-bold text-gray-600">الحالة</th>
                    <th className="text-center p-3 text-xs font-bold text-gray-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.product_name}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {product.product_code}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-sm">{product.product_name}</td>
                      <td className="p-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{product.unit}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          value={product.current_stock}
                          onChange={(e) => handleQuickStockUpdate(product, e.target.value)}
                          className="w-20 h-8 text-center text-sm"
                        />
                      </td>
                      <td className="p-3 text-sm text-gray-600">{product.min_stock}</td>
                      <td className="p-3">
                        {product.current_stock === 0 ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            نفذ
                          </span>
                        ) : product.current_stock <= product.min_stock ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            منخفض
                          </span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            متوفر
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(product)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ نافذة الإضافة/التعديل */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAddMode ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              {isAddMode ? 'إضافة منتج جديد' : 'تعديل المنتج'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* صورة المنتج */}
            <div className="flex flex-col items-center gap-3">
              {formData.image_url ? (
                <img 
                  src={formData.image_url} 
                  alt="صورة المنتج"
                  className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Upload className="w-4 h-4 ml-2" />
                    )}
                    {uploading ? 'جاري الرفع...' : 'رفع صورة'}
                  </span>
                </Button>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود المنتج <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                  placeholder="SH-001"
                  disabled={!isAddMode}
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>الفئة <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>اسم المنتج <span className="text-red-500">*</span></Label>
              <Input
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="شال أحمر"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>الوحدة</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="قطعة"
                />
              </div>
              <div className="space-y-2">
                <Label>المخزون</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                />
              </div>
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

      {/* ✅ نافذة تأكيد الحذف */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حذف المنتج "{productToDelete?.product_name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default WarehouseManagement;
