import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
    Stamp,
    Upload,
    Download,
    FileText,
    Settings,
    RefreshCw,
    Check,
    Trash2,
    AlertCircle,
    ZoomIn,
    PenTool
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/contexts/PermissionContext';
import { supabase } from '@/lib/customSupabaseClient';

// ═══════════════════════════════════════════════════════════════
// 🔏 أنواع الأختام المتوفرة
// ═══════════════════════════════════════════════════════════════
const STAMP_TYPES = [
    {
        id: 'official',
        name: 'الختم الرسمي',
        description: 'ختم المؤسسة بدون توقيع',
        icon: Stamp,
        fileName: 'stamp.png'
    },
    {
        id: 'signature',
        name: 'ختم + توقيع المدير',
        description: 'ختم المؤسسة مع توقيع المدير العام',
        icon: PenTool,
        fileName: 'stamp-signature.png'
    }
];

// ═══════════════════════════════════════════════════════════════
// 📐 أحجام الختم المحددة مسبقاً
// ═══════════════════════════════════════════════════════════════
const STAMP_SIZES = [
    { id: 'xs', name: 'صغير جداً', value: 80 },
    { id: 'sm', name: 'صغير', value: 120 },
    { id: 'md', name: 'متوسط', value: 160 },
    { id: 'lg', name: 'كبير', value: 200 },
    { id: 'xl', name: 'كبير جداً', value: 250 },
    { id: 'xxl', name: 'ضخم', value: 300 }
];

