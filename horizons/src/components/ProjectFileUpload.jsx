// src/components/ProjectFileUpload.jsx
import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadFile } from '@/utils/fileStorage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { message } from 'antd';

const ProjectFileUpload = ({ projectId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      
      for (const file of files) {
        const result = await uploadFile(file, {
          folder: 'projects',
          projectId: projectId,
        });
        uploadedFiles.push(result);
      }

      message.success(`تم رفع ${uploadedFiles.length} ملف بنجاح`);

      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

      // إعادة تعيين input
      event.target.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      message.error('فشل رفع الملفات: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label 
        htmlFor="project-file-upload"
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>جاري الرفع...</span>
          </>
        ) : (
          <>
            <Upload size={18} />
            <span>رفع ملفات</span>
          </>
        )}
      </label>
      <input
        id="project-file-upload"
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
    </div>
  );
};

export default ProjectFileUpload;