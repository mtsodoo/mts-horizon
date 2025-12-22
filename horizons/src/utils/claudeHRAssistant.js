import { supabase } from '@/lib/customSupabaseClient';
import { saveConversationMessage, updateAlertStatus } from '@/utils/alertOperations';

// إعدادات الاتصال
const SUPABASE_URL = 'https://ycbplbsrzsuefeqlhxsx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYnBsYnNyenN1ZWZlcWxoeHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDc1NTgsImV4cCI6MjA3ODEyMzU1OH0.fLck_Col_tl8muRxT3DBLIUyDa9ZFRphGXWt-bdEaqc';

/**
 * 🚀 بدء محادثة جديدة مع عمر
 */
export const startConversation = async (alert) => {
    try {
        console.log('🚀 بدء محادثة جديدة:', alert);

        // جلب معلومات الموظف
        const { data: employee, error: empError } = await supabase
            .from('profiles')
            .select('id, name_ar, employee_number, department')
            .eq('id', alert.employee_id)
            .single();

        if (empError) throw empError;

        // جلب تفاصيل التأخير/الغياب
        const { data: attendanceRecord } = await supabase
            .from('attendance_records')
            .select('late_minutes, check_in, status')
            .eq('user_id', alert.employee_id)
            .eq('work_date', alert.reference_date)
            .single();

        // تحديد نوع المخالفة والتفاصيل
        const violationType = alert.alert_type === 'late' ? 'تأخير' : 
                             alert.alert_type === 'absence' ? 'غياب' : 
                             alert.alert_type;
        
        const lateMinutes = attendanceRecord?.late_minutes || 0;
        const referenceDate = new Date(alert.reference_date).toLocaleDateString('ar-SA');

        // بناء الرسالة الأولى لعمر
        let initialPrompt = '';
        if (alert.alert_type === 'late') {
            initialPrompt = `موظف متأخر ويحتاج توضيح. اسأله عن سبب التأخير.
الاسم: ${employee.name_ar}
التاريخ: ${referenceDate}
دقائق التأخير: ${lateMinutes}`;
        } else if (alert.alert_type === 'absence') {
            initialPrompt = `موظف غائب ويحتاج توضيح. اسأله عن سبب الغياب.
الاسم: ${employee.name_ar}
التاريخ: ${referenceDate}`;
        } else {
            initialPrompt = `موظف عنده مخالفة من نوع ${violationType}. اسأله عن السبب.
الاسم: ${employee.name_ar}
التاريخ: ${referenceDate}`;
        }

        // الرسالة الأولى ثابتة (بدون Claude) لتجنب مشكلة التحية
        const firstName = employee.name_ar.split(' ')[0];
        let omarReply = '';
        
        if (alert.alert_type === 'late') {
            omarReply = `يا ${firstName}، وش سبب تأخيرك يوم ${referenceDate}؟ متأخر ${lateMinutes} دقيقة.`;
        } else if (alert.alert_type === 'absence') {
            omarReply = `يا ${firstName}، وش سبب غيابك يوم ${referenceDate}؟`;
        } else {
            omarReply = `يا ${firstName}، عندك مخالفة ${violationType} يوم ${referenceDate}. وش السبب؟`;
        }

        // حفظ الرسالة في قاعدة البيانات
        await saveConversationMessage(alert.id, 'system', omarReply, 1);

        // إرجاع حالة المحادثة
        return {
            alertId: alert.id,
            employeeId: alert.employee_id,
            employeeName: employee.name_ar,
            conversationHistory: [
                { role: 'assistant', content: omarReply }
            ],
            questionNumber: 1,
            completed: false
        };

    } catch (error) {
        console.error('❌ خطأ في بدء المحادثة:', error);
        throw error;
    }
};

/**
 * 📤 إرسال رد الموظف والحصول على رد عمر
 */
