import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency, getStatusColor, getStatusLabel, getDeficitColor, getDeficitLabel } from '@/utils/financialUtils';
import { DollarSign, Hash, Calendar, FileCheck, FileX, Info, Clock, UserCheck } from 'lucide-react';

const SettlementSummary = ({ settlement, children }) => {
    if (!settlement) return null;

    const totalExpenses = settlement.total_expenses || 0;
    const remainingAmount = settlement.custody_amount - totalExpenses;

    const summaryItems = [
        { icon: DollarSign, label: 'مبلغ العهدة', value: formatCurrency(settlement.custody_amount), color: 'text-green-600' },
        { icon: Hash, label: 'إجمالي المصروفات', value: formatCurrency(totalExpenses), color: 'text-orange-600' },
        { icon: DollarSign, label: `المتبقي (${getDeficitLabel(remainingAmount)})`, value: formatCurrency(remainingAmount), color: getDeficitColor(remainingAmount) },
        { icon: Calendar, label: 'تاريخ الإنشاء', value: format(new Date(settlement.created_at), 'PPP', { locale: ar }) },
    ];
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>ملخص العهدة</CardTitle>
                        <CardDescription>نظرة عامة على تفاصيل العهدة وحالتها المالية.</CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(settlement.status)} px-3 py-1 text-sm`}>{getStatusLabel(settlement.status)}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {summaryItems.map((item, index) => (
                        <div key={index} className="flex flex-col p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center text-muted-foreground">
                                <item.icon className="w-4 h-4 ml-2" />
                                <span className="text-sm">{item.label}</span>
                            </div>
                            <span className={`text-xl font-bold mt-1 ${item.color || ''}`}>{item.value}</span>
                        </div>
                    ))}
                </div>
                {(settlement.status === 'rejected' && settlement.review_notes) && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                        <div className="flex items-center font-semibold text-red-700 dark:text-red-300">
                            <FileX className="w-5 h-5 ml-2" />
                            <span>سبب الرفض</span>
                        </div>
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{settlement.review_notes}</p>
                    </div>
                )}
                 {(settlement.status === 'pending_review' && settlement.submitted_at) && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                        <div className="flex items-center text-sm text-yellow-800 dark:text-yellow-300">
                             <Clock className="w-4 h-4 ml-2 flex-shrink-0"/>
                             <span>تم تقديم التسوية للمراجعة في {format(new Date(settlement.submitted_at), 'PPP p', { locale: ar })} وهي الآن بانتظار الاعتماد.</span>
                        </div>
                    </div>
                 )}
                 {(settlement.status === 'approved' && settlement.reviewed_at) && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
                        <div className="flex items-center text-sm text-green-800 dark:text-green-300">
                             <FileCheck className="w-4 h-4 ml-2 flex-shrink-0"/>
                             <span>تم اعتماد التسوية في {format(new Date(settlement.reviewed_at), 'PPP p', { locale: ar })}.</span>
                        </div>
                    </div>
                 )}
            </CardContent>
            {children && (
                <CardFooter className="justify-end">
                    {children}
                </CardFooter>
            )}
        </Card>
    );
};

export default SettlementSummary;