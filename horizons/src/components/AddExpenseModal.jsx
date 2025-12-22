import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Modal, Form, Input, DatePicker, Select, InputNumber, Upload, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '@/lib/customSupabaseClient';
import { EXPENSE_CATEGORIES, uploadReceiptFile, formatCurrency, getCategoryOptions } from '@/utils/financialUtils';
import { Button } from '@/components/ui/button';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';

const AddExpenseModal = ({ settlement, visible, onCancel, onFinish }) => {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [amount, setAmount] = useState(0);

    const isGeneralInvoice = selectedCategory === 'general_invoice';
    const remainingAmount = settlement?.custody_amount - settlement?.total_expenses;

    const handleFinish = async (values) => {
        if (!values.receipt || values.receipt.length === 0) {
            message.error('الرجاء رفع الملف أولاً.');
            return;
        }
        if (values.receipt[0].size > 10 * 1024 * 1024) { // 10MB limit
            message.error('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت).');
            return;
        }

        setIsSubmitting(true);
        const file = values.receipt[0].originFileObj;

        try {
            message.info('جاري رفع الملف...');
            const { url, name } = await uploadReceiptFile(file, settlement.id, user.id);

            const expenseData = {
                settlement_id: settlement.id,
                user_id: user.id,
                receipt_url: url,
                receipt_file_name: name,
                status: 'pending',
                expense_date: values.expense_date.format('YYYY-MM-DD'),
                category: values.category,
                // Fields for regular expense
                amount: isGeneralInvoice ? 0 : values.amount,
                description: isGeneralInvoice ? values.notes : values.description,
                category_other: values.category === 'other' ? values.category_other : null,
            };

            const { error } = await supabase.from('settlement_expenses').insert(expenseData);
            if (error) throw error;
            
            message.success('تمت إضافة البند بنجاح.');
            form.resetFields();
            onFinish();
        } catch (err) {
            handleSupabaseError(err, 'فشل إضافة البند');
        } finally {
            setIsSubmitting(false);
        }
    };

    const normFile = (e) => {
        if (Array.isArray(e)) return e;
        return e && e.fileList;
    };
    
    const categoryOptions = getCategoryOptions().map(option => {
        const IconComponent = EXPENSE_CATEGORIES[option.value]?.icon;
        return {
            value: option.value,
            label: (
                <span className="flex items-center gap-2">
                    {IconComponent && React.createElement(IconComponent, { className: "h-4 w-4" })} {option.label}
                </span>
            ),
        };
    });

    return (
        <Modal
            title="إضافة مصروف / مرفق جديد"
            open={visible}
            onCancel={onCancel}
            destroyOnClose
            footer={[
                <Button key="back" variant="ghost" onClick={onCancel} disabled={isSubmitting}>إلغاء</Button>,
                <Button key="submit" disabled={isSubmitting} onClick={() => form.submit()}>
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4" onValuesChange={(changedValues) => {
                if (changedValues.category) setSelectedCategory(changedValues.category);
            }}>
                 {amount > remainingAmount && !isGeneralInvoice && (
                    <Alert
                        message="تحذير"
                        description={`مبلغ المصروف (${formatCurrency(amount)}) أكبر من المبلغ المتبقي بالعهدة (${formatCurrency(remainingAmount)}). سيتم تسجيل عجز عند تسوية العهدة.`}
                        type="warning"
                        showIcon
                        className="mb-4"
                    />
                )}
                <Form.Item name="receipt" label="صورة الفاتورة / الإيصال / الملف" valuePropName="fileList" getValueFromEvent={normFile} rules={[{ required: true, message: 'الرجاء رفع الملف' }]}>
                    <Upload.Dragger name="file" maxCount={1} beforeUpload={() => false} accept="image/png, image/jpeg, application/pdf" disabled={isSubmitting}>
                        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                        <p className="ant-upload-text">اسحب الملف إلى هنا أو انقر للرفع</p>
                        <p className="ant-upload-hint">يدعم PNG, JPG, PDF (بحد أقصى 10 ميجابايت)</p>
                    </Upload.Dragger>
                </Form.Item>

                <Form.Item name="category" label="التصنيف" rules={[{ required: true }]}>
                    <Select placeholder="اختر التصنيف" options={categoryOptions} disabled={isSubmitting}/>
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="expense_date" label="تاريخ المستند" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current > dayjs().endOf('day')} disabled={isSubmitting}/>
                    </Form.Item>
                    {!isGeneralInvoice && (
                        <Form.Item name="amount" label="المبلغ (ر.س)" rules={[{ required: true, type: 'number', min: 0.01, message: 'الرجاء إدخال مبلغ صحيح' }]}>
                            <InputNumber style={{ width: '100%' }} min={0.01} onChange={setAmount} addonAfter="ر.س" disabled={isSubmitting}/>
                        </Form.Item>
                    )}
                </div>
                
                {selectedCategory === 'other' && (
                    <Form.Item name="category_other" label="حدد التصنيف" rules={[{ required: true, message: 'الرجاء توضيح تصنيف المصروف' }]}>
                        <Input placeholder="مثال: رسوم حكومية، تبرعات، إلخ" disabled={isSubmitting}/>
                    </Form.Item>
                )}

                {isGeneralInvoice ? (
                     <Form.Item name="description" label="عنوان الفاتورة" rules={[{ required: true, message: 'الرجاء إدخال عنوان للفاتورة' }]}>
                        <Input placeholder="مثال: فاتورة شراء مواد بناء" disabled={isSubmitting}/>
                    </Form.Item>
                ) : (
                    <Form.Item name="description" label="البيان / الوصف">
                        <Input.TextArea rows={2} placeholder="أضف تفاصيل إضافية عن المصروف" disabled={isSubmitting}/>
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
};

export default AddExpenseModal;