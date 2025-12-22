import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const RiskMeterGauge = ({ stats }) => {
  // بيانات الرسم البياني
  const data = [
    { name: 'خطورة عالية', value: stats?.high_risk || 0, color: '#dc2626' },
    { name: 'خطورة متوسطة', value: stats?.medium_risk || 0, color: '#eab308' },
    { name: 'آمن', value: stats?.low_risk || 0, color: '#16a34a' }
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // تخصيص Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0];
      const percentage = total > 0 ? ((dataItem.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-right dir-rtl">
          <p className="font-bold text-gray-900">{dataItem.name}</p>
          <p className="text-gray-700">
            {dataItem.value} موظف ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // تخصيص Legend بشكل آمن
  const CustomLegend = (props) => {
    const { payload } = props;
    
    if (!payload || payload.length === 0) return null;

    return (
      <div className="flex flex-col gap-2 mt-4 w-full">
        {payload.map((entry, index) => {
          // البحث عن البيانات الأصلية باستخدام الاسم
          // entry.value في Recharts Legend يعيد اسم الفئة (nameKey)
          const originalItem = data.find(d => d.name === entry.value);
          const value = originalItem ? originalItem.value : 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          
          return (
            <div key={`legend-${index}`} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg w-full">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {entry.value}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">
                  {value} موظف
                </span>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-100">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // حساب متوسط النقاط
  const averageScore = stats?.average_score || 0;
  const scoreColor = averageScore >= 50 ? 'text-red-600' : averageScore >= 25 ? 'text-yellow-600' : 'text-green-600';

  return (
    <Card className="border-2 h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>توزيع المخاطر</span>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-normal">متوسط النقاط</p>
            <p className={`text-2xl font-bold ${scoreColor}`}>
              {typeof averageScore === 'number' ? averageScore.toFixed(1) : '0.0'}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* الرسم البياني - نستخدم dir=ltr للرسم البياني لتجنب مشاكل الاتجاهات في المكتبة */}
          <div className="h-[250px] w-full flex justify-center items-center" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* إجمالي الموظفين */}
          <div className="pt-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-600 mb-1">إجمالي الموظفين</p>
              <p className="text-3xl font-bold text-blue-700">{total}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskMeterGauge;