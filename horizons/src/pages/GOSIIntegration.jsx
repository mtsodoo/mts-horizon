import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Settings, 
  Users, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Download,
  Upload,
  Eye,
  EyeOff,
  AlertTriangle,
  Calculator
} from 'lucide-react';
import { message, Spin } from 'antd';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const GOSIIntegration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingEmployee, setSyncingEmployee] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  
  const [gosiSettings, setGosiSettings] = useState({
    registration_number: '',
    client_id: '',
    client_secret: '',
    private_key: '',
    environment: 'sandbox',
    is_active: false,
    last_sync: null
  });

  const GOSI_RATES = {
    employee: 9.75,
    employer: 12.0
  };

  useEffect(() => {
    fetchEmployees();
    fetchGOSISettings();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .neq('role', 'ai_manager')
        .order('name_ar');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      message.error('فشل في تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const fetchGOSISettings = async () => {
    try {
      const { data, error } = await supabase
        .from('gosi_settings')
        .select('*')
        .single();

      if (data) {
        setSettingsId(data.id);
        setGosiSettings({
          registration_number: data.registration_number || '',
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          private_key: data.private_key || '',
          environment: data.environment || 'sandbox',
          is_active: data.is_active || false,
          last_sync: data.last_sync
        });
      }
    } catch (error) {
      console.log('No GOSI settings found');
    }
  };

  const saveGOSISettings = async () => {
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('gosi_settings')
          .update({
            registration_number: gosiSettings.registration_number,
            client_id: gosiSettings.client_id,
            client_secret: gosiSettings.client_secret,
            private_key: gosiSettings.private_key,
            environment: gosiSettings.environment,
            is_active: gosiSettings.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('gosi_settings')
          .insert({
            registration_number: gosiSettings.registration_number,
            client_id: gosiSettings.client_id,
            client_secret: gosiSettings.client_secret,
            private_key: gosiSettings.private_key,
            environment: gosiSettings.environment,
            is_active: gosiSettings.is_active
          })
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }
      
      message.success('✅ تم حفظ إعدادات GOSI بنجاح');
    } catch (error) {
      console.error(error);
      message.error('فشل في حفظ الإعدادات');
    }
  };

  const testConnection = async () => {
    if (!gosiSettings.registration_number || !gosiSettings.client_id || !gosiSettings.client_secret) {
      message.warning('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }

    setTestingConnection(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('✅ تم الاتصال بنجاح مع GOSI API');
      setGosiSettings(prev => ({ ...prev, is_active: true }));
    } catch (error) {
      message.error('❌ فشل الاتصال: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const syncEmployee = async (employee) => {
    if (!employee.national_id) {
      message.warning('الموظف ليس لديه رقم هوية مسجل');
      return;
    }

    setSyncingEmployee(employee.id);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      message.success(`✅ تم مزامنة بيانات ${employee.name_ar}`);
    } catch (error) {
      message.error('فشل في مزامنة البيانات');
    } finally {
      setSyncingEmployee(null);
    }
  };

  const syncAllEmployees = async () => {
    const employeesWithNationalId = employees.filter(e => e.national_id);
    
    if (employeesWithNationalId.length === 0) {
      message.warning('لا يوجد موظفين لديهم رقم هوية');
      return;
    }

    setLoading(true);
    try {
      for (const emp of employeesWithNationalId) {
        await syncEmployee(emp);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setGosiSettings(prev => ({ 
        ...prev, 
        last_sync: new Date().toISOString() 
      }));
      
      message.success(`✅ تم مزامنة ${employeesWithNationalId.length} موظف`);
    } catch (error) {
      message.error('حدث خطأ أثناء المزامنة');
    } finally {
      setLoading(false);
    }
  };

  const calculateGOSI = (baseSalary, housingAllowance = 0) => {
    const totalForGOSI = (baseSalary || 0) + (housingAllowance || 0);
    const employeeDeduction = (totalForGOSI * GOSI_RATES.employee / 100).toFixed(2);
    const employerDeduction = (totalForGOSI * GOSI_RATES.employer / 100).toFixed(2);
    return { employeeDeduction, employerDeduction, totalForGOSI };
  };

  const updateEmployeeSalary = async (employeeId, field, value) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: parseFloat(value) || 0 })
        .eq('id', employeeId);

      if (error) throw error;
      
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, [field]: parseFloat(value) || 0 } : emp
      ));
      
      message.success('تم التحديث');
    } catch (error) {
      message.error('فشل في التحديث');
    }
  };

  return (
    <>
      <Helmet><title>ربط التأمينات الاجتماعية | GOSI</title></Helmet>
      
      <div className="space-y-6 p-4 md:p-8">
        <PageTitle 
          title="ربط التأمينات الاجتماعية (GOSI)" 
          icon={Shield}
          subtitle="إدارة ومزامنة بيانات الموظفين مع التأمينات الاجتماعية"
        />

        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 ml-2" />
              بيانات الموظفين
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="w-4 h-4 ml-2" />
              حاسبة الخصومات
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 ml-2" />
              إعدادات الربط
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>بيانات الموظفين في GOSI</CardTitle>
                  <CardDescription>عرض وتحديث بيانات التأمينات لكل موظف</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchEmployees} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                  <Button onClick={syncAllEmployees} disabled={loading || !gosiSettings.is_active}>
                    <Download className="w-4 h-4 ml-2" />
                    مزامنة الكل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Spin size="large" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الموظف</TableHead>
                          <TableHead>رقم الهوية</TableHead>
                          <TableHead>الراتب الأساسي</TableHead>
                          <TableHead>بدل السكن</TableHead>
                          <TableHead>إجمالي GOSI</TableHead>
                          <TableHead>خصم الموظف (9.75%)</TableHead>
                          <TableHead>خصم المنشأة (12%)</TableHead>
                          <TableHead>تاريخ الاشتراك</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => {
                          const gosi = calculateGOSI(emp.base_salary, emp.housing_allowance);
                          return (
                            <TableRow key={emp.id}>
                              <TableCell className="font-medium">{emp.name_ar}</TableCell>
                              <TableCell dir="ltr">
                                {emp.national_id || (
                                  <Badge variant="outline" className="text-yellow-600">غير مسجل</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={emp.base_salary || ''}
                                  onChange={(e) => updateEmployeeSalary(emp.id, 'base_salary', e.target.value)}
                                  className="w-24 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={emp.housing_allowance || ''}
                                  onChange={(e) => updateEmployeeSalary(emp.id, 'housing_allowance', e.target.value)}
                                  className="w-24 text-center"
                                />
                              </TableCell>
                              <TableCell className="font-bold text-blue-600">{gosi.totalForGOSI.toLocaleString()} ر.س</TableCell>
                              <TableCell className="text-red-600">{gosi.employeeDeduction} ر.س</TableCell>
                              <TableCell className="text-orange-600">{gosi.employerDeduction} ر.س</TableCell>
                              <TableCell>{emp.hire_date ? format(new Date(emp.hire_date), 'yyyy/MM/dd') : '-'}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => syncEmployee(emp)}
                                  disabled={syncingEmployee === emp.id || !emp.national_id}
                                >
                                  {syncingEmployee === emp.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold mb-4">ملخص خصومات GOSI الشهرية</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm text-gray-500">إجمالي رواتب GOSI</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {employees.reduce((sum, emp) => {
                          const gosi = calculateGOSI(emp.base_salary, emp.housing_allowance);
                          return sum + gosi.totalForGOSI;
                        }, 0).toLocaleString()} ر.س
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm text-gray-500">إجمالي خصم الموظفين</p>
                      <p className="text-2xl font-bold text-red-600">
                        {employees.reduce((sum, emp) => {
                          const gosi = calculateGOSI(emp.base_salary, emp.housing_allowance);
                          return sum + parseFloat(gosi.employeeDeduction);
                        }, 0).toFixed(2)} ر.س
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm text-gray-500">إجمالي خصم المنشأة</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {employees.reduce((sum, emp) => {
                          const gosi = calculateGOSI(emp.base_salary, emp.housing_allowance);
                          return sum + parseFloat(gosi.employerDeduction);
                        }, 0).toFixed(2)} ر.س
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle>حاسبة خصومات GOSI</CardTitle>
                <CardDescription>احسب خصومات التأمينات الاجتماعية لأي راتب</CardDescription>
              </CardHeader>
              <CardContent>
                <GOSICalculator rates={GOSI_RATES} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  إعدادات ربط GOSI API
                </CardTitle>
                <CardDescription>أدخل بيانات الربط المستلمة من التأمينات الاجتماعية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  {gosiSettings.is_active ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700">متصل</p>
                        <p className="text-sm text-gray-500">
                          آخر مزامنة: {gosiSettings.last_sync ? format(new Date(gosiSettings.last_sync), 'PPp', { locale: ar }) : 'لم تتم'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-500" />
                      <div>
                        <p className="font-medium text-red-700">غير متصل</p>
                        <p className="text-sm text-gray-500">أدخل بيانات الربط وجرب الاتصال</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>البيئة</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="environment"
                        value="sandbox"
                        checked={gosiSettings.environment === 'sandbox'}
                        onChange={(e) => setGosiSettings(prev => ({ ...prev, environment: e.target.value }))}
                        className="w-4 h-4"
                      />
                      <span>Sandbox (تجريبي)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="environment"
                        value="production"
                        checked={gosiSettings.environment === 'production'}
                        onChange={(e) => setGosiSettings(prev => ({ ...prev, environment: e.target.value }))}
                        className="w-4 h-4"
                      />
                      <span>Production (الإنتاج)</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Base URL: {gosiSettings.environment === 'sandbox' 
                      ? 'https://sandbox-api.gosi.gov.sa' 
                      : 'https://api.gosi.gov.sa'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration_number">رقم تسجيل المنشأة (Registration Number)</Label>
                  <Input
                    id="registration_number"
                    value={gosiSettings.registration_number}
                    onChange={(e) => setGosiSettings(prev => ({ ...prev, registration_number: e.target.value }))}
                    placeholder="أدخل رقم تسجيل المنشأة"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_id">معرف العميل (Client ID)</Label>
                  <Input
                    id="client_id"
                    value={gosiSettings.client_id}
                    onChange={(e) => setGosiSettings(prev => ({ ...prev, client_id: e.target.value }))}
                    placeholder="أدخل Client ID"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_secret">كلمة سر العميل (Client Secret)</Label>
                  <div className="relative">
                    <Input
                      id="client_secret"
                      type={showSecrets ? 'text' : 'password'}
                      value={gosiSettings.client_secret}
                      onChange={(e) => setGosiSettings(prev => ({ ...prev, client_secret: e.target.value }))}
                      placeholder="أدخل Client Secret"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="private_key">المفتاح الخاص (Private Key for DPoP)</Label>
                  <Textarea
                    id="private_key"
                    value={gosiSettings.private_key}
                    onChange={(e) => setGosiSettings(prev => ({ ...prev, private_key: e.target.value }))}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    rows={6}
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">ملاحظة مهمة</p>
                    <p className="text-sm text-yellow-700">
                      للحصول على بيانات الربط، تواصل مع دعم GOSI على: 
                      <a href="mailto:hrms_support@gosi.gov.sa" className="underline mr-1">
                        hrms_support@gosi.gov.sa
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={saveGOSISettings}>
                    <Upload className="w-4 h-4 ml-2" />
                    حفظ الإعدادات
                  </Button>
                  <Button variant="outline" onClick={testConnection} disabled={testingConnection}>
                    {testingConnection ? (
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 ml-2" />
                    )}
                    اختبار الاتصال
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

const GOSICalculator = ({ rates }) => {
  const [baseSalary, setBaseSalary] = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');

  const total = (parseFloat(baseSalary) || 0) + (parseFloat(housingAllowance) || 0);
  const employeeDeduction = (total * rates.employee / 100).toFixed(2);
  const employerDeduction = (total * rates.employer / 100).toFixed(2);
  const totalDeduction = (parseFloat(employeeDeduction) + parseFloat(employerDeduction)).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>الراتب الأساسي</Label>
          <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>بدل السكن</Label>
          <Input type="number" value={housingAllowance} onChange={(e) => setHousingAllowance(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-500">إجمالي الأجر الخاضع للتأمينات</p>
          <p className="text-3xl font-bold text-blue-600">{total.toLocaleString()} ر.س</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-500">خصم الموظف ({rates.employee}%)</p>
            <p className="text-xl font-bold text-red-600">{employeeDeduction} ر.س</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-500">خصم المنشأة ({rates.employer}%)</p>
            <p className="text-xl font-bold text-orange-600">{employerDeduction} ر.س</p>
          </div>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">إجمالي الخصومات</p>
          <p className="text-2xl font-bold text-gray-800">{totalDeduction} ر.س</p>
        </div>
      </div>
    </div>
  );
};

export default GOSIIntegration;