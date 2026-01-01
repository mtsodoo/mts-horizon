
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Car, 
  Truck, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Upload, 
  Fuel, 
  FileText,
  Gauge
} from 'lucide-react';
import { message, Spin, Empty, Popconfirm } from 'antd';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, differenceInDays, parseISO, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';

const FleetManagement = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [vehicles, setVehicles] = useState([]);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, attention
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [formData, setFormData] = useState({
        plate_number: '',
        vehicle_type: 'sedan',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        vin: '',
        serial_number: '',
        registration_expiry: '',
        insurance_expiry: '',
        next_inspection_date: '',
        km_reading: '',
        driver_id: 'none',
        vehicle_image: null,
        registration_image: null,
        insurance_image: null,
        inspection_image: null
    });
    
    // File Inputs State
    const [vehicleImageFile, setVehicleImageFile] = useState(null);
    const [registrationImageFile, setRegistrationImageFile] = useState(null);
    const [insuranceImageFile, setInsuranceImageFile] = useState(null);
    const [inspectionImageFile, setInspectionImageFile] = useState(null);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        filterVehicles();
    }, [vehicles, searchTerm, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Vehicles
            const { data: vehiclesData, error: vehiclesError } = await supabase
                .from('fleet_vehicles')
                .select(`
                    *,
                    driver:external_staff(id, staff_name, phone)
                `)
                .order('created_at', { ascending: false });

            if (vehiclesError) throw vehiclesError;

            // Fetch Drivers (External Staff)
            const { data: driversData, error: driversError } = await supabase
                .from('external_staff')
                .select('*')
                .eq('is_active', true)
                .order('staff_name');

            if (driversError) throw driversError;

            setVehicles(vehiclesData || []);
            setDrivers(driversData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            message.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const filterVehicles = () => {
        let result = [...vehicles];

        // Search Filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(v => 
                v.plate_number.toLowerCase().includes(lowerSearch) ||
                v.brand?.toLowerCase().includes(lowerSearch) ||
                v.model?.toLowerCase().includes(lowerSearch) ||
                v.driver?.staff_name?.toLowerCase().includes(lowerSearch)
            );
        }

        // Status Filter
        if (statusFilter === 'active') {
            result = result.filter(v => v.status !== 'inactive');
        } else if (statusFilter === 'attention') {
            result = result.filter(v => {
                const regStatus = getExpiryStatus(v.registration_expiry);
                const insStatus = getExpiryStatus(v.insurance_expiry);
                const inspStatus = getExpiryStatus(v.next_inspection_date);
                return regStatus.color !== 'green' || insStatus.color !== 'green' || inspStatus.color !== 'green';
            });
        }

        setFilteredVehicles(result);
    };

    // Helper to calculate expiry status
    const getExpiryStatus = (dateString) => {
        if (!dateString) return { color: 'gray', text: 'غير محدد', days: null };
        
        const date = parseISO(dateString);
        const daysLeft = differenceInDays(date, new Date());
        
        if (daysLeft < 0) return { color: 'red', text: 'منتهي', days: daysLeft };
        if (daysLeft <= 7) return { color: 'red', text: `ينتهي خلال ${daysLeft} يوم`, days: daysLeft };
        if (daysLeft <= 30) return { color: 'yellow', text: `ينتهي خلال ${daysLeft} يوم`, days: daysLeft };
        
        return { color: 'green', text: 'ساري', days: daysLeft };
    };

    const handleOpenModal = (vehicle = null) => {
        setEditingVehicle(vehicle);
        setVehicleImageFile(null);
        setRegistrationImageFile(null);
        setInsuranceImageFile(null);
        setInspectionImageFile(null);

        if (vehicle) {
            setFormData({
                plate_number: vehicle.plate_number,
                vehicle_type: vehicle.vehicle_type || 'sedan',
                brand: vehicle.brand || '',
                model: vehicle.model || '',
                year: vehicle.year || new Date().getFullYear(),
                color: vehicle.color || '',
                vin: vehicle.vin || '',
                serial_number: vehicle.serial_number || '',
                registration_expiry: vehicle.registration_expiry || '',
                insurance_expiry: vehicle.insurance_expiry || '',
                next_inspection_date: vehicle.next_inspection_date || '',
                km_reading: vehicle.km_reading || '',
                driver_id: vehicle.driver_id || 'none',
                vehicle_image: vehicle.vehicle_image,
                registration_image: vehicle.registration_image,
                insurance_image: vehicle.insurance_image,
                inspection_image: vehicle.inspection_image
            });
        } else {
            setFormData({
                plate_number: '',
                vehicle_type: 'sedan',
                brand: '',
                model: '',
                year: new Date().getFullYear(),
                color: '',
                vin: '',
                serial_number: '',
                registration_expiry: '',
                insurance_expiry: '',
                next_inspection_date: '',
                km_reading: '',
                driver_id: 'none',
                vehicle_image: null,
                registration_image: null,
                insurance_image: null,
                inspection_image: null
            });
        }
        setIsModalOpen(true);
    };

    const handleUpload = async (file, pathPrefix) => {
        if (!file) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${pathPrefix}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('fleet-images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('fleet-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.plate_number) {
            message.error('رقم اللوحة مطلوب');
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload images if new files selected
            let vehicleImageUrl = formData.vehicle_image;
            let registrationImageUrl = formData.registration_image;
            let insuranceImageUrl = formData.insurance_image;
            let inspectionImageUrl = formData.inspection_image;

            if (vehicleImageFile) vehicleImageUrl = await handleUpload(vehicleImageFile, 'vehicle');
            if (registrationImageFile) registrationImageUrl = await handleUpload(registrationImageFile, 'reg');
            if (insuranceImageFile) insuranceImageUrl = await handleUpload(insuranceImageFile, 'ins');
            if (inspectionImageFile) inspectionImageUrl = await handleUpload(inspectionImageFile, 'insp');

            const payload = {
                plate_number: formData.plate_number,
                vehicle_type: formData.vehicle_type,
                brand: formData.brand,
                model: formData.model,
                year: parseInt(formData.year) || null,
                color: formData.color,
                vin: formData.vin,
                serial_number: formData.serial_number,
                registration_expiry: formData.registration_expiry || null,
                insurance_expiry: formData.insurance_expiry || null,
                next_inspection_date: formData.next_inspection_date || null,
                km_reading: parseInt(formData.km_reading) || null,
                driver_id: formData.driver_id === 'none' ? null : formData.driver_id,
                vehicle_image: vehicleImageUrl,
                registration_image: registrationImageUrl,
                insurance_image: insuranceImageUrl,
                inspection_image: inspectionImageUrl,
            };

            if (editingVehicle) {
                const { error } = await supabase
                    .from('fleet_vehicles')
                    .update(payload)
                    .eq('id', editingVehicle.id);
                if (error) throw error;
                message.success('تم تحديث بيانات المركبة');
            } else {
                const { error } = await supabase
                    .from('fleet_vehicles')
                    .insert([payload]);
                if (error) throw error;
                message.success('تم إضافة المركبة بنجاح');
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Submission error:', error);
            message.error('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase
                .from('fleet_vehicles')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            message.success('تم حذف المركبة');
            fetchData();
        } catch (error) {
            message.error('فشل الحذف');
        }
    };

    const getStatusBadgeColor = (statusObj) => {
        switch (statusObj.color) {
            case 'green': return 'bg-green-100 text-green-800 border-green-200';
            case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'red': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <>
            <Helmet>
                <title>إدارة الأسطول | MTS</title>
            </Helmet>
            <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageTitle title="إدارة الأسطول" icon={Car} />
                    <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90 gap-2">
                        <Plus className="w-4 h-4" />
                        إضافة مركبة
                    </Button>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="بحث برقم اللوحة، الماركة، أو السائق..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                        <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                                <TabsTrigger value="all">الكل ({vehicles.length})</TabsTrigger>
                                <TabsTrigger value="active">نشط</TabsTrigger>
                                <TabsTrigger value="attention">يحتاج انتباه</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </Card>

                {/* Fleet Grid */}
                {loading ? (
                    <div className="flex justify-center py-12"><Spin size="large" /></div>
                ) : filteredVehicles.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">لا توجد مركبات</h3>
                        <p className="text-gray-500">قم بإضافة مركبات جديدة للأسطول</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {filteredVehicles.map(vehicle => {
                            const regStatus = getExpiryStatus(vehicle.registration_expiry);
                            const insStatus = getExpiryStatus(vehicle.insurance_expiry);
                            const inspStatus = getExpiryStatus(vehicle.next_inspection_date);
                            
                            return (
                                <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                                    <div className="relative h-48 bg-gray-100">
                                        {vehicle.vehicle_image ? (
                                            <img 
                                                src={vehicle.vehicle_image} 
                                                alt={vehicle.plate_number} 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <Car className="w-16 h-16 opacity-20" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <Badge className="bg-white/90 text-black hover:bg-white backdrop-blur-sm shadow-sm text-sm font-bold px-2 py-1">
                                                {vehicle.plate_number}
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    <CardContent className="pt-4 pb-2 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{vehicle.brand} {vehicle.model}</h3>
                                                <p className="text-sm text-gray-500">{vehicle.year} • {vehicle.color}</p>
                                            </div>
                                            {vehicle.vehicle_type === 'truck' ? (
                                                <Truck className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <Car className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                                            <User className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium">السائق:</span>
                                            {vehicle.driver ? (
                                                <span className="text-gray-900">{vehicle.driver.staff_name}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">غير محدد</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className={`p-2 rounded border ${getStatusBadgeColor(regStatus)} flex flex-col items-center justify-center text-center`}>
                                                <span className="font-semibold mb-1">الاستمارة</span>
                                                <span>{regStatus.text}</span>
                                            </div>
                                            <div className={`p-2 rounded border ${getStatusBadgeColor(insStatus)} flex flex-col items-center justify-center text-center`}>
                                                <span className="font-semibold mb-1">التأمين</span>
                                                <span>{insStatus.text}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                                            <div className="flex items-center gap-1">
                                                <Gauge className="w-3 h-3" />
                                                <span>{vehicle.km_reading?.toLocaleString() || '-'} كم</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>فحص: {inspStatus.text}</span>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="bg-gray-50 p-3 flex justify-between">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(vehicle)}>
                                            <Edit className="w-4 h-4 ml-2 text-blue-600" />
                                            تعديل
                                        </Button>
                                        <Popconfirm
                                            title="حذف المركبة"
                                            description="هل أنت متأكد من حذف هذه المركبة؟"
                                            onConfirm={() => handleDelete(vehicle.id)}
                                            okText="نعم"
                                            cancelText="لا"
                                            okButtonProps={{ className: "bg-red-500" }}
                                        >
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4 ml-2" />
                                                حذف
                                            </Button>
                                        </Popconfirm>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Vehicle Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingVehicle ? 'تعديل بيانات المركبة' : 'إضافة مركبة جديدة'}</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>رقم اللوحة *</Label>
                                <Input 
                                    value={formData.plate_number} 
                                    onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                                    placeholder="مثال: أ ب ج 1234"
                                    required
                                />
                            </div>
                            <div>
                                <Label>النوع</Label>
                                <Select 
                                    value={formData.vehicle_type} 
                                    onValueChange={(val) => setFormData({...formData, vehicle_type: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sedan">سيدان</SelectItem>
                                        <SelectItem value="suv">SUV</SelectItem>
                                        <SelectItem value="pickup">بيك أب</SelectItem>
                                        <SelectItem value="van">فان</SelectItem>
                                        <SelectItem value="truck">شاحنة</SelectItem>
                                        <SelectItem value="bus">حافلة</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>الماركة</Label>
                                <Input 
                                    value={formData.brand} 
                                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                    placeholder="تويوتا"
                                />
                            </div>
                            <div>
                                <Label>الموديل</Label>
                                <Input 
                                    value={formData.model} 
                                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                                    placeholder="هايلكس"
                                />
                            </div>
                            <div>
                                <Label>السنة</Label>
                                <Input 
                                    type="number"
                                    value={formData.year} 
                                    onChange={(e) => setFormData({...formData, year: e.target.value})}
                                    placeholder="2024"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>اللون</Label>
                                <Input 
                                    value={formData.color} 
                                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                                />
                            </div>
                            <div>
                                <Label>عداد الكيلومترات</Label>
                                <Input 
                                    type="number"
                                    value={formData.km_reading} 
                                    onChange={(e) => setFormData({...formData, km_reading: e.target.value})}
                                />
                            </div>
                             <div>
                                <Label>السائق المسؤول</Label>
                                <Select 
                                    value={formData.driver_id} 
                                    onValueChange={(val) => setFormData({...formData, driver_id: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر السائق" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- بدون سائق --</SelectItem>
                                        {drivers.map(driver => (
                                            <SelectItem key={driver.id} value={driver.id}>
                                                {driver.staff_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>رقم الهيكل (VIN)</Label>
                                <Input 
                                    value={formData.vin} 
                                    onChange={(e) => setFormData({...formData, vin: e.target.value})}
                                />
                            </div>
                            <div>
                                <Label>الرقم التسلسلي</Label>
                                <Input 
                                    value={formData.serial_number} 
                                    onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                التواريخ والانتهاء
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>انتهاء الاستمارة</Label>
                                    <Input 
                                        type="date"
                                        value={formData.registration_expiry} 
                                        onChange={(e) => setFormData({...formData, registration_expiry: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <Label>انتهاء التأمين</Label>
                                    <Input 
                                        type="date"
                                        value={formData.insurance_expiry} 
                                        onChange={(e) => setFormData({...formData, insurance_expiry: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <Label>الفحص الدوري القادم</Label>
                                    <Input 
                                        type="date"
                                        value={formData.next_inspection_date} 
                                        onChange={(e) => setFormData({...formData, next_inspection_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                الصور والمرفقات
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label className="text-xs mb-1 block">صورة المركبة</Label>
                                    <div className="border-2 border-dashed rounded-md p-2 text-center hover:bg-gray-50 cursor-pointer relative h-20 flex items-center justify-center">
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setVehicleImageFile(e.target.files[0])}
                                        />
                                        {vehicleImageFile ? (
                                            <span className="text-green-600 text-xs truncate w-full">{vehicleImageFile.name}</span>
                                        ) : formData.vehicle_image ? (
                                            <img src={formData.vehicle_image} alt="preview" className="h-full object-contain" />
                                        ) : (
                                            <Plus className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs mb-1 block">صورة الاستمارة</Label>
                                    <div className="border-2 border-dashed rounded-md p-2 text-center hover:bg-gray-50 cursor-pointer relative h-20 flex items-center justify-center">
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setRegistrationImageFile(e.target.files[0])}
                                        />
                                        {registrationImageFile ? (
                                            <span className="text-green-600 text-xs truncate w-full">{registrationImageFile.name}</span>
                                        ) : formData.registration_image ? (
                                            <img src={formData.registration_image} alt="preview" className="h-full object-contain" />
                                        ) : (
                                            <FileText className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs mb-1 block">صورة التأمين</Label>
                                    <div className="border-2 border-dashed rounded-md p-2 text-center hover:bg-gray-50 cursor-pointer relative h-20 flex items-center justify-center">
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setInsuranceImageFile(e.target.files[0])}
                                        />
                                        {insuranceImageFile ? (
                                            <span className="text-green-600 text-xs truncate w-full">{insuranceImageFile.name}</span>
                                        ) : formData.insurance_image ? (
                                            <img src={formData.insurance_image} alt="preview" className="h-full object-contain" />
                                        ) : (
                                            <Shield className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs mb-1 block">صورة الفحص</Label>
                                    <div className="border-2 border-dashed rounded-md p-2 text-center hover:bg-gray-50 cursor-pointer relative h-20 flex items-center justify-center">
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setInspectionImageFile(e.target.files[0])}
                                        />
                                        {inspectionImageFile ? (
                                            <span className="text-green-600 text-xs truncate w-full">{inspectionImageFile.name}</span>
                                        ) : formData.inspection_image ? (
                                            <img src={formData.inspection_image} alt="preview" className="h-full object-contain" />
                                        ) : (
                                            <CheckCircle className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-primary">
                                {isSubmitting && <Spin size="small" className="ml-2" />}
                                {editingVehicle ? 'حفظ التعديلات' : 'إضافة المركبة'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Internal Shield Icon for display fallback
const Shield = ({ className }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

export default FleetManagement;
