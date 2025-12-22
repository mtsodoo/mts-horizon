import React, { useEffect, useState } from 'react';
import { FileText, Download, Trash2, FileImage as FileIcon, Loader2 } from 'lucide-react';
import { listFiles, deleteFile } from '@/utils/fileStorage';
import { message, Modal } from 'antd';
import { formatFileSize, getFileIcon } from '@/utils/taskUtils';

const ProjectFilesViewer = ({ projectId, canDelete = false, onFilesChange }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Note: Assuming listFiles is updated to handle 'folder' + 'projectId' object correctly
      // based on your original snippet. If listFiles expects string, this might need adjustment,
      // but you asked not to change logic, just fix syntax.
      const data = await listFiles({
        folder: 'projects',
        projectId: projectId,
      });
      setFiles(data);
      if (onFilesChange) {
        onFilesChange(data);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('فشل تحميل الملفات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId]);

  const handleDelete = async (file) => {
    Modal.confirm({
      title: 'تأكيد الحذف',
      content: `هل تريد حذف الملف: ${file.original_name}؟`,
      okText: 'حذف',
      cancelText: 'إلغاء',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteFile(file.id, file.file_path);
          const updatedFiles = files.filter(f => f.id !== file.id);
          setFiles(updatedFiles);
          message.success('تم حذف الملف بنجاح');
          if (onFilesChange) {
            onFilesChange(updatedFiles);
          }
        } catch (error) {
          console.error('Delete error:', error);
          message.error('فشل حذف الملف');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Loader2 size={32} className="mx-auto mb-2 animate-spin" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileIcon size={48} className="mx-auto mb-2 opacity-30" />
        <p>لا توجد ملفات في هذا المشروع</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => {
        // Fallback if getFileIcon returns undefined or null
        const Icon = getFileIcon ? getFileIcon(file.mime_type) : FileText;
        
        return (
          <div
            key={file.id}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                file.task_id ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                <Icon size={20} className={
                  file.task_id ? 'text-blue-600' : 'text-gray-600'
                } />
              </div>
              
              <div className="flex-1 min-w-0">
                <p 
                  className="font-medium text-sm truncate" 
                  title={file.original_name}
                >
                  {file.original_name}
                </p>
                
                <div className="text-xs text-gray-500 mt-1 space-y-1">
                  <p>{formatFileSize ? formatFileSize(file.file_size) : file.file_size}</p>
                  <p>{new Date(file.created_at).toLocaleDateString('ar-SA')}</p>
                  {file.task_id && (
                    <p className="text-blue-600">📎 مرفق مع مهمة</p>
                  )}
                  {file.notes && (
                    <p className="text-gray-600 italic truncate" title={file.notes}>
                      "{file.notes}"
                    </p>
                  )}
              </div>
              </div>

              <div className="flex flex-col gap-1">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-blue-600 rounded transition"
                  title="تحميل"
                >
                  <Download size={16} />
                </a>
                
                {canDelete && (
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded transition"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectFilesViewer;