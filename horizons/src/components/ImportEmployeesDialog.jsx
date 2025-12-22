import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { message, Progress } from 'antd';
import * as XLSX from 'xlsx';

const ImportEmployeesDialog = ({ open, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    // تنظيف البيانات
    const cleanValue = (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'string') return value.trim();
        return value;
    };

    // التحقق من البيانات
    const validateEmployeeData = (data) => {
        const validationErrors = [];
        
        data.forEach((row, index) => {
            const rowNum = index + 2; // +2 لأن Excel يبدأ من 1 وعندنا header
            
            // الحقول المطلوبة
            if (!row.name_ar) validationErrors.push(`السطر ${rowNum}: الاسم بالعربي مطلوب`);
            if (!row.email) validationErrors.push(`السطر ${rowNum}: البريد الإلكتروني مطلوب`);
            if (!row.password) validationErrors.push(`السطر ${rowNum}: كلمة المرور مطلوبة`);
            
            // التحقق من صيغة البريد
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                validationErrors.push(`السطر ${rowNum}: صيغة البريد الإلكتروني غير صحيحة`);
            }
            
            // التحقق من طول كلمة المرور
            if (row.password && row.password.length < 8) {
                validationErrors.push(`السطر ${rowNum}: كلمة المرور يجب أن تكون 8 أحرف على الأقل`);
            }
            
            // التحقق من الدور
            const validRoles = ['super_admin', 'general_manager', 'admin', 'department_head', 'project_manager', 'finance', 'employee'];
            if (row.role && !validRoles.includes(row.role)) {
                validationErrors.push(`السطر ${rowNum}: الدور "${row.role}" غير صحيح`);
            }
        });
        
        // التحقق من تكرار البريد
        const emails = data.map(r => r.email).filter(Boolean);
        const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
        if (duplicates.length > 0) {
            validationErrors.push(`بريد إلكتروني مكرر: ${duplicates.join(', ')}`);
        }
        
        return validationErrors;
    };

    // قراءة ملف Excel
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // تنظيف البيانات
                const cleanedData = jsonData.map(row => ({
                    // المعلومات الشخصية
                    name_ar: cleanValue(row.name_ar),
                    name_en: cleanValue(row.name_en),
                    email: cleanValue(row.email),
                    password: cleanValue(row.password),
                    phone_number: cleanValue(row.phone_number),
                    national_id: cleanValue(row.national_id),
                    birth_date: cleanValue(row.birth_date),
                    nationality: cleanValue(row.nationality),
                    gender: cleanValue(row.gender),
                    marital_status: cleanValue(row.marital_status),
                    address: cleanValue(row.address),
                    city: cleanValue(row.city),
                    national_address_short: cleanValue(row.national_address_short),
                    
                    // المعلومات الوظيفية
                    job_title: cleanValue(row.job_title),
                    department: cleanValue(row.department),
                    role: cleanValue(row.role) || 'employee',
                    hire_date: cleanValue(row.hire_date),
                    contract_type: cleanValue(row.contract_type),
                    contract_start: cleanValue(row.contract_start),
                    contract_end: cleanValue(row.contract_end),
                    probation_end: cleanValue(row.probation_end),
                    is_active: row.is_active === 'نعم' || row.is_active === 'yes' || row.is_active === true || row.is_active === 1,
                    
                    // المعلومات المالية
                    base_salary: cleanValue(row.base_salary) || 0,
                    housing_allowance: cleanValue(row.housing_allowance) || 0,
                    transportation_allowance: cleanValue(row.transportation_allowance) || 0,
                    other_allowances: cleanValue(row.other_allowances) || 0,
                    bank_name: cleanValue(row.bank_name),
                    iban: cleanValue(row.iban),
                    annual_leave_balance: cleanValue(row.annual_leave_balance) || 0,
                    sick_leave_balance: cleanValue(row.sick_leave_balance) || 0,
                    
                    // الهويات والوثائق
                    social_insurance_number: cleanValue(row.social_insurance_number),
                    medical_insurance_number: cleanValue(row.medical_insurance_number),
                    medical_insurance_category: cleanValue(row.medical_insurance_category),
                    iqama_number: cleanValue(row.iqama_number),
                    iqama_expiry: cleanValue(row.iqama_expiry),
                    passport_number: cleanValue(row.passport_number),
                    passport_expiry: cleanValue(row.passport_expiry),
                    
                    // الاتصال في الطوارئ
                    emergency_contact_name: cleanValue(row.emergency_contact_name),
                    emergency_contact_phone: cleanValue(row.emergency_contact_phone),
                    notes: cleanValue(row.notes),
                }));

                // التحقق من البيانات
                const validationErrors = validateEmployeeData(cleanedData);
                setErrors(validationErrors);
                setPreviewData(cleanedData);

            } catch (error) {
                message.error('فشل في قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.');
                console.error(error);
            }
        };

        reader.readAsBinaryString(selectedFile);
    };

    // تحميل ملف النموذج
    const downloadTemplate = () => {
        const template = [
            {
                // المعلومات الشخصية
                name_ar: 'أحمد محمد',
                name_en: 'Ahmed Mohammed',
                email: 'ahmed@example.com',
                password: 'password123',
                phone_number: '0501234567',
                national_id: '1234567890',
                birth_date: '1990-01-01',
                nationality: 'سعودي',
                gender: 'male',
                marital_status: 'single',
                address: 'شارع الملك فهد، حي النخيل',
                city: 'الرياض',
                national_address_short: 'AAAA1234',
                
                // المعلومات الوظيفية
                job_title: 'مطور برمجيات',
                department: 'تقنية المعلومات',
                role: 'employee',
                hire_date: '2024-01-01',
                contract_type: 'full_time',
                contract_start: '2024-01-01',
                contract_end: '2025-12-31',
                probation_end: '2024-04-01',
                is_active: 'نعم',
                
                // المعلومات المالية
                base_salary: 8000,
                housing_allowance: 2000,
                transportation_allowance: 500,
                other_allowances: 300,
                bank_name: 'البنك الأهلي',
                iban: 'SA0380000000608010167519',
                annual_leave_balance: 21,
                sick_leave_balance: 30,
                
                // الهويات والوثائق
                social_insurance_number: '123456789',
                medical_insurance_number: 'MED123456',
                medical_insurance_category: 'A',
                iqama_number: '',
                iqama_expiry: '',
                passport_number: 'P1234567',
                passport_expiry: '2030-12-31',
                
                // الاتصال في الطوارئ
                emergency_contact_name: 'محمد أحمد',
                emergency_contact_phone: '0509876543',
                notes: 'موظف مميز',
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');
        XLSX.writeFile(wb, 'نموذج_استيراد_الموظفين.xlsx');
    };

    // استيراد الموظفين
    const handleImport = async () => {
        if (errors.length > 0) {
            message.error('يرجى تصحيح الأخطاء قبل الاستيراد');
            return;
        }

        if (previewData.length === 0) {
            message.error('لا توجد بيانات للاستيراد');
            return;
        }

        setImporting(true);
        setImportProgress(0);

        try {
            const total = previewData.length;
            let success = 0;
            let failed = 0;

            for (let i = 0; i < previewData.length; i++) {
                const employee = previewData[i];
                try {
                    await onImport(employee);
                    success++;
                } catch (error) {
                    console.error(`فشل استيراد الموظف ${employee.name_ar}:`, error);
                    failed++;
                }
                setImportProgress(Math.round(((i + 1) / total) * 100));
            }

            if (failed === 0) {
                message.success(`تم استيراد ${success} موظف بنجاح`);
            } else {
                message.warning(`تم استيراد ${success} موظف، فشل ${failed} موظف`);
            }

            onClose();
        } catch (error) {
            message.error('فشل في استيراد الموظفين');
            console.error(error);
        } finally {
            setImporting(false);
            setImportProgress(0);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData([]);
        setErrors([]);
        setImportProgress(0);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>استيراد موظفين من Excel</DialogTitle>
                    <DialogDescription>
                        قم بتحميل ملف Excel يحتوي على بيانات الموظفين. يجب أن يحتوي الملف على جميع الحقول المطلوبة.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* زر تحميل النموذج */}
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                        <div>
                            <p className="font-semibold">لا تملك ملف Excel؟</p>
                            <p className="text-sm text-muted-foreground">قم بتحميل ملف النموذج وملء البيانات</p>
                        </div>
                        <Button onClick={downloadTemplate} variant="outline">
                            <Download className="ml-2 h-4 w-4" />
                            تحميل ملف النموذج
                        </Button>
                    </div>

                    {/* رفع الملف */}
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="excel-upload"
                        />
                        <label htmlFor="excel-upload" className="cursor-pointer">
                            <Button variant="outline" onClick={() => document.getElementById('excel-upload').click()}>
                                اختر ملف Excel
                            </Button>
                        </label>
                        {file && <p className="mt-2 text-sm text-gray-600">الملف المحدد: {file.name}</p>}
                    </div>

                    {/* الأخطاء */}
                    {errors.length > 0 && (
                        <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold mb-2">تم العثور على {errors.length} خطأ:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {errors.slice(0, 5).map((error, index) => (
                                            <li key={index} className="text-sm">{error}</li>
                                        ))}
                                        {errors.length > 5 && <li className="text-sm">... و {errors.length - 5} أخطاء أخرى</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* المعاينة */}
                    {previewData.length > 0 && errors.length === 0 && (
                        <div className="p-4 bg-green-100/80 border-l-4 border-green-500 text-green-800 rounded-md">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5" />
                                <p>تم التحقق من البيانات بنجاح. جاهز لاستيراد {previewData.length} موظف.</p>
                            </div>
                        </div>
                    )}

                    {previewData.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الاسم</TableHead>
                                            <TableHead>البريد</TableHead>
                                            <TableHead>الجوال</TableHead>
                                            <TableHead>الوظيفة</TableHead>
                                            <TableHead>القسم</TableHead>
                                            <TableHead>الراتب</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.slice(0, 10).map((emp, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{emp.name_ar}</TableCell>
                                                <TableCell>{emp.email}</TableCell>
                                                <TableCell>{emp.phone_number}</TableCell>
                                                <TableCell>{emp.job_title}</TableCell>
                                                <TableCell>{emp.department}</TableCell>
                                                <TableCell>{emp.base_salary}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {previewData.length > 10 && (
                                    <p className="text-center text-sm text-muted-foreground p-2">
                                        ... و {previewData.length - 10} موظف آخر
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* شريط التقدم */}
                    {importing && (
                        <div className="space-y-2">
                            <Progress percent={importProgress} status="active" />
                            <p className="text-sm text-center text-muted-foreground">
                                جاري الاستيراد... {importProgress}%
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={importing}>
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={previewData.length === 0 || errors.length > 0 || importing}
                    >
                        {importing ? 'جاري الاستيراد...' : `استيراد ${previewData.length} موظف`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportEmployeesDialog;