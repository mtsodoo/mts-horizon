import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { Briefcase, PlusCircle, AlertCircle } from 'lucide-react'; // Changed icon import for PageTitle
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, getDeficitColor, SETTLEMENT_STATUSES } from '@/utils/financialUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Empty, Spin, Tag, message } from 'antd';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { Helmet } from 'react-helmet'; // Added Helmet import

const StatCard = ({ title, value, className = '' }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${className}`}>{value}</div>
        </CardContent>
    </Card>
);

const SettlementCard = ({ settlement }) => {
    const navigate = useNavigate();

    return (
        <Card className="hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer" onClick={() => navigate(`/custody-settlement/${settlement.id}`)}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{settlement.request_title}</CardTitle>
                    <Tag className={`${SETTLEMENT_STATUSES[settlement.status]?.color} px-3 py-1 text-xs`}>
                        {SETTLEMENT_STATUSES[settlement.status]?.text}
                    </Tag>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                        <p className="text-muted-foreground">مبلغ العهدة</p>
                        <p className="font-bold text-green-600">{formatCurrency(settlement.custody_amount)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">المصاريف</p>
                        <p className="font-bold text-orange-600">{formatCurrency(settlement.total_expenses)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">المتبقي</p>
                        <p className={`font-bold ${getDeficitColor(settlement.remaining_amount)}`}>
                            {formatCurrency(settlement.remaining_amount)}
                        </p>
                    </div>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                    <span>تاريخ الإنشاء: {format(new Date(settlement.created_at), 'PPP', { locale: ar })}</span>
                    <span>{settlement.expense_count || 0} مصاريف</span>
                </div>
            </CardContent>
             <div className="p-4 pt-0">
                <Button className="w-full" variant="outline" onClick={() => navigate(`/custody-settlement/${settlement.id}`)}>
                    <PlusCircle className="ml-2 h-4 w-4" /> عرض التفاصيل والإدارة
                </Button>
            </div>
        </Card>
    );
};

const MyCustodySettlements = () => {
    const { user } = useAuth();
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSettlements = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('custody_settlements')
                .select(`*, request:custody_request_id(title), expenses:settlement_expenses(count)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setSettlements(data.map(s => ({ 
                ...s, 
                expense_count: s.expenses[0]?.count || 0, 
                request_title: s.request?.title || `عهدة رقم ${s.id.substring(0, 8)}` 
            })));
        } catch (err) {
            setError('فشل في تحميل تسويات العهد.');
            handleSupabaseError(err, 'فشل جلب تسويات العهد');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchSettlements();
            const channel = supabase.channel(`custody-settlements-channel-${user.id}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'custody_settlements', filter: `user_id=eq.${user.id}` }, fetchSettlements)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'settlement_expenses', filter: `user_id=eq.${user.id}`}, fetchSettlements)
              .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [fetchSettlements, user]);

    const stats = useMemo(() => {
        const activeSettlements = settlements.filter(s => s.status !== 'closed');
        return {
            open_count: activeSettlements.length,
            total_custody: activeSettlements.reduce((acc, s) => acc + Number(s.custody_amount), 0),
            total_expenses: activeSettlements.reduce((acc, s) => acc + Number(s.total_expenses), 0),
            remaining_amount: activeSettlements.reduce((acc, s) => acc + Number(s.remaining_amount), 0),
        };
    }, [settlements]);

    return (
        <div className="space-y-6">
            <Helmet><title>تسوية العهد المالية</title></Helmet>
            <PageTitle title="تسوية العهد المالية" icon={Briefcase} /> {/* Updated icon prop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="تحت الإجراء" value={stats.open_count} />
                <StatCard title="إجمالي مبالغ العهد" value={formatCurrency(stats.total_custody)} className="text-green-600" />
                <StatCard title="إجمالي المصاريف" value={formatCurrency(stats.total_expenses)} className="text-orange-600" />
                <StatCard title="إجمالي المتبقي" value={formatCurrency(stats.remaining_amount)} className={getDeficitColor(stats.remaining_amount)} />
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><Spin size="large" /></div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-700 font-semibold text-lg">{error}</p>
                    <Button onClick={fetchSettlements} className="mt-4">إعادة المحاولة</Button>
                </div>
            ) : settlements.length === 0 ? (
                <Empty description="ليس لديك أي عهد مالية حاليًا." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settlements.map(s => <SettlementCard key={s.id} settlement={s} />)}
                </div>
            )}
        </div>
    );
};

export default MyCustodySettlements;