export const submitAnswer = async (conversationState, answer, attachmentUrl = null) => {
    try {
        console.log('📤 إرسال رد الموظف:', { answer, questionNumber: conversationState.questionNumber });

        // حفظ رد الموظف
        await saveConversationMessage(
            conversationState.alertId, 
            'employee', 
            answer, 
            conversationState.questionNumber,
            attachmentUrl
        );

        // بناء سجل المحادثة للإرسال
        // نضيف سياق الموظف في البداية
        const contextMessage = `الموظف ${conversationState.employeeName} رد على سؤالك. قيّم رده وتابع المحادثة حسب القواعد.`;
        
        const messages = [
            { role: 'user', content: contextMessage },
            ...conversationState.conversationHistory,
            { role: 'user', content: answer }
        ];

        // إرسال لـ Claude
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                context: 'omar_hr_response',
                employee_id: conversationState.employeeId,
                alert_id: conversationState.alertId,
                thread_id: `alert_${conversationState.alertId}`,
                messages: messages
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || response.statusText);
        }

        const data = await response.json();

        // استخراج رد عمر
        let omarReply = 'تم استلام ردك.';
        if (data.content && data.content[0]?.text) {
            omarReply = data.content[0].text;
        }

        // حفظ رد عمر
        const newQuestionNumber = conversationState.questionNumber + 1;
        await saveConversationMessage(conversationState.alertId, 'system', omarReply, newQuestionNumber);

        // التحقق إذا المحادثة انتهت (عمر اتخذ قرار)
        const isCompleted = checkIfConversationCompleted(omarReply, newQuestionNumber);

        if (isCompleted) {
            // تحديث حالة التنبيه
            await updateAlertStatus(conversationState.alertId, 'responded');
        }

        // تحديث سجل المحادثة
        const updatedHistory = [
            ...messages,
            { role: 'assistant', content: omarReply }
        ];

        return {
            alertId: conversationState.alertId,
            employeeId: conversationState.employeeId,
            employeeName: conversationState.employeeName,
            conversationHistory: updatedHistory,
            questionNumber: newQuestionNumber,
            message: omarReply,
            completed: isCompleted
        };

    } catch (error) {
        console.error('❌ خطأ في إرسال الرد:', error);
        throw error;
    }
};

/**
 * 🔍 التحقق إذا المحادثة انتهت
 */
const checkIfConversationCompleted = (reply, questionNumber) => {
    const completionIndicators = [
        'الخصم نازل',
        'تم الخصم',
        'تم خصم',
        'العذر مقبول',
        'تم قبول',
        'مقبول عذرك',
        'تم التعامل',
        'تم إغلاق',
        'الملف مغلق'
    ];

    // إذا وصلنا للرد الرابع أو أكثر، نعتبرها منتهية
    if (questionNumber >= 4) {
        return true;
    }

    // التحقق من مؤشرات الإنهاء
    const replyLower = reply.toLowerCase();
    return completionIndicators.some(indicator => replyLower.includes(indicator));
};

/**
 * 🧠 Omar HR Decision Engine (Legacy - للتوافق)
 */
export const getOmarDecision = async (employeeName, violationType, justification) => {
    try {
        console.log("🤖 Omar (AI) is thinking...", { employeeName, justification });

        const scenarioPrompt = `
            الموظف: ${employeeName}
            المخالفة: ${violationType}
            التبرير: "${justification}"
            
            المطلوب: رد بصفتك "عمر" مدير الموارد البشرية الحازم.
        `;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                context: 'omar_hr_response',
                messages: [
                    { role: 'user', content: scenarioPrompt }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || response.statusText);
        }

        const data = await response.json();
        
        let aiReply = '';
        if (data.content && data.content[0]?.text) {
            aiReply = data.content[0].text;
        } else {
            aiReply = "وصلني الرد، جاري المراجعة.";
        }

        return aiReply;

    } catch (error) {
        console.error("❌ Omar AI Failed:", error);
        return `تم استلام الرد يا ${employeeName.split(' ')[0]} وجاري مراجعته.`;
    }
};