
const OURSMS_TOKEN = 'n68E8CISvil58edsg-RE';
const ULTRAMSG_INSTANCE = 'instance157134';
const ULTRAMSG_TOKEN = '8cmlm9zr0ildffsu';

// تنسيق رقم الجوال
const formatPhone = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '966' + cleaned.slice(1);
  if (!cleaned.startsWith('966')) cleaned = '966' + cleaned;
  return cleaned;
};

// إرسال SMS
export const sendSMS = async (phone, message) => {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) return false;
  
  try {
    await fetch('https://api.oursms.com/api-a/msgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: OURSMS_TOKEN,
        src: 'MTS',
        dests: formattedPhone,
        body: message
      })
    });
    return true;
  } catch (error) {
    console.error('SMS Error:', error);
    return false;
  }
};

// إرسال WhatsApp
export const sendWhatsApp = async (phone, message) => {
  const formattedPhone = phone.replace(/\D/g, '');
  const finalPhone = formattedPhone.startsWith('966') ? formattedPhone : '966' + formattedPhone.replace(/^0/, '');
  
  try {
    const response = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: ULTRAMSG_TOKEN,
        to: finalPhone,
        body: message
      })
    });
    return true;
  } catch (error) {
    console.error('WhatsApp Error:', error);
    return false;
  }
};

// إرسال SMS + WhatsApp معاً
export const sendBoth = async (phone, smsMessage, whatsappMessage) => {
  await Promise.all([
    sendSMS(phone, smsMessage),
    sendWhatsApp(phone, whatsappMessage || smsMessage)
  ]);
};

// ========== إشعارات الحضور ==========

// إشعار التأخير
export const notifyLateAttendance = async (phone, employeeName, lateMinutes, date) => {
  const whatsapp = `⚠️ تنبيه تأخير

مرحباً ${employeeName}

تم تسجيل تأخيرك اليوم:
━━━━━━━━━━━━━━
📅 التاريخ: ${date}
⏰ مدة التأخير: ${lateMinutes} دقيقة
━━━━━━━━━━━━━━

يرجى الالتزام بمواعيد العمل

MTS - الحلول الفنية المتعددة`;

  await sendWhatsApp(phone, whatsapp);
};

// إشعار الغياب
export const notifyAbsence = async (phone, employeeName, date) => {
  const whatsapp = `🔴 تنبيه غياب

مرحباً ${employeeName}

لم يتم تسجيل حضورك اليوم:
━━━━━━━━━━━━━━
📅 التاريخ: ${date}
━━━━━━━━━━━━━━

إذا كان لديك عذر، يرجى تقديم تبرير عبر النظام أو التواصل مع الإدارة.

MTS - الحلول الفنية المتعددة`;

  await sendWhatsApp(phone, whatsapp);
};

// ========== إشعارات الطلبات ==========

// إشعار موافقة على طلب
export const notifyRequestApproved = async (phone, employeeName, requestType, requestNumber, details) => {
  const types = {
    leave: 'إجازة',
    loan: 'سلفة',
    custody: 'عهدة',
    permission: 'استئذان'
  };
  
  const whatsapp = `✅ تمت الموافقة

مرحباً ${employeeName}

تمت الموافقة على طلبك:
━━━━━━━━━━━━━━
🔢 رقم الطلب: ${requestNumber}
📋 نوع الطلب: ${types[requestType] || requestType}
${details}
━━━━━━━━━━━━━━

MTS - الحلول الفنية المتعددة`;

  await sendWhatsApp(phone, whatsapp);
};

// إشعار رفض طلب
export const notifyRequestRejected = async (phone, employeeName, requestType, requestNumber, reason) => {
  const types = {
    leave: 'إجازة',
    loan: 'سلفة',
    custody: 'عهدة',
    permission: 'استئذان'
  };
  
  const whatsapp = `❌ تم رفض الطلب

مرحباً ${employeeName}

تم رفض طلبك:
━━━━━━━━━━━━━━
🔢 رقم الطلب: ${requestNumber}
📋 نوع الطلب: ${types[requestType] || requestType}
📝 السبب: ${reason}
━━━━━━━━━━━━━━

يمكنك تقديم طلب جديد أو التواصل مع الإدارة.

MTS - الحلول الفنية المتعددة`;

  await sendWhatsApp(phone, whatsapp);
};

// ========== إشعارات المدير ==========

// إشعار طلب جديد للمدير
export const notifyManagerNewRequest = async (managerPhone, employeeName, requestType, requestNumber, details) => {
  const types = {
    leave: 'إجازة',
    loan: 'سلفة',
    custody: 'عهدة',
    permission: 'استئذان'
  };
  
  const message = `📩 طلب جديد

طلب ${types[requestType] || requestType} جديد
━━━━━━━━━━━━━━
🔢 رقم الطلب: ${requestNumber || 'جديد'}
👤 الموظف: ${employeeName}
📋 النوع: ${types[requestType] || requestType}
${details}
━━━━━━━━━━━━━━

يرجى مراجعة الطلب في النظام.

MTS - الحلول الفنية المتعددة`;

  return await sendWhatsApp(managerPhone, message);
};

// تقرير الحضور اليومي للمدير
export const notifyManagerDailyReport = async (managerPhone, date, present, absent, late) => {
  const whatsapp = `📊 تقرير الحضور اليومي

📅 التاريخ: ${date}
━━━━━━━━━━━━━━
✅ حاضرون: ${present}
🔴 غائبون: ${absent}
⚠️ متأخرون: ${late}
━━━━━━━━━━━━━━

MTS - الحلول الفنية المتعددة`;

  await sendWhatsApp(managerPhone, whatsapp);
};

export default {
  sendSMS,
  sendWhatsApp,
  sendBoth,
  notifyLateAttendance,
  notifyAbsence,
  notifyRequestApproved,
  notifyRequestRejected,
  notifyManagerNewRequest,
  notifyManagerDailyReport
};
