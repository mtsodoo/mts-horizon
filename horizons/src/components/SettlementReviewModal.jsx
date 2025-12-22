import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Modal, Table, Tag, Empty, Spin, message } from 'antd';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const SettlementReviewModal = ({ settlement, isOpen, onClose, onApprove, onReject }) => {
  const { user: currentUser } = useAuth();
  const [reviewNotes, setReviewNotes] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (isOpen && settlement) {
      fetchExpenses();
    }
  }, [isOpen, settlement]);

  const fetchExpenses = async () => {
    if (!settlement) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settlement_expenses')
        .select('*')
        .eq('settlement_id', settlement.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Expenses fetched:', data);
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      message.error('فشل جلب المصروفات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('هل أنت متأكد من اعتماد هذه التصفية؟')) {
      return;
    }

    try {
      setApproving(true);

      // Update settlement status to approved
      const { error: settlementError } = await supabase
        .from('custody_settlements')
        .update({
          status: 'approved',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', settlement.id);

      if (settlementError) throw settlementError;

      message.success('✅ تم اعتماد التصفية بنجاح');
      onApprove();
      onClose();

    } catch (error) {
      console.error('Approval error:', error);
      message.error('حدث خطأ: ' + error.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes || reviewNotes.trim().length < 10) {
      message.error('يرجى كتابة سبب الرفض (10 أحرف على الأقل)');
      return;
    }

    if (!window.confirm('هل أنت متأكد من رفض هذه التصفية؟')) {
      return;
    }

    try {
      setRejecting(true);

      // Return settlement to open status so employee can resubmit
      const { error } = await supabase
        .from('custody_settlements')
        .update({
          status: 'open',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', settlement.id);

      if (error) throw error;

      message.success('❌ تم رفض التصفية وإعادتها للموظف');
      onReject();
      onClose();

    } catch (error) {
      console.error('Rejection error:', error);
      message.error('حدث خطأ: ' + error.message);
    } finally {
      setRejecting(false);
    }
  };

  if (!isOpen || !settlement) return null;

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const remaining = settlement.custody_amount - totalExpenses;

  return (
    <Modal
      title="مراجعة واعتماد التصفية"
      open={isOpen}
      onCancel={onClose}
      width={1000}
      footer={null}
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="space-y-6">
        {/* Employee Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-3">معلومات الموظف</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">الاسم:</span>
              <p className="font-semibold">{settlement.employee?.name_ar || 'غير معروف'}</p>
            </div>
            <div>
              <span className="text-gray-600">القسم:</span>
              <p className="font-semibold">{settlement.employee?.department || '-'}</p>
            </div>
          </div>
        </div>

        {/* Custody Summary */}
        <div>
          <h3 className="font-bold mb-3">ملخص العهدة</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-gray-600 mb-1">مبلغ العهدة</div>
              <div className="text-2xl font-bold text-green-600">
                {settlement.custody_amount?.toLocaleString()} ريال
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="text-sm text-gray-600 mb-1">إجمالي المصروفات</div>
              <div className="text-2xl font-bold text-amber-600">
                {totalExpenses.toLocaleString()} ريال
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${remaining >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-sm text-gray-600 mb-1">
                {remaining >= 0 ? 'المتبقي' : 'العجز'}
              </div>
              <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {Math.abs(remaining).toLocaleString()} ريال
              </div>
            </div>
          </div>

          {remaining < 0 && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800">
              ⚠️ تنبيه: يوجد عجز قدره {Math.abs(remaining).toLocaleString()} ريال
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div>
          <h3 className="font-bold mb-3">الفواتير المرفقة ({expenses.length})</h3>
          {loading ? (
            <div className="flex justify-center py-8"><Spin /></div>
          ) : expenses.length === 0 ? (
            <Empty description="لا توجد فواتير" />
          ) : (
            <div className="overflow-x-auto">
              <Table
                columns={[
                  {
                    title: 'التاريخ',
                    dataIndex: 'expense_date',
                    key: 'date',
                    render: (date) => format(new Date(date), 'PPP', { locale: ar }),
                    width: 120
                  },
                  {
                    title: 'البيان',
                    dataIndex: 'description',
                    key: 'description',
                    render: (text) => text || '-'
                  },
                  {
                    title: 'المبلغ',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (amount) => `${parseFloat(amount).toLocaleString()} ريال`,
                    width: 120
                  },
                  {
                    title: 'الفاتورة',
                    dataIndex: 'receipt_url',
                    key: 'receipt',
                    render: (url) => url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        عرض
                      </a>
                    ) : '-',
                    width: 80
                  }
                ]}
                dataSource={expenses}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </div>
          )}
        </div>

        {/* Review Notes */}
        <div>
          <h3 className="font-bold mb-3">ملاحظات المراجعة</h3>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="اكتب ملاحظاتك على التصفية (اختياري للموافقة، إجباري للرفض)"
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
          >
            {approving ? 'جاري الاعتماد...' : '✅ اعتماد التصفية'}
          </button>
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50"
          >
            {rejecting ? 'جاري الرفض...' : '❌ رفض التصفية'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg"
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SettlementReviewModal;