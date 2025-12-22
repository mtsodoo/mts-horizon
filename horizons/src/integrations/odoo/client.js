// ✅ الرابط الصحيح والنهائي للجسر
const BRIDGE_URL = 'https://sys.mtserp.com/odoo_bridge.php';

export const syncOdooData = async (payload) => {
  console.log('🚀 Starting Sync with payload:', payload);
  
  try {
    const response = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    console.log('📡 Response Status:', response.status);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server Error (${response.status}): ${text}`);
    }

    const data = await response.json();
    console.log('✅ Data Received:', data);
    
    return data;

  } catch (error) {
    console.error('💥 Bridge Connection Error:', error);
    return { success: false, error: error.message };
  }
};

// --- دوال جلب البيانات ---

export const getCustomerInvoices = () => syncOdooData({ action: 'fetch_invoices', limit: 50 });

export const getQuotations = () => syncOdooData({ action: 'fetch_quotations', limit: 50 });

export const getJournalEntries = () => syncOdooData({ action: 'fetch_journal_entries', limit: 50 });

// دالة فارغة للتوافق (في حال كانت مستخدمة في مكان آخر)
export const getVendorBills = () => Promise.resolve({ success: true, data: [] });


// --- دالة تحميل PDF ---
export const downloadOdooPdf = async (type, id) => {
  console.log(`📄 Requesting PDF: ${type} #${id}`);
  
  try {
    const data = await syncOdooData({ 
        action: 'download_pdf', 
        type: type, 
        id: id 
    });

    if (!data.success) throw new Error(data.error || 'Unknown PDF Error');

    // تحويل Base64 وتنزيله
    const byteCharacters = atob(data.file);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };

  } catch (error) {
    console.error('❌ PDF Download Error:', error);
    return { success: false, error: error.message };
  }
};