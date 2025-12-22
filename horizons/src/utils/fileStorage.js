// src/utils/fileStorage.js
import { supabase } from '@/lib/supabaseClient';

/**
 * رفع ملف إلى employee-documents وحفظه في file_metadata
 */
export const uploadFile = async (file, options = {}) => {
  const {
    folder = 'other',
    projectId = null,
    taskId = null,
    notes = '',
  } = options;

  // 1. الحصول على المستخدم الحالي
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  // 2. تجهيز اسم الملف والمسار
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
  const storedName = `${timestamp}-${sanitizedName}`;
  const filePath = `${folder}/${storedName}`;

  // 3. رفع الملف إلى Storage
  const { error: uploadError } = await supabase.storage
    .from('employee-documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 4. الحصول على الرابط العام
  const { data: urlData } = supabase.storage
    .from('employee-documents')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

  // 5. حفظ الملف في file_metadata
  const { data, error: insertError } = await supabase
    .from('file_metadata')
    .insert({
      user_id: user.id,
      folder_name: folder,
      original_name: file.name,
      stored_name: storedName,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      file_url: urlData.publicUrl,
      project_id: projectId,
      task_id: taskId,
      notes: notes || null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return data;
};

/**
 * جلب قائمة الملفات مع خيارات تصفية متعددة
 */
export const listFiles = async (options = {}) => {
  const {
    folder = null,
    projectId = null,
    taskId = null,
  } = options;

  let query = supabase
    .from('file_metadata')
    .select('*')
    .order('created_at', { ascending: false });

  if (folder) {
    query = query.eq('folder_name', folder);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (taskId) {
    query = query.eq('task_id', taskId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
};

/**
 * حذف ملف من Storage و file_metadata
 */
export const deleteFile = async (fileId, filePath) => {
  // 1. حذف من file_metadata
  const { error: dbError } = await supabase
    .from('file_metadata')
    .delete()
    .eq('id', fileId);

  if (dbError) throw dbError;

  // 2. حذف من Storage
  const { error: storageError } = await supabase.storage
    .from('employee-documents')
    .remove([filePath]);

  if (storageError) throw storageError;

  return true;
};

/**
 * تحميل ملف من Storage
 */
export const downloadFile = async (filePath, originalName) => {
  try {
    const { data, error } = await supabase.storage
      .from('employee-documents')
      .download(filePath);

    if (error) throw error;

    // إنشاء رابط تحميل مؤقت
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName || filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    
    // تنظيف
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

/**
 * الحصول على رابط عام للملف
 */
export const getFileUrl = (filePath) => {
  const { data } = supabase.storage
    .from('employee-documents')
    .getPublicUrl(filePath);
  
  return data?.publicUrl || null;
};