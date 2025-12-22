import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Lightbulb
} from 'lucide-react';

const PatternDetectionWidget = ({ patterns, recommendations, summary }) => {
  const [expanded, setExpanded] = useState(true);

  // تحديد أيقونة النمط
  const getPatternIcon = (type) => {
    switch(type) {
      case 'frequent_absence_day':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'frequent_late_day':
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      case 'increasing_absences':
        return <Activity className="h-5 w-5 text-orange-500" />;
      case 'consecutive_late':
        return <Target className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-blue-500" />;
    }
  };

  // تحديد لون الخطورة
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  // تحديد نص الخطورة
  const getSeverityText = (severity) => {
    switch(severity) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      default: return 'منخفضة';
    }
  };

  if (!patterns || patterns.length === 0) {
    return (
      <Card className="border-2 border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            كشف الأنماط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-medium">لا توجد أنماط مقلقة</p>
            <p className="text-green-600 text-sm mt-1">
              أداء الموظف منتظم وجيد
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader 
        className="cursor-pointer bg-gradient-to-r from-orange-50 to-yellow-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            كشف الأنماط
            <Badge variant="secondary" className="mr-2">
              {patterns.length} نمط
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* ملخص التحليل */}
            {summary && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  ملخص التحليل
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs">إجمالي السجلات</p>
                    <p className="font-bold text-gray-900">{summary.total_records}</p>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs">الغيابات</p>
                    <p className="font-bold text-red-600">{summary.total_absences}</p>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs">التأخيرات</p>
                    <p className="font-bold text-orange-600">{summary.total_late}</p>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-100">
                    <p className="text-gray-500 text-xs">أنماط مكتشفة</p>
                    <p className="font-bold text-blue-600">{summary.patterns_detected}</p>
                  </div>
                </div>
              </div>
            )}

            {/* الأنماط المكتشفة */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                الأنماط المكتشفة
              </h4>
              <div className="space-y-2">
                {patterns.map((pattern, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border-2 ${getSeverityColor(pattern.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getPatternIcon(pattern.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">
                            {pattern.description}
                          </p>
                          <Badge 
                            variant={pattern.severity === 'high' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {getSeverityText(pattern.severity)}
                          </Badge>
                        </div>
                        {pattern.count && (
                          <p className="text-xs opacity-75">
                            عدد المرات: {pattern.count}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* التوصيات */}
            {recommendations && recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  التوصيات
                </h4>
                <div className="space-y-2">
                  {recommendations.map((recommendation, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-900">
                        {recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ملاحظة المتابعة */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    يُنصح بالمتابعة
                  </p>
                  <p className="text-xs text-yellow-700">
                    هذه الأنماط تحتاج إلى انتباه واتخاذ إجراءات مناسبة للحد من المخاطر
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default PatternDetectionWidget;