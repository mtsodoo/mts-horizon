import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6'];

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSalaries: 0,
    totalSalariesYTD: 0,
    employeeCount: 0,
    matchRevenue: 0,
    matchExpenses: 0,
    matchProfit: 0,
    matchCount: 0,
    projectExpenses: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    expenseBreakdown: []
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0) + ' ر.س';
  };

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const thisYear = today.getFullYear();
      const yearStartDate = new Date(thisYear, 0, 1);
      const thisMonthNumber = today.getMonth() + 1;

      // 1. الموظفين والرواتب
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, base_salary, housing_allowance, transportation_allowance, hire_date')
        .eq('is_active', true);

      if (empError) throw empError;

      let yearlyTotal = 0;
      let monthlyTotal = 0;

      (employees || []).forEach(emp => {
        const monthly = (Number(emp.base_salary) || 0) + (Number(emp.housing_allowance) || 0) + (Number(emp.transportation_allowance) || 0);
        monthlyTotal += monthly;

        let months = thisMonthNumber;
        if (emp.hire_date) {
          const hDate = new Date(emp.hire_date);
          if (hDate >= yearStartDate) {
            const hMonth = hDate.getMonth() + 1;
            months = thisMonthNumber - hMonth + 1;
            if (months < 1) months = 1;
          }
        }
        yearlyTotal += monthly * months;
      });

      // 2. المباريات (approved أو completed فقط)
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('total_invoice, total_expenses, net_profit, status')
        .in('status', ['approved', 'completed']);

      if (matchError) throw matchError;

      const mRevenue = (matches || []).reduce((s, m) => s + (Number(m.total_invoice) || 0), 0);
      const mExpenses = (matches || []).reduce((s, m) => s + (Number(m.total_expenses) || 0), 0);
      const mProfit = (matches || []).reduce((s, m) => s + (Number(m.net_profit) || 0), 0);

      // 3. مصروفات المشاريع
      const { data: projExp, error: expError } = await supabase
        .from('project_expenses')
        .select('amount');

      if (expError) throw expError;

      const projExpTotal = (projExp || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // 4. الحسابات النهائية
      const totalRev = mRevenue;
      const totalExp = yearlyTotal + mExpenses + projExpTotal;
      const netProfit = totalRev - totalExp;

      const expenseBreakdown = [
        { name: 'الرواتب', amount: yearlyTotal, color: '#3b82f6' },
        { name: 'المباريات', amount: mExpenses, color: '#f59e0b' },
        { name: 'المشاريع', amount: projExpTotal, color: '#8b5cf6' },
      ].filter(e => e.amount > 0);

      setStats({
        totalSalaries: monthlyTotal,
        totalSalariesYTD: yearlyTotal,
        employeeCount: employees?.length || 0,
        matchRevenue: mRevenue,
        matchExpenses: mExpenses,
        matchProfit: mProfit,
        matchCount: matches?.length || 0,
        projectExpenses: projExpTotal,
        totalRevenue: totalRev,
        totalExpenses: totalExp,
        netProfit: netProfit,
        expenseBreakdown
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقارير المالية</h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على الأداء المالي من بداية السنة</p>
        </div>
        <Button variant="outline" onClick={fetchFinancialData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* البطاقات الرئيسية */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">من {stats.matchCount} مباراة</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <CreditCard className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">رواتب + مباريات + مشاريع</p>
          </CardContent>
        </Card>

        <Card className={`border-t-4 ${stats.netProfit >= 0 ? 'border-t-blue-500' : 'border-t-orange-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح/الخسارة</CardTitle>
            {stats.netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-blue-500" /> : <TrendingDown className="h-5 w-5 text-orange-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(stats.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.netProfit >= 0 ? 'ربح' : 'خسارة'}</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرواتب</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalSalariesYTD)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.employeeCount} موظف | الشهري: {formatCurrency(stats.totalSalaries)}</p>
          </CardContent>
        </Card>
      </div>

      {/* التفاصيل */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* توزيع المصروفات */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    dataKey="amount"
                  >
                    {stats.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد مصروفات</div>
            )}
          </CardContent>
        </Card>

        {/* ملخص سريع */}
        <Card>
          <CardHeader>
            <CardTitle>ملخص المصروفات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">الرواتب (من بداية السنة)</span>
              <span className="font-bold text-blue-600">{formatCurrency(stats.totalSalariesYTD)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <span className="font-medium">مصروفات المباريات</span>
              <span className="font-bold text-amber-600">{formatCurrency(stats.matchExpenses)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="font-medium">مصروفات المشاريع</span>
              <span className="font-bold text-purple-600">{formatCurrency(stats.projectExpenses)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-t-2">
              <span className="font-bold">الإجمالي</span>
              <span className="font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;