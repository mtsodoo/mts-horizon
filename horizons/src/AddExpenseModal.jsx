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
    const [isOtherCategory, setIsOtherCategory] = useState(false);
    const [amount, setAmount] = useState(0);

    const remainingAmount = settlement?.custody_amount - settlement?.total_expenses;
    const remainingAfterExpense = remainingAmount - amount;

    const handleFinish = async (values) => {
        if (!values.receipt || values.receipt.length === 0) {
            message.error('الرجاء رفع إيصال المصروف أولاً.');
            return;
        }
        if (values.receipt[0].size > 10 * 1024 * 1024) { // 10MB limit
            message.error('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت).');
            return;
        }
        
        let proceed = true;
        if (amount > remainingAmount) {
             proceed = window.confirm(`⚠️ تحذير: المبلغ المدخل (${formatCurrency(amount)}) أكبر من المتبقي (${formatCurrency(remainingAmount)}). سيتم تسجيل عجز قدره ${formatCurrency(Math.abs(remainingAfterExpense))}. هل تريد المتابعة؟`);
        }

        if (!proceed) return;

        setIsSubmitting(true);
        const receiptFile = values.receipt[0].originFileObj;

        try {
            message.info('جاري رفع إيصال المصروف...');
            const { url, name } = await uploadReceiptFile(receiptFile, settlement.id, user.id);

            const expenseData = {
                settlement_id: settlement.id,
                user_id: user.id,
                expense_date: values.expense_date.format('YYYY-MM-DD'),
                amount: values.amount,
                category: values.category,
                category_other: values.category === 'other' ? values.category_other : null,
                description: values.description,
                receipt_url: url,
                receipt_file_name: name,
                status: 'pending', // All new expenses are pending review by manager
            };

            const { error } = await supabase.from('settlement_expenses').insert(expenseData);
            if (error) throw error;
            
            message.success('تمت إضافة المصروف بنجاح.');
            form.resetFields();
            onFinish();
        } catch (err) {
            handleSupabaseError(err, 'فشل إضافة المصروف');
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
            title="إضافة مصروف جديد"
            open={visible}
            onCancel={onCancel}
            destroyOnClose
            footer={[
                <Button key="back" variant="ghost" onClick={onCancel} disabled={isSubmitting}>إلغاء</Button>,
                <Button key="submit" disabled={isSubmitting} onClick={() => form.submit()}>
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
                {amount > 0 && <Alert message={`المتبقي بعد هذا المصروف: ${formatCurrency(remainingAfterExpense)}`} type={remainingAfterExpense < 0 ? 'warning' : 'info'} showIcon className="mb-4" />}

                <Form.Item name="receipt" label="صورة الفاتورة / الإيصال" valuePropName="fileList" getValueFromEvent={normFile} rules={[{ required: true, message: 'الرجاء رفع صورة الإيصال' }]}>
                    <Upload.Dragger name="file" maxCount={1} beforeUpload={() => false} accept="image/png, image/jpeg, application/pdf" disabled={isSubmitting}>
                        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                        <p className="ant-upload-text">اسحب الملف إلى هنا أو انقر للرفع</p>
                        <p className="ant-upload-hint">يدعم PNG, JPG, PDF (بحد أقصى 10 ميجابايت)</p>
                    </Upload.Dragger>
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="expense_date" label="تاريخ الفاتورة" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current > dayjs().endOf('day')} disabled={isSubmitting}/>
                    </Form.Item>
                    <Form.Item name="amount" label="المبلغ (ر.س)" rules={[{ required: true, type: 'number', min: 0.01, message: 'الرجاء إدخال مبلغ صحيح' }]}>
                        <InputNumber style={{ width: '100%' }} min={0.01} onChange={setAmount} addonAfter="ر.س" disabled={isSubmitting}/>
                    </Form.Item>
                </div>
                <Form.Item name="category" label="التصنيف" rules={[{ required: true }]}>
                    <Select placeholder="اختر التصنيف" onChange={(value) => setIsOtherCategory(value === 'other')} options={categoryOptions} disabled={isSubmitting}/>
                </Form.Item>
                {isOtherCategory && (
                    <Form.Item name="category_other" label="حدد التصنيف" rules={[{ required: true, message: 'الرجاء توضيح تصنيف المصروف' }]}>
                        <Input placeholder="مثال: رسوم حكومية، تبرعات، إلخ" disabled={isSubmitting}/>
                    </Form.Item>
                )}
                <Form.Item name="description" label="البيان / الوصف">
                    <Input.TextArea rows={3} placeholder="أضف تفاصيل إضافية عن المصروف" disabled={isSubmitting}/>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddExpenseModal;