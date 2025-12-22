import { supabase } from '@/lib/customSupabaseClient';
import { utils, writeFile } from 'xlsx';

export const projectExpenseTypes = { materials: 'مواد', labor: 'عمالة', equipment: 'معدات', transportation: 'نقل', services: 'خدمات', administrative: 'إدارية', other: 'أخرى' };
export const projectPaymentMethods = { cash: 'نقدي', bank_transfer: 'تحويل بنكي', check: 'شيك', credit_card: 'بطاقة ائتمان', other: 'أخرى' };

/**
 * Fetches expenses for a specific project
 * @param {string} projectId - The ID of the project
 * @returns {Promise<Array>} Array of expense objects
 */
export const fetchProjectExpenses = async (projectId) => {
  try {
    const { data, error } = await supabase
      .from('project_expenses')
      .select(`
        *,
        created_by_profile:created_by(id, name_ar, name_en, employee_number),
        approved_by_profile:approved_by(id, name_ar, name_en)
      `)
      .eq('project_id', projectId)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching project expenses:', error);
    throw error;
  }
};

/**
 * Adds a new expense to a project
 * @param {Object} expenseData - The expense data object
 * @returns {Promise<Object>} The created expense
 */
export const addProjectExpense = async (expenseData) => {
  try {
    const { data, error } = await supabase
      .from('project_expenses')
      .insert([expenseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding project expense:', error);
    throw error;
  }
};

/**
 * Updates an existing project expense
 * @param {string} expenseId - The ID of the expense to update
 * @param {Object} updates - The data to update
 * @returns {Promise<Object>} The updated expense
 */
export const updateProjectExpense = async (expenseId, updates) => {
  try {
    const { data, error } = await supabase
      .from('project_expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating project expense:', error);
    throw error;
  }
};

/**
 * Deletes a project expense
 * @param {string} expenseId - The ID of the expense to delete
 * @returns {Promise<void>}
 */
export const deleteProjectExpense = async (expenseId) => {
  try {
    const { error } = await supabase
      .from('project_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting project expense:', error);
    throw error;
  }
};

/**
 * Approves a project expense
 * @param {string} expenseId - The ID of the expense to approve
 * @param {string} approverId - The ID of the user approving the expense
 * @returns {Promise<Object>} The updated expense
 */
export const approveProjectExpense = async (expenseId, approverId) => {
  try {
    const { data, error } = await supabase
      .from('project_expenses')
      .update({
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        payment_status: 'approved' // Or whatever status logic fits your flow
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error approving project expense:', error);
    throw error;
  }
};

/**
 * Calculates financial summary for a project
 * @param {number} budget - Total project budget
 * @param {Array} expenses - List of project expenses
 * @returns {Object} Summary object with totalSpent, remainingBudget, burnRate
 */
export const calculateProjectFinancials = (budget, expenses) => {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const remainingBudget = Number(budget || 0) - totalSpent;
  const burnPercentage = Number(budget) > 0 ? (totalSpent / Number(budget)) * 100 : 0;

  return {
    totalSpent,
    remainingBudget,
    burnPercentage: Math.min(burnPercentage, 100).toFixed(1)
  };
};

/**
 * Groups expenses by category
 * @param {Array} expenses - List of expenses
 * @returns {Object} Expenses grouped by category with totals
 */
export const groupExpensesByCategory = (expenses) => {
  const groups = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { count: 0, total: 0, items: [] };
    }
    acc[category].count += 1;
    acc[category].total += Number(expense.amount || 0);
    acc[category].items.push(expense);
    return acc;
  }, {});

  return Object.entries(groups).map(([category, data]) => ({
    name: category,
    value: data.total,
    count: data.count,
    items: data.items
  })).sort((a, b) => b.value - a.value); // Sort by highest spend
};

/**
 * Formats currency
 * @param {number} amount 
 * @param {string} currency - Default SAR
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'SAR') => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Exports project expenses to Excel
 * @param {Array} expenses - List of expenses
 * @param {string} projectName - Name of the project
 */
export const exportExpensesToExcel = (expenses, projectName) => {
  const data = expenses.map(expense => ({
    'التاريخ': new Date(expense.expense_date).toLocaleDateString('ar-SA'),
    'الوصف': expense.description,
    'التصنيف': expense.category,
    'المبلغ': Number(expense.amount),
    'نوع المصروف': expense.expense_type,
    'طريقة الدفع': expense.payment_method,
    'الحالة': expense.payment_status,
    'المورد': expense.supplier_name || '-',
    'ملاحظات': expense.notes || '-'
  }));

  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Expenses");
  
  // RTL setting for Arabic content
  if(!wb.Workbook) wb.Workbook = {};
  if(!wb.Workbook.Views) wb.Workbook.Views = [];
  if(!wb.Workbook.Views[0]) wb.Workbook.Views[0] = {};
  wb.Workbook.Views[0].RTL = true;

  writeFile(wb, `${projectName}_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
};