const DocumentStamping = () => {
    const { toast } = useToast();
    const { checkPermission } = usePermission();

    // ═══════════════════════════════════════════════════════════════
    // 📁 حالة الملفات
    // ═══════════════════════════════════════════════════════════════
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfName, setPdfName] = useState('');
    const [pdfPages, setPdfPages] = useState(0);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

    // ═══════════════════════════════════════════════════════════════
    // 🔏 حالة الختم
    // ═══════════════════════════════════════════════════════════════
    const [selectedStampType, setSelectedStampType] = useState('official');
    const [stampImageUrl, setStampImageUrl] = useState(null);
    const [stampImageData, setStampImageData] = useState(null);

    // ═══════════════════════════════════════════════════════════════
    // ⚙️ إعدادات الختم
    // ═══════════════════════════════════════════════════════════════
    const [stampPosition, setStampPosition] = useState('bottom-left');
    const [stampSizePreset, setStampSizePreset] = useState('md');
    const [customSize, setCustomSize] = useState(160);
    const [useCustomSize, setUseCustomSize] = useState(false);
    const [stampOpacity, setStampOpacity] = useState(100);
    const [stampPages, setStampPages] = useState('last');

    // ═══════════════════════════════════════════════════════════════
    // 🔄 حالة العمليات
    // ═══════════════════════════════════════════════════════════════
    const [loading, setLoading] = useState(false);
    const [loadingStamp, setLoadingStamp] = useState(false);
    const [stampedPdfUrl, setStampedPdfUrl] = useState(null);

    const pdfInputRef = useRef(null);

    // ═══════════════════════════════════════════════════════════════
    // 🔄 تحميل صورة الختم عند تغيير النوع
    // ═══════════════════════════════════════════════════════════════
    useEffect(() => {
        loadStampImage();
    }, [selectedStampType]);

    const loadStampImage = async () => {
        setLoadingStamp(true);
        try {
            const stampType = STAMP_TYPES.find(s => s.id === selectedStampType);
            if (!stampType) return;

            // جلب الصورة من Supabase Storage
            const { data } = supabase.storage
                .from('stamps')
                .getPublicUrl(stampType.fileName);

            if (data?.publicUrl) {
                setStampImageUrl(data.publicUrl);

                // تحميل الصورة كـ ArrayBuffer للاستخدام لاحقاً
                const response = await fetch(data.publicUrl);
                const arrayBuffer = await response.arrayBuffer();
                setStampImageData(arrayBuffer);
            }
        } catch (error) {
            console.error('Error loading stamp:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل في تحميل صورة الختم'
            });
        } finally {
            setLoadingStamp(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // 📄 رفع ملف PDF
    // ═══════════════════════════════════════════════════════════════
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'يرجى رفع ملف PDF فقط'
            });
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            setPdfFile(arrayBuffer);
            setPdfName(file.name);
            setPdfPages(pageCount);
            setPdfPreviewUrl(URL.createObjectURL(file));
            setStampedPdfUrl(null);

            toast({
                title: '✅ تم رفع الملف',
                description: `${file.name} - ${pageCount} صفحة`
            });
        } catch (error) {
            console.error('Error loading PDF:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ في قراءة الملف',
                description: 'تأكد من أن الملف PDF صالح'
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // 📐 الحصول على حجم الختم الفعلي
    // ═══════════════════════════════════════════════════════════════
    const getActualStampSize = () => {
        if (useCustomSize) return customSize;
        const preset = STAMP_SIZES.find(s => s.id === stampSizePreset);
        return preset ? preset.value : 160;
    };

    // ═══════════════════════════════════════════════════════════════
    // 🎯 حساب موقع الختم
    // ═══════════════════════════════════════════════════════════════
    const getStampCoordinates = (pageWidth, pageHeight, stampWidth, stampHeight) => {
        const margin = 40;

        const positions = {
            'top-right': { x: pageWidth - stampWidth - margin, y: pageHeight - stampHeight - margin },
            'top-left': { x: margin, y: pageHeight - stampHeight - margin },
            'top-center': { x: (pageWidth - stampWidth) / 2, y: pageHeight - stampHeight - margin },
            'bottom-right': { x: pageWidth - stampWidth - margin, y: margin },
            'bottom-left': { x: margin, y: margin },
            'bottom-center': { x: (pageWidth - stampWidth) / 2, y: margin },
            'center': { x: (pageWidth - stampWidth) / 2, y: (pageHeight - stampHeight) / 2 }
        };

        return positions[stampPosition] || positions['bottom-left'];
    };

    // ═══════════════════════════════════════════════════════════════
    // 🔏 تنفيذ الختم
    // ═══════════════════════════════════════════════════════════════
    const applyStamp = async () => {
        if (!pdfFile || !stampImageData) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'يرجى رفع ملف PDF والتأكد من تحميل الختم'
            });
            return;
        }

        setLoading(true);

        try {
            const pdfDoc = await PDFDocument.load(pdfFile);
            const pages = pdfDoc.getPages();

            // تحميل صورة الختم
            const stampBytes = new Uint8Array(stampImageData);
            let stampImageEmbed;

            try {
                stampImageEmbed = await pdfDoc.embedPng(stampBytes);
            } catch {
                try {
                    stampImageEmbed = await pdfDoc.embedJpg(stampBytes);
                } catch {
                    throw new Error('صيغة الصورة غير مدعومة');
                }
            }

            // حساب أبعاد الختم مع الحفاظ على النسبة
            const actualSize = getActualStampSize();
            const originalWidth = stampImageEmbed.width;
            const originalHeight = stampImageEmbed.height;
            const scale = actualSize / Math.max(originalWidth, originalHeight);
            const stampWidth = originalWidth * scale;
            const stampHeight = originalHeight * scale;

            // تحديد الصفحات للختم
            let pagesToStamp = [];
            switch (stampPages) {
                case 'first':
                    pagesToStamp = [0];
                    break;
                case 'last':
                    pagesToStamp = [pages.length - 1];
                    break;
                case 'all':
                    pagesToStamp = pages.map((_, i) => i);
                    break;
                default:
                    pagesToStamp = [pages.length - 1];
            }

            // تطبيق الختم على الصفحات المحددة
            for (const pageIndex of pagesToStamp) {
                const page = pages[pageIndex];
                const { width, height } = page.getSize();
                const coords = getStampCoordinates(width, height, stampWidth, stampHeight);

                page.drawImage(stampImageEmbed, {
                    x: coords.x,
                    y: coords.y,
                    width: stampWidth,
                    height: stampHeight,
                    opacity: stampOpacity / 100
                });
            }

            // حفظ PDF المختوم
            const stampedPdfBytes = await pdfDoc.save();
            const blob = new Blob([stampedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setStampedPdfUrl(url);

            const stampTypeName = STAMP_TYPES.find(s => s.id === selectedStampType)?.name || 'ختم';
            toast({
                title: '✅ تم ختم المستند بنجاح!',
                description: `${stampTypeName} - ${pagesToStamp.length} صفحة`
            });

        } catch (error) {
            console.error('Error stamping PDF:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ في الختم',
                description: error.message || 'حدث خطأ أثناء ختم المستند'
            });
        } finally {
            setLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // 📥 تحميل PDF المختوم
    // ═══════════════════════════════════════════════════════════════
    const downloadStampedPdf = () => {
        if (!stampedPdfUrl) return;

        const link = document.createElement('a');
        link.href = stampedPdfUrl;
        const stampSuffix = selectedStampType === 'signature' ? 'signed' : 'stamped';
        link.download = `${stampSuffix}_${pdfName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: '📥 جاري التحميل',
            description: `${stampSuffix}_${pdfName}`
        });
    };

    // ═══════════════════════════════════════════════════════════════
    // 🗑️ إعادة تعيين
    // ═══════════════════════════════════════════════════════════════
    const resetAll = () => {
        setPdfFile(null);
        setPdfName('');
        setPdfPages(0);
        setPdfPreviewUrl(null);
        setStampedPdfUrl(null);
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    };

    // ═══════════════════════════════════════════════════════════════
    // 🔒 التحقق من الصلاحية
    // ═══════════════════════════════════════════════════════════════
    if (!checkPermission('document_stamping')) {
        return (
            <div className="p-8 flex justify-center items-center h-[60vh]">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>وصول مرفوض</AlertTitle>
                    <AlertDescription>ليس لديك صلاحية للوصول إلى هذه الصفحة.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎨 خيارات المواقع
    // ═══════════════════════════════════════════════════════════════
    const positionOptions = [
        { value: 'top-right', label: 'أعلى يمين' },
        { value: 'top-center', label: 'أعلى وسط' },
        { value: 'top-left', label: 'أعلى يسار' },
        { value: 'center', label: 'الوسط' },
        { value: 'bottom-right', label: 'أسفل يمين' },
        { value: 'bottom-center', label: 'أسفل وسط' },
        { value: 'bottom-left', label: 'أسفل يسار' },
    ];

    const pageOptions = [
        { value: 'first', label: 'الأولى فقط' },
        { value: 'last', label: 'الأخيرة فقط' },
        { value: 'all', label: 'كل الصفحات' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 md:p-6 space-y-6"
        >
            <Helmet><title>ختم المستندات | MTS Supreme</title></Helmet>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageTitle title="ختم المستندات" icon={Stamp} />
                {pdfFile && (
                    <Button variant="outline" onClick={resetAll}>
                        <Trash2 className="h-4 w-4 ml-2" />
                        مستند جديد
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* 📤 قسم الرفع والإعدادات */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <div className="space-y-6">
                    {/* رفع PDF */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-red-500" />
                                رفع المستند
                            </CardTitle>
                            <CardDescription>ارفع ملف PDF الذي تريد ختمه</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 ${pdfFile ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                                onClick={() => pdfInputRef.current?.click()}
                            >
                                <input
                                    ref={pdfInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handlePdfUpload}
                                    className="hidden"
                                />
                                {pdfFile ? (
                                    <div className="space-y-2">
                                        <FileText className="h-12 w-12 mx-auto text-green-500" />
                                        <p className="font-bold text-green-700">{pdfName}</p>
                                        <Badge variant="secondary">{pdfPages} صفحة</Badge>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="h-12 w-12 mx-auto text-gray-400" />
                                        <p className="text-gray-600">اضغط لرفع ملف PDF</p>
                                        <p className="text-sm text-gray-400">أو اسحب الملف هنا</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* اختيار نوع الختم */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Stamp className="h-5 w-5 text-blue-500" />
                                نوع الختم
                            </CardTitle>
                            <CardDescription>اختر الختم المناسب للمستند</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {STAMP_TYPES.map((stamp) => {
                                    const IconComponent = stamp.icon;
                                    const isSelected = selectedStampType === stamp.id;

                                    return (
                                        <div
                                            key={stamp.id}
                                            onClick={() => setSelectedStampType(stamp.id)}
                                            className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected
                                                    ? 'border-primary bg-primary/5 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 left-2">
                                                    <Check className="h-5 w-5 text-primary" />
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center text-center space-y-3">
                                                <div className={`p-3 rounded-full ${isSelected ? 'bg-primary/10' : 'bg-gray-100'}`}>
                                                    <IconComponent className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
                                                </div>
                                                <div>
                                                    <p className={`font-bold ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                                                        {stamp.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">{stamp.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* معاينة الختم المختار */}
                            {stampImageUrl && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500 mb-2 text-center">معاينة الختم:</p>
                                    {loadingStamp ? (
                                        <div className="flex justify-center">
                                            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                                        </div>
                                    ) : (
                                        <img
                                            src={stampImageUrl}
                                            alt="الختم المختار"
                                            className="h-24 mx-auto object-contain"
                                        />
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* إعدادات الختم */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-purple-500" />
                                إعدادات الختم
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* موقع الختم */}
                            <div className="space-y-3">
                                <Label className="font-bold">موقع الختم:</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {positionOptions.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-all text-sm ${stampPosition === option.value
                                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="position"
                                                value={option.value}
                                                checked={stampPosition === option.value}
                                                onChange={(e) => setStampPosition(e.target.value)}
                                                className="sr-only"
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* حجم الختم */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="font-bold">حجم الختم:</Label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useCustomSize}
                                            onChange={(e) => setUseCustomSize(e.target.checked)}
                                            className="rounded"
                                        />
                                        تحكم يدوي
                                    </label>
                                </div>

                                {useCustomSize ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>50px</span>
                                            <span className="font-bold text-primary">{customSize}px</span>
                                            <span>400px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="400"
                                            step="10"
                                            value={customSize}
                                            onChange={(e) => setCustomSize(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {STAMP_SIZES.map((size) => (
                                            <label
                                                key={size.id}
                                                className={`flex flex-col items-center p-2 border rounded-lg cursor-pointer transition-all ${stampSizePreset === size.id
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="size"
                                                    value={size.id}
                                                    checked={stampSizePreset === size.id}
                                                    onChange={(e) => setStampSizePreset(e.target.value)}
                                                    className="sr-only"
                                                />
                                                <span className="text-sm font-medium">{size.name}</span>
                                                <span className="text-xs text-gray-400">{size.value}px</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* شفافية الختم */}
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label className="font-bold">الشفافية:</Label>
                                    <span className="text-sm text-gray-500 font-medium">{stampOpacity}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="100"
                                    step="5"
                                    value={stampOpacity}
                                    onChange={(e) => setStampOpacity(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>شفاف</span>
                                    <span>معتم</span>
                                </div>
                            </div>

                            {/* الصفحات */}
                            <div className="space-y-3">
                                <Label className="font-bold">ختم الصفحات:</Label>
                                <div className="flex flex-wrap gap-2">
                                    {pageOptions.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all ${stampPages === option.value
                                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="pages"
                                                value={option.value}
                                                checked={stampPages === option.value}
                                                onChange={(e) => setStampPages(e.target.value)}
                                                className="sr-only"
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 h-12 text-lg"
                            onClick={applyStamp}
                            disabled={!pdfFile || !stampImageData || loading || loadingStamp}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="h-5 w-5 ml-2 animate-spin" />
                                    جاري الختم...
                                </>
                            ) : (
                                <>
                                    <Stamp className="h-5 w-5 ml-2" />
                                    ختم المستند
                                </>
                            )}
                        </Button>

                        {stampedPdfUrl && (
                            <Button
                                variant="outline"
                                className="flex-1 h-12 text-lg border-green-500 text-green-600 hover:bg-green-50"
                                onClick={downloadStampedPdf}
                            >
                                <Download className="h-5 w-5 ml-2" />
                                تحميل PDF
                            </Button>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* 👁️ قسم المعاينة */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <ZoomIn className="h-5 w-5 text-green-500" />
                                معاينة المستند
                            </span>
                            {pdfPages > 0 && (
                                <Badge variant="outline">
                                    {pdfPages} صفحة
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gray-100 rounded-lg min-h-[600px] flex items-center justify-center overflow-hidden">
                            {stampedPdfUrl ? (
                                <iframe
                                    src={stampedPdfUrl}
                                    className="w-full h-[600px] rounded-lg"
                                    title="PDF المختوم"
                                />
                            ) : pdfPreviewUrl ? (
                                <iframe
                                    src={pdfPreviewUrl}
                                    className="w-full h-[600px] rounded-lg"
                                    title="معاينة PDF"
                                />
                            ) : (
                                <div className="text-center text-gray-400 p-8">
                                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                    <p>ارفع ملف PDF لمعاينته</p>
                                </div>
                            )}
                        </div>

                        {stampedPdfUrl && (
                            <Alert className="mt-4 bg-green-50 border-green-200">
                                <Check className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">تم الختم بنجاح!</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    المستند جاهز للتحميل. اضغط على زر "تحميل PDF" للحفظ.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
};

export default DocumentStamping;