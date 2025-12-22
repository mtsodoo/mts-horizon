// src/components/AddProjectExpenseModal.jsx
import React, { useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, InputNumber } from 'antd';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Upload } from 'lucide-react';
import { addProjectExpense, projectExpenseTypes, projectPaymentMethods } from '@/utils/projectFinancialUtils';
import { uploadFile } from '@/utils/fileStorage';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const AddProjectExpenseModal = ({ visible, onCancel, onSuccess, projectId }) => {
    const [form] = Form.useForm();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [invoiceFile, setInvoiceFile] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setInvoiceFile(file);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            let invoiceFileId = null;

            if (invoiceFile) {
                setUploading(true);
                const uploadedFile = await uploadFile(invoiceFile, {
                    folder: 'invoices',
                    projectId: projectId,
                });
                invoiceFileId = uploadedFile.id;
                setUploading(false);
            }

            await addProjectExpense({
                project_id: projectId,
                expense_type: values.expense_type,
                description: values.description,
                amount: values.amount,
                expense_date: values.expense_date.toISOString(),
                payment_method: values.payment_method,
                payment_status: 'pending',
                supplier_name: values.supplier_name || null,
                invoice_file_id: invoiceFileId,
                notes: values.notes || null,
                created_by: user.id,
            });

            toast({ title: 'نجاح', description: 'تم إضافة المصروف بنجاح' });
            form.resetFields();
            setInvoiceFile(null);
            if (onSuccess) onSuccess();
            onCancel();
        } catch (error) {
            console.error('Error adding expense:', error);
            toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <Modal
            title="إضافة مصروف جديد"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={700}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    expense_date: dayjs(),
                }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                        name="expense_type"
                        label="نوع المصروف"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <Select placeholder="اختر النوع">
                            {Object.entries(projectExpenseTypes).map(([key, value]) => (
                                <Option key={key} value={key}>{value}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label="المبلغ (ريال)"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <InputNumber
                            className="w-full"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        />
                    </Form.Item>
                </div>

                <Form.Item
                    name="description"
                    label="الوصف"
                    rules={[{ required: true, message: 'مطلوب' }]}
                >
                    <Input placeholder="وصف المصروف" />
                </Form.Item>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                        name="expense_date"
                        label="تاريخ المصروف"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item
                        name="payment_method"
                        label="طريقة الدفع"
                    >
                        <Select placeholder="اختر طريقة الدفع">
                            {Object.entries(projectPaymentMethods).map(([key, value]) => (
                                <Option key={key} value={key}>{value}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                <Form.Item
                    name="supplier_name"
                    label="اسم المورد (اختياري)"
                >
                    <Input placeholder="اسم المورد أو الجهة" />
                </Form.Item>

                <Form.Item label="الفاتورة (اختياري)">
                    <div className="flex items-center gap-2">
                        <input
                            id="invoice-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,application/pdf"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('invoice-upload').click()}
                            disabled={uploading}
                        >
                            <Upload className="h-4 w-4 ml-2" />
                            {uploading ? 'جاري الرفع...' : invoiceFile ? invoiceFile.name : 'رفع فاتورة'}
                        </Button>
                        {invoiceFile && (
                            <span className="text-sm text-gray-600 truncate max-w-[200px]">{invoiceFile.name}</span>
                        )}
                    </div>
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="ملاحظات (اختياري)"
                >
                    <TextArea rows={3} placeholder="ملاحظات إضافية..." />
                </Form.Item>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        إلغاء
                    </Button>
                    <Button type="submit" disabled={loading || uploading}>
                        {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'جاري الإضافة...' : uploading ? 'جاري الرفع...' : 'إضافة المصروف'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default AddProjectExpenseModal;