import { toast } from "@/components/ui/use-toast";

/**
 * Handles Supabase errors and displays appropriate toast notifications.
 * @param {object} error - The Supabase error object.
 * @param {string} [contextMessage="حدث خطأ"] - A custom message to provide context for the error.
 */
export const handleSupabaseError = (error, contextMessage = "An error occurred") => {
  console.error(contextMessage, error);

  let title = "خطأ غير متوقع";
  let description = "حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقًا.";

  if (!error) {
    toast({
      variant: "destructive",
      title,
      description,
    });
    return;
  }

  // Handle specific Supabase Storage errors
  if (error.message === "Bucket not found") {
      title = "خطأ في التخزين";
      description = "لم يتم العثور على حاوية الملفات المطلوبة. يرجى الاتصال بالدعم الفني.";
  }
  // Handle JWT/Auth token errors - Don't redirect, let auth context handle it
  else if (error.message.includes("JWT") || error.message.includes("token") || error.code === '401' || error.message.includes("Auth session")) {
    console.warn("Auth error detected, session may need refresh:", error.message);
    return; 
  } 
  // Handle Permission Denied errors
  else if (error.code === '42501' || error.message.includes('permission denied')) {
    title = "وصول مرفوض";
    description = "ليس لديك الصلاحية لتنفيذ هذا الإجراء.";
  } 
  // Handle Table/View not found errors
  else if (error.code === '42P01') {
    title = "خطأ في النظام";
    description = "خطأ في تكوين قاعدة البيانات. يرجى الاتصال بالدعم الفني.";
  }
  // Handle uniqueness violation
  else if (error.code === '23505') {
    title = "بيانات مكررة";
    description = "أحد الحقول المدخلة موجود بالفعل. يرجى استخدام قيمة مختلفة.";
  }
  // Handle foreign key violation
  else if (error.code === '23503') {
    title = "خطأ في البيانات المترابطة";
    description = "لا يمكن حذف هذا السجل لأنه مرتبط ببيانات أخرى في النظام. قد يتطلب حل هذه المشكلة تدخلاً من مسؤول النظام.";
  }
  // Handle network errors
  else if (error.message.toLowerCase().includes('network request failed')) {
      title = "خطأ في الشبكة";
      description = "فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.";
  }
  // Use the error message from Supabase if available
  else if (error.message) {
    title = contextMessage || "حدث خطأ";
    description = error.message;
  }

  toast({
    variant: "destructive",
    title: title,
    description: description,
  });
};