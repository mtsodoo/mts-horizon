import { supabase } from '@/lib/supabaseClient';
import {
  Hotel,
  Car,
  UtensilsCrossed,
  Fuel,
  ShoppingCart,
  Wrench,
  Construction,
  Phone,
  Users,
  Gift,
  Printer,
  Package,
  CircleDollarSign,
  Coffee,
  FileText,
} from 'lucide-react';

export const EXPENSE_CATEGORIES = {
  hotel: { label: 'فنادق وإقامة', icon: Hotel },
  transportation: { label: 'مواصلات وتنقل', icon: Car },
  meals: { label: 'وجبات طعام', icon: UtensilsCrossed },
  fuel: { label: 'وقود', icon: Fuel },
  supplies: { label: 'مستلزمات ومشتريات', icon: ShoppingCart },
  equipment: { label: 'معدات وأجهزة', icon: Wrench },
  maintenance: { label: 'صيانة', icon: Construction },
  communications: { label: 'اتصالات', icon: Phone },
  hospitality: { label: 'ضيافة', icon: Coffee },
  gifts: { label: 'هدايا', icon: Gift },
  printing: { label: 'طباعة وتصوير', icon: Printer },
  shipping: { label: 'شحن وتوصيل', icon: Package },
  general_invoice: { label: 'فاتورة عامة', icon: FileText },
  other: { label: 'أخرى', icon: CircleDollarSign },
};

export const SETTLEMENT_STATUSES = {
  open: { text: 'مفتوحة', color: 'bg-blue-100 text-blue-800' },
  pending_review: { text: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  approved: { text: 'معتمدة', color: 'bg-green-100 text-green-800' },
  rejected: { text: 'مرفوضة', color: 'bg-red-100 text-red-800' },
  closed: { text: 'مغلقة', color: 'bg-gray-100 text-gray-800' },
};

export const EXPENSE_STATUSES = {
  pending: { text: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  approved: { text: 'معتمد', color: 'bg-green-100 text-green-800' },
  rejected: { text: 'مرفوض', color: 'bg-red-100 text-red-800' },
};

/**
 * Uploads a receipt file to Supabase storage.
 * @param {File} file - The file to upload.
 * @param {string} settlementId - The ID of the settlement the receipt belongs to.
 * @param {string} userId - The ID of the user uploading the receipt.
 * @returns {Promise<{name: string, url: string}>} - The file name and public URL of the uploaded receipt.
 */
export const uploadReceiptFile = async (file, settlementId, userId) => {
  if (!file || !settlementId || !userId) {
    throw new Error('Missing parameters for file upload.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `settlements/${userId}/${settlementId}/${fileName}`;
  
  const { error } = await supabase.storage
    .from('employee-documents')
    .upload(filePath, file);

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Failed to upload receipt: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('employee-documents')
    .getPublicUrl(filePath);

  if (!urlData.publicUrl) {
    throw new Error('Failed to get public URL for the uploaded receipt.');
  }

  return {
    name: file.name,
    url: urlData.publicUrl,
  };
};

/**
 * Formats a number as a currency string (SAR).
 * @param {number | string} amount - The amount to format.
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' && typeof amount !== 'string') return '0.00 ر.س';
  const num = Number(amount);
  if (isNaN(num)) return '0.00 ر.س';
  
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Returns a Tailwind CSS color class based on the amount (for deficit/surplus).
 * @param {number} amount - The numerical amount.
 * @returns {string} The CSS class for the color.
 */
export const getDeficitColor = (amount) => {
    const num = Number(amount);
    if (num < 0) return 'text-red-500';
    if (num > 0) return 'text-green-500';
    return 'text-gray-500';
};

/**
 * Returns a label for deficit or surplus.
 * @param {number} amount - The numerical amount.
 * @returns {string} The label (e.g., "عجز", "فائض", "متوازن").
 */
export const getDeficitLabel = (amount) => {
  const num = Number(amount);
  if (num < 0) return 'عجز';
  if (num > 0) return 'فائض';
  return 'متوازن';
};

/**
 * Returns the Arabic label for a given expense category key.
 * @param {string} categoryKey - The key of the expense category.
 * @returns {string} The Arabic label for the category.
 */
export const getCategoryLabel = (categoryKey) => {
  return EXPENSE_CATEGORIES[categoryKey]?.label || 'غير معروف';
};

/**
 * Returns the Arabic label for a given settlement status key.
 * @param {string} statusKey - The key of the settlement status.
 * @returns {string} The Arabic label for the status.
 */
export const getStatusLabel = (statusKey) => {
  return SETTLEMENT_STATUSES[statusKey]?.text || 'غير معروف';
};

/**
 * Returns the Tailwind CSS color class for a given settlement status key.
 * @param {string} statusKey - The key of the settlement status.
 * @returns {string} The Tailwind CSS color class.
 */
export const getStatusColor = (statusKey) => {
  return SETTLEMENT_STATUSES[statusKey]?.color || 'bg-gray-100 text-gray-800';
};

/**
 * Returns an array of expense category options suitable for Ant Design Select (plain objects).
 * @returns {Array<{value: string, label: string}>}
 */
export const getCategoryOptions = () => {
  return Object.entries(EXPENSE_CATEGORIES).map(([key, { label }]) => ({
    value: key,
    label: label,
  }));
};

/**
 * Returns the Lucide React icon component for a given category key.
 * @param {string} categoryKey - The key of the expense category.
 * @returns {React.Component | null} The Lucide React icon component or null if not found.
 */
export const getExpenseIcon = (categoryKey) => {
  return EXPENSE_CATEGORIES[categoryKey]?.icon || null;
};

// calculateSettlementTotals is handled by a Supabase database trigger
// as specified in the schema for custody_settlements.updated_at
// and settlement_expenses.on_settlement_expense_change.
// This ensures data consistency directly at the database level.
// Therefore, a client-side function for this is not needed and would be redundant.
export const calculateSettlementTotals = () => {
  console.warn('`calculateSettlementTotals` is handled by a database trigger and should not be called directly from the client.');
  // The actual logic for updating totals is in the `update_settlement_totals()` Supabase function.
};