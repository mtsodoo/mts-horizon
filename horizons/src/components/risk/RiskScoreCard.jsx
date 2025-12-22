import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, TrendingUp, User } from 'lucide-react';

const RiskScoreCard = ({ employee }) => {
  // تحديد اللون حسب مستوى المخاطرة
  const getRiskColor = (level) => {
    switch(level) {
      case 'high': 
        return 'border-red-200 bg-red-50/50';
      case 'medium': 
        return 'border-yellow-200 bg-yellow-50/50';
      default: 
        return 'border-green-200 bg-green-50/50';
    }
  };

  // تحديد لون الشريط التقدمي
  const getProgressColor = (level) => {
    switch(level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };
  
  // تحديد الأيقونة حسب مستوى المخاطرة
  const getRiskIcon = (level) => {
    switch(level) {
      case 'high': 
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium': 
        return <TrendingUp className="h-5 w-5 text-yellow-600" />;
      default: 
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  // تحديد النص العربي لمستوى المخاطرة
  const getRiskText = (level) => {
    switch(level) {
      case 'high': return 'خطورة عالية';
      case 'medium': return 'خطورة متوسطة';
      default: return 'آمن';
    }
  };

  // تحديد لون الشارة
  const getBadgeVariant = (level) => {
    switch(level) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };
  
  return (
    <Card className={`border-2 transition-all hover:shadow-lg ${getRiskColor(employee.risk_level)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{employee.name_ar}</CardTitle>
              <p className="text-sm text-gray-600">{employee.employee_number}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getRiskIcon(employee.risk_level)}
            <Badge variant={getBadgeVariant(employee.risk_level)} className="text-xs">
              {getRiskText(employee.risk_level)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* شريط النقاط */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">درجة المخاطرة</span>
            <span className="font-bold text-lg">{employee.risk_score}/100</span>
          </div>
          <div className="relative">
            <Progress 
              value={employee.risk_score} 
              className={`h-3 ${getProgressColor(employee.risk_level)}`}
            />
          </div>
        </div>

        {/* القسم */}
        {employee.department && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">القسم</p>
            <p className="text-sm font-medium">{employee.department}</p>
          </div>
        )}

        {/* المؤشرات */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">الغيابات</p>
            <p className={`text-lg font-bold ${employee.factors?.absences >= 3 ? 'text-red-600' : 'text-gray-700'}`}>
              {employee.factors?.absences || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">التأخيرات</p>
            <p className={`text-lg font-bold ${employee.factors?.late_count >= 5 ? 'text-orange-600' : 'text-gray-700'}`}>
              {employee.factors?.late_count || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">التنبيهات</p>
            <p className={`text-lg font-bold ${employee.factors?.pending_alerts >= 3 ? 'text-red-600' : 'text-gray-700'}`}>
              {employee.factors?.pending_alerts || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">مهام متأخرة</p>
            <p className={`text-lg font-bold ${employee.factors?.overdue_tasks >= 1 ? 'text-yellow-600' : 'text-gray-700'}`}>
              {employee.factors?.overdue_tasks || 0}
            </p>
          </div>
        </div>

        {/* الخصومات إن وجدت */}
        {employee.factors?.total_deductions > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 mb-1">إجمالي الخصومات</p>
              <p className="text-lg font-bold text-red-700">
                {employee.factors.total_deductions.toFixed(2)} ريال
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskScoreCard;