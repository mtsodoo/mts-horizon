import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, User } from 'lucide-react';

const TopRiskyEmployees = ({ employees, limit = 5 }) => {
  // أخذ أول N موظفين
  const topEmployees = employees?.slice(0, limit) || [];

  // تحديد الأيقونة حسب الترتيب
  const getRankIcon = (index) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || `${index + 1}`;
  };

  // تحديد لون الدرجة
  const getScoreColor = (score) => {
    if (score >= 75) return 'text-red-600 bg-red-100';
    if (score >= 50) return 'text-orange-600 bg-orange-100';
    if (score >= 25) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  // تحديد أيقونة المخاطرة
  const getRiskIcon = (level) => {
    return level === 'high' ? (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    ) : (
      <TrendingUp className="h-4 w-4 text-yellow-600" />
    );
  };

  if (topEmployees.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            أعلى الموظفين خطورة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد بيانات متاحة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          أعلى {limit} موظفين خطورة
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          الموظفون الذين يحتاجون متابعة عاجلة
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {topEmployees.map((employee, index) => (
            <div
              key={employee.employee_id}
              className={`
                relative p-4 rounded-lg border-2 transition-all hover:shadow-md
                ${index === 0 ? 'border-red-300 bg-red-50/50' : 
                  index === 1 ? 'border-orange-300 bg-orange-50/50' : 
                  'border-gray-200 bg-white'}
              `}
            >
              {/* الترتيب */}
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-xl shadow-sm">
                {getRankIcon(index)}
              </div>

              <div className="flex items-start justify-between pr-6">
                {/* معلومات الموظف */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-12 w-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">
                      {employee.name_ar}
                    </h4>
                    <p className="text-sm text-gray-600">{employee.employee_number}</p>
                    {employee.department && (
                      <p className="text-xs text-gray-500 mt-1">
                        {employee.department}
                      </p>
                    )}
                  </div>
                </div>

                {/* درجة المخاطرة */}
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(employee.risk_score)}`}>
                    {employee.risk_score}
                  </div>
                  <div className="flex items-center gap-1">
                    {getRiskIcon(employee.risk_level)}
                    <Badge 
                      variant={employee.risk_level === 'high' ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {employee.risk_level === 'high' ? 'عالية' : 'متوسطة'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* المؤشرات السريعة */}
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">غياب</p>
                  <p className={`text-sm font-bold ${employee.factors?.absences >= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                    {employee.factors?.absences || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">تأخير</p>
                  <p className={`text-sm font-bold ${employee.factors?.late_count >= 5 ? 'text-orange-600' : 'text-gray-700'}`}>
                    {employee.factors?.late_count || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">تنبيهات</p>
                  <p className={`text-sm font-bold ${employee.factors?.pending_alerts >= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                    {employee.factors?.pending_alerts || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">مهام</p>
                  <p className={`text-sm font-bold ${employee.factors?.overdue_tasks >= 1 ? 'text-yellow-600' : 'text-gray-700'}`}>
                    {employee.factors?.overdue_tasks || 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopRiskyEmployees;