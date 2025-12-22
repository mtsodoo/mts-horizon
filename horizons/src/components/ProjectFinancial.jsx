import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/utils/projectFinancialUtils';
import { format } from 'date-fns';
import { 
    Plus, 
    MoreHorizontal, 
    Pencil, 
    Trash2, 
    TrendingUp, 
    TrendingDown, 
    Wallet,
    FileText
} from 'lucide-react';
import AddProjectExpenseModal from '@/components/AddProjectExpenseModal';

const ProjectFinancial = ({ project }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [stats, setStats] = useState({
        totalBudget: 0,
        totalSpent: 0,
        remainingBudget: 0,
        burnRate: 0
    });

    const projectId = project?.id;

    useEffect(() => {
        if (projectId) {
            fetchExpenses();
            updateStats(project.budget, project.spent_amount);
        }
    }, [projectId]);

    const updateStats = (budget, spent) => {
        const totalBudget = parseFloat(budget) || 0;
        const totalSpent = parseFloat(spent) || 0;
        const remaining = totalBudget - totalSpent;
        const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        setStats({
            totalBudget,
            totalSpent,
            remainingBudget: remaining,
            burnRate
        });
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_expenses')
                .select(`
                    *,
                    created_by_user:created_by(name_ar)
                `)
                .eq('project_id', projectId)
                .order('expense_date', { ascending: false });

            if (error) throw error;

            setExpenses(data || []);
            
            const totalSpent = data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            updateStats(project.budget, totalSpent);

        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "فشل تحميل المصروفات",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;

        try {
            const { error } = await supabase
                .from('project_expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "تم الحذف",
                description: "تم حذف المصروف بنجاح",
            });
            fetchExpenses();

        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "فشل حذف المصروف",
            });
        }
    };

    const getBurnRateColor = (rate) => {
        if (rate >= 90) return "bg-red-500";
        if (rate >= 75) return "bg-yellow-500";
        return "bg-green-500";
    };

    return (
        <div className="space-y-6">
            <Helmet>
                <title>المالية للمشروع | {project?.name || ''}</title>
            </Helmet>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border-blue-100 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            الميزانية الكلية
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {formatCurrency(stats.totalBudget)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            المخصص للمشروع
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-white dark:from-slate-900 dark:to-slate-950 border-red-100 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            المصروفات الفعلية
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {formatCurrency(stats.totalSpent)}
                        </div>
                        <div className="flex items-center mt-2 gap-2">
                             <Progress value={stats.burnRate} className="h-2 w-full bg-red-100" indicatorClassName={getBurnRateColor(stats.burnRate)} />
                             <span className="text-xs font-medium w-12 text-right">{Math.round(stats.burnRate)}%</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white dark:from-slate-900 dark:to-slate-950 border-green-100 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            المتبقي من الميزانية
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {formatCurrency(stats.remainingBudget)}
                        </div>
                         <p className="text-xs text-muted-foreground mt-1">
                            {stats.remainingBudget < 0 ? 'تجاوز الميزانية!' : 'متاح للصرف'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>سجل المصروفات</CardTitle>
                        <CardDescription>إدارة وتتبع مصروفات المشروع</CardDescription>
                    </div>
                    <Button 
                        onClick={() => setIsAddExpenseOpen(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        تسجيل مصروف
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading && expenses.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-lg font-medium">لا توجد مصروفات مسجلة</p>
                            <p className="text-sm">ابدأ بتسجيل المصروفات لتتبع ميزانية المشروع.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">التاريخ</TableHead>
                                        <TableHead className="text-right">الوصف</TableHead>
                                        <TableHead className="text-right">النوع</TableHead>
                                        <TableHead className="text-right">بواسطة</TableHead>
                                        <TableHead className="text-left">المبلغ</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {expenses.map((expense) => (
                                            <motion.tr
                                                key={expense.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="group hover:bg-muted/50 transition-colors"
                                            >
                                                <TableCell className="font-medium">
                                                    {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{expense.description}</div>
                                                    {expense.supplier_name && (
                                                        <div className="text-xs text-muted-foreground">مورد: {expense.supplier_name}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {expense.expense_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {expense.created_by_user?.name_ar || 'غير معروف'}
                                                </TableCell>
                                                <TableCell className="text-left font-bold tabular-nums text-red-600 dark:text-red-400">
                                                    {formatCurrency(expense.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="sr-only">فتح القائمة</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDeleteExpense(expense.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="ml-2 h-4 w-4" />
                                                                حذف
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AddProjectExpenseModal
                visible={isAddExpenseOpen}
                onCancel={() => setIsAddExpenseOpen(false)}
                onSuccess={fetchExpenses}
                projectId={projectId}
            />
        </div>
    );
};

export default ProjectFinancial;