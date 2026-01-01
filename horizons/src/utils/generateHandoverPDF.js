import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';

// MTS Logo Base64
const MTS_LOGO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAAAAAAD/7AARRHVja3kAAQAEAAAAPAAA/+EAGEV4aWYAAElJKgAIAAAAAAAAAAAAAAD/4QMvaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA5LjEtYzAwMyA3OS45NjkwYTg3ZmMsIDIwMjUvMDMvMDYtMjA6NTA6MTYgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNy4xIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoxNDgzMkIxQ0UzRjYxMUYwQjlCOTg1QkQyQTQ0NkNFMCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoxNDgzMkIxREUzRjYxMUYwQjlCOTg1QkQyQTQ0NkNFMCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjE0ODMyQjFBRTNGNjExRjBCOUI5ODVCRDJBNDQ2Q0UwIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjE0ODMyQjFCRTNGNjExRjBCOUI5ODVCRDJBNDQ2Q0UwIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+/9sAQwAGBAUGBQQGBgUGBwcG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';

// MTS Colors
const MTS_RED = '#a31d22';
const MTS_BLACK = '#1a1a1a';

export const generateHandoverPDF = async (certificate, items = [], services = []) => {
  const element = document.createElement('div');
  element.dir = 'rtl';
  
  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Cairo', sans-serif; }
      table { width: 100%; border-collapse: collapse; }
      td, th { word-wrap: break-word; vertical-align: middle; }
    </style>
  `;

  const getItemStatus = (status) => {
    if (status === 'delivered' || status === 'تم ✓') return 'تم ✓';
    if (status === 'pending') return 'معلق';
    return 'تم ✓';
  };

  const getServiceStatus = (status) => {
    if (status === 'completed' || status === 'تم ✓') return 'تم ✓';
    if (status === 'pending') return 'قيد التنفيذ';
    return 'تم ✓';
  };

  // ✅ بيانات المُسلِّم (MTS)
  const delivererName = certificate.deliverer_name || 'حسين الجندان';
  const delivererTitle = certificate.deliverer_title || 'المدير العام';

  // ✅ بيانات المُستلِم (تلقائي من البيانات)
  const receiverName = certificate.receiver_name || '';
  const receiverTitle = certificate.receiver_title || '';

  element.innerHTML = `
    ${styles}
    <div style="font-family: 'Cairo', sans-serif; padding: 12px 15px; color: ${MTS_BLACK}; direction: rtl; line-height: 1.4; font-size: 10px; width: 750px; margin: 0 auto;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${MTS_RED}; padding-bottom: 10px; margin-bottom: 12px;">
        <div style="width: 25%;">
          <img src="${MTS_LOGO}" alt="MTS Logo" style="width: 70px; height: 70px; object-fit: contain;" />
        </div>
        <div style="text-align: center; width: 50%;">
           <h1 style="margin: 0; font-size: 14px; font-weight: 800; color: ${MTS_BLACK};">مؤسسة الحلول الفنية المتعددة للخدمات التجارية</h1>
           <p style="margin: 2px 0 0; font-size: 9px; color: #6b7280;">Multiple Technical Solutions Trading Est.</p>
           <p style="margin: 2px 0 8px; font-size: 9px; color: #6b7280;">س.ت: 1010496123</p>
           <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: ${MTS_RED};">محضر تسليم أعمال</h2>
           <p style="margin: 2px 0 0; font-size: 10px; color: #6b7280;">Handover Certificate</p>
        </div>
        <div style="width: 25%;">
          <div style="background-color: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: 600; font-size: 9px; color: #64748b;">رقم المحضر / Ref No.</p>
            <p style="margin: 2px 0 0; font-weight: 800; font-size: 11px; font-family: monospace; direction: ltr; text-align: left; color: ${MTS_RED};">${certificate.certificate_number || '---'}</p>
            <div style="margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <p style="margin: 0; font-weight: 600; font-size: 9px; color: #64748b;">التاريخ / Date</p>
              <p style="margin: 1px 0 0; font-size: 10px; color: ${MTS_BLACK};">${format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <h3 style="font-size: 11px; font-weight: 700; border-right: 3px solid ${MTS_RED}; padding-right: 6px; margin-bottom: 6px; color: ${MTS_BLACK};">بيانات الفعالية</h3>
        <table style="border: 1px solid #e2e8f0; font-size: 9px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 700; width: 15%; color: #475569;">اسم الفعالية</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; width: 35%;">${certificate.event_name || '-'}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 700; width: 15%; color: #475569;">تاريخ الفعالية</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; width: 35%; font-family: sans-serif;">${certificate.event_date ? format(new Date(certificate.event_date), 'dd/MM/yyyy') : '-'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 700; color: #475569;">الموقع</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${certificate.delivery_location || certificate.venue || '-'}</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 700; color: #475569;">الفواتير المرتبطة</td>
            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: sans-serif;">${certificate.related_invoices || '-'}</td>
          </tr>
        </table>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${MTS_RED}; padding: 4px 8px;">
            <h3 style="margin: 0; font-size: 10px; font-weight: 700; color: white;">الطرف الأول (المُسلِّم)</h3>
          </div>
          <div style="padding: 8px; font-size: 9px; line-height: 1.6;">
            <p style="margin: 0;"><strong>الشركة:</strong> مؤسسة الحلول الفنية المتعددة</p>
            <p style="margin: 0;"><strong>الممثل:</strong> ${delivererName}</p>
            <p style="margin: 0;"><strong>الصفة:</strong> ${delivererTitle}</p>
          </div>
        </div>
        <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${MTS_BLACK}; padding: 4px 8px;">
            <h3 style="margin: 0; font-size: 10px; font-weight: 700; color: white;">الطرف الثاني (المُستلِم)</h3>
          </div>
          <div style="padding: 8px; font-size: 9px; line-height: 1.6;">
            <p style="margin: 0;"><strong>الجهة:</strong> ${certificate.recipient_name || '-'}</p>
            <p style="margin: 0;"><strong>العنوان:</strong> ${certificate.recipient_address || '-'}</p>
            <p style="margin: 0;"><strong>الموقع:</strong> ${certificate.delivery_location || '-'}</p>
            <p style="margin: 0;"><strong>المستلم:</strong> ${receiverName || '-'}</p>
          </div>
        </div>
      </div>

      ${items.length > 0 ? `
        <div style="margin-bottom: 10px;">
          <h3 style="font-size: 11px; font-weight: 700; border-right: 3px solid ${MTS_RED}; padding-right: 6px; margin-bottom: 6px; color: ${MTS_BLACK};">قائمة البنود والمواد</h3>
          <table style="border: 1px solid #e2e8f0; font-size: 9px;">
            <thead>
              <tr style="background-color: ${MTS_RED}; color: white;">
                <th style="padding: 5px; border: 1px solid ${MTS_RED}; text-align: center; width: 30px;">م</th>
                <th style="padding: 5px; border: 1px solid ${MTS_RED}; text-align: right;">وصف البند</th>
                <th style="padding: 5px; border: 1px solid ${MTS_RED}; text-align: center; width: 55px;">الكمية</th>
                <th style="padding: 5px; border: 1px solid ${MTS_RED}; text-align: center; width: 50px;">الوحدة</th>
                <th style="padding: 5px; border: 1px solid ${MTS_RED}; text-align: center; width: 50px;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${index + 1}</td>
                  <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">${item.item_description}</td>
                  <td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-family: sans-serif;">${Number(item.quantity).toLocaleString()}</td>
                  <td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center;">${item.unit || '-'}</td>
                  <td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #059669;">${getItemStatus(item.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${services.length > 0 ? `
        <div style="margin-bottom: 10px;">
          <h3 style="font-size: 11px; font-weight: 700; border-right: 3px solid ${MTS_BLACK}; padding-right: 6px; margin-bottom: 6px; color: ${MTS_BLACK};">الخدمات المنفذة</h3>
          <table style="border: 1px solid #e2e8f0; font-size: 9px;">
            <thead>
              <tr style="background-color: ${MTS_BLACK}; color: white;">
                <th style="padding: 5px; border: 1px solid ${MTS_BLACK}; text-align: center; width: 30px;">م</th>
                <th style="padding: 5px; border: 1px solid ${MTS_BLACK}; text-align: right;">وصف الخدمة</th>
                <th style="padding: 5px; border: 1px solid ${MTS_BLACK}; text-align: center; width: 60px;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${services.map((service, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${index + 1}</td>
                  <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">${service.service_description}</td>
                  <td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #059669;">${getServiceStatus(service.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div style="font-size: 8px; line-height: 1.5; text-align: justify; color: #64748b; padding: 8px; background-color: #f8fafc; border-radius: 4px; margin-bottom: 10px; border-right: 3px solid ${MTS_RED};">
        <p style="margin: 0;">يقر الطرف الثاني (المستلم) بأنه قد استلم الأعمال / المواد الموضحة أعلاه وهي بحالة جيدة ومطابقة للمواصفات المتفق عليها، وأنه قد عاينها المعاينة النافية للجهالة. وبمجرد التوقيع على هذا المحضر، تنتقل مسؤولية الحفاظ على المواد والأعمال إلى الطرف الثاني، ولا يحق له الرجوع على الطرف الأول بأي مطالبات مستقبلية تتعلق بالنواقص أو العيوب الظاهرة.</p>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 15px;">
        <div style="flex: 1; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; border-top: 3px solid ${MTS_RED};">
          <h4 style="margin: 0 0 8px; text-align: center; font-size: 10px; font-weight: 700; color: ${MTS_RED};">الطرف الأول (المُسلِّم)</h4>
          <div style="font-size: 9px; line-height: 1.8;">
            <p style="margin: 0;"><strong>الاسم:</strong> ${delivererName}</p>
            <p style="margin: 0;"><strong>المنصب:</strong> ${delivererTitle}</p>
            <p style="margin: 0;"><strong>التاريخ:</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
          <div style="margin-top: 12px; text-align: center;">
             <div style="height: 35px; border-bottom: 1px dashed #94a3b8; display: flex; align-items: flex-end; justify-content: center;">
                <span style="color: #94a3b8; font-size: 8px;">التوقيع والختم</span>
             </div>
          </div>
        </div>

        <div style="flex: 1; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; border-top: 3px solid ${MTS_BLACK};">
          <h4 style="margin: 0 0 8px; text-align: center; font-size: 10px; font-weight: 700; color: ${MTS_BLACK};">الطرف الثاني (المُستلِم)</h4>
          <div style="font-size: 9px; line-height: 1.8;">
            <p style="margin: 0;"><strong>الاسم:</strong> ${receiverName || '.................................'}</p>
            <p style="margin: 0;"><strong>المنصب:</strong> ${receiverTitle || '.................................'}</p>
            <p style="margin: 0;"><strong>التاريخ:</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
          <div style="margin-top: 12px; text-align: center;">
             <div style="height: 35px; border-bottom: 1px dashed #94a3b8; display: flex; align-items: flex-end; justify-content: center;">
                <span style="color: #94a3b8; font-size: 8px;">التوقيع والختم</span>
             </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 15px; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
        <p style="margin: 0;">تم إنشاء هذا المستند إلكترونياً عبر نظام MTS Supreme | ${format(new Date(), 'yyyy/MM/dd HH:mm')} م</p>
        <p style="margin: 2px 0 0;">MTS Services | www.mtserp.com</p>
      </div>
    </div>
  `;

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `محضر_تسليم_${certificate.certificate_number || 'draft'}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
  };

  try {
    await html2pdf().from(element).set(opt).save();
    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return false;
  }
};