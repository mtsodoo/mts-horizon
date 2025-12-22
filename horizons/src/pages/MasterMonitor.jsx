import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Search, RefreshCw } from 'lucide-react';
import { getAllEmployeesRiskScores } from '@/utils/omarTools';
import PageTitle from '@/components/PageTitle';

export default function MasterMonitor() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    const result = await getAllEmployeesRiskScores();
    if (result.success) {
      setEmployees(result.data);
      setFilteredEmployees(result.data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(employees.filter(emp =>
        emp.name_ar?.includes(searchTerm) || emp.employee_number?.includes(searchTerm)
      ));
    }
  }, [searchTerm, employees]);

  const getRiskBadge = (level) => {
    if (level === 'high') return <Badge className="gap-1 bg-red-500 text-white"><TrendingUp className="h-3 w-3" />مرتفع</Badge>;
    if (level === 'medium') return <Badge className="gap-1 bg-yellow-500 text-white"><Minus className="h-3 w-3" />متوسط</Badge>;
    return <Badge className="gap-1 bg-green-500 text-white"><TrendingDown className="h-3 w-3" />منخفض</Badge>;
  };

  const stats = {
    total: employees.length,
    high: employees.filter(e => e.risk_level === 'high').length,
    medium: employees.filter(e => e.risk_level === 'medium').length,
    low: employees.filter(e => e.risk_level === 'low').length
  };

  if (profile?.role !== 'general_manager' && profile?.role !== 'hr') {
    return <div className="p-6 text-center text-red-500 text-xl">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageTitle title="لوحة المراقبة الرئيسية" description="مراقبة حالة جميع الموظفين" />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">إجمالي الموظفين</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">مخاطرة عالية</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-700">{stats.high}</div></CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-700">مخاطرة متوسطة</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-700">{stats.medium}</div></CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700">مخاطرة منخفضة</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-700">{stats.low}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>قائمة الموظفين</CardTitle>
            <Button onClick={fetchEmployees} variant="outline" size="sm"><RefreshCw className="h-4 w-4 ml-2" />تحديث</Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="ابحث بالاسم أو الرقم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" /><p className="mt-2 text-gray-500">جاري التحميل...</p></div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">لا يوجد موظفين</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">المخاطرة</TableHead>
                  <TableHead className="text-right">الغيابات</TableHead>
                  <TableHead className="text-right">التأخيرات</TableHead>
                  <TableHead className="text-right">التنبيهات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.employee_id}>
                    <TableCell>
                      <div className="font-medium">{emp.name_ar}</div>
                      <div className="text-sm text-gray-500">{emp.employee_number}</div>
                    </TableCell>
                    <TableCell>{emp.department || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(emp.risk_level)}
                        <span className="text-xs text-gray-500">{emp.risk_score}/100</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={emp.factors.absences > 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                        {emp.factors.absences}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={emp.factors.late_count > 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
                        {emp.factors.late_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={emp.factors.pending_alerts > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                        {emp.factors.pending_alerts}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}