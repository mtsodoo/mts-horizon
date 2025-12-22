// src/utils/taskUtils.js
import { supabase } from '@/lib/supabaseClient';
import { Briefcase, FileText, Image as ImageIcon, FileArchive, Film, Music } from 'lucide-react';

/**
 * Uploads a task file and saves record in file_metadata table
 * @param {File} file - The file to upload
 * @param {string} taskId - The task ID
 * @param {string} projectId - The project ID (required for proper file organization)
 * @param {string} userId - The user ID uploading the file
 * @param {string} notes - Optional notes about the file
 * @returns {Promise<object>} The created file_metadata record
 */
export const uploadTaskFile = async (file, taskId, projectId, userId, notes = '') => {
  if (!file || !taskId || !userId) {
    throw new Error('Missing required parameters: file, taskId, and userId are required.');
  }

  try {
    // 1. Prepare file names and path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const storedName = `${timestamp}-${sanitizedName}`;
    const filePath = `task-results/${taskId}/${storedName}`;
    
    // 2. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // 3. Get public URL
    const { data: urlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file.');
    }

    // 4. Save record in file_metadata table (Single Source of Truth)
    const { data: resultRecord, error: dbError } = await supabase
      .from('file_metadata')
      .insert({
        user_id: userId,
        folder_name: 'projects',
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

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from('employee-documents').remove([filePath]);
      throw new Error(`Failed to save file record: ${dbError.message}`);
    }

    return resultRecord;
  } catch (error) {
    console.error('uploadTaskFile error:', error);
    throw error;
  }
};

/**
 * Upload multiple task files
 * @param {Array<File>} files - Array of files to upload
 * @param {string} taskId - The task ID
 * @param {string} projectId - The project ID
 * @param {string} userId - The user ID
 * @param {string} notes - Optional notes
 * @returns {Promise<Array>} Array of uploaded file records
 */
export const uploadTaskFiles = async (files, taskId, projectId, userId, notes = '') => {
  const uploadPromises = files.map(file => 
    uploadTaskFile(file, taskId, projectId, userId, notes)
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Fetches all files associated with a specific task.
 * @param {string} taskId The UUID of the task.
 * @returns {Promise<Array>} A promise that resolves to an array of file records.
 */
export const fetchTaskFiles = async (taskId) => {
  const { data, error } = await supabase
    .from('file_metadata')
    .select(`
      *,
      profiles:user_id(name_ar)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching task files:', error);
    throw error;
  }
  return data || [];
};

/**
 * Deletes a task file from Supabase storage and its corresponding record from the database.
 * @param {string} fileId The UUID of the file record in `file_metadata`.
 * @param {string} filePath The file path in storage (e.g., "task-results/xxx/file.pdf")
 */
export const deleteTaskFile = async (fileId, filePath) => {
  // 1. Delete the database record
  const { error: dbError } = await supabase
    .from('file_metadata')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    console.error('Error deleting file record from DB:', dbError);
    throw dbError;
  }

  // 2. Delete the file from storage
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from('employee-documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      throw storageError;
    }
  } else {
    throw new Error('File path is required for deletion.');
  }
};

/**
 * Returns a Lucide icon component based on the file's MIME type.
 * @param {string} fileType The MIME type of the file.
 * @returns {React.Component} A Lucide icon component.
 */
export const getFileIcon = (fileType) => {
  if (!fileType) return FileText;
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType.startsWith('video/')) return Film;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return FileArchive;
  return Briefcase;
};

/**
 * Formats a file size in bytes into a human-readable string (KB, MB, GB).
 * @param {number} bytes The file size in bytes.
 * @returns {string} A formatted file size string.
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};