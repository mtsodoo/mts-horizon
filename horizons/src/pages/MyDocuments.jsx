
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Trash2, Download, Plus, File as FileIcon, Loader2, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

const MyDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('user_id', user.id)
        .eq('folder_name', 'personal')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        variant: "destructive",
        title: "خطأ في تحميل الملفات",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "نوع الملف غير مدعوم",
        description: "يرجى رفع ملفات بصيغة PDF, DOC, DOCX, PNG, JPG فقط."
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى لحجم الملف هو 10 ميجابايت."
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const storedName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${storedName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);

      // 3. Save Metadata
      const { error: dbError } = await supabase
        .from('file_metadata')
        .insert({
          user_id: user.id,
          folder_name: 'personal',
          original_name: selectedFile.name,
          stored_name: storedName,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          file_url: publicUrl
        });

      if (dbError) {
        // Cleanup storage if DB insert fails
        await supabase.storage.from('employee-documents').remove([filePath]);
        throw dbError;
      }

      toast({
        title: "تم الرفع بنجاح",
        description: "تمت إضافة الملف إلى ملفاتك الشخصية.",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      setSelectedFile(null);
      setIsDialogOpen(false);
      fetchFiles();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "فشل الرفع",
        description: error.message || "حدث خطأ أثناء رفع الملف"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;

    try {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('employee-documents')
        .remove([file.file_path]);

      if (storageError) {
        console.warn('Storage delete error (might be already deleted):', storageError);
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from('file_metadata')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "تم الحذف",
        description: "تم حذف الملف بنجاح.",
        className: "bg-blue-50 border-blue-200 text-blue-800"
      });

      setFiles(files.filter(f => f.id !== file.id));

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "فشل الحذف",
        description: "لم نتمكن من حذف الملف."
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType?.includes('word')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (mimeType?.includes('image')) return <FileIcon className="h-5 w-5 text-green-500" />;
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Helmet>
        <title>ملفاتي الشخصية | نظام ERP</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle title="ملفاتي الشخصية" icon={FileText} />
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              رفع ملف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>رفع مستند جديد</DialogTitle>
              <DialogDescription>
                قم برفع المستندات الشخصية الهامة. الصيغ المدعومة: PDF, Word, Images. الحد الأقصى 10MB.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div 
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}
                  ${selectedFile ? 'bg-gray-50' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-emerald-500" />
                    <span className="font-medium text-sm text-gray-900">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-2"
                    >
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload className="h-10 w-10 mb-2" />
                    <span className="font-medium text-sm">اضغط للرفع أو اسحب الملف هنا</span>
                    <span className="text-xs">PDF, Word, Images (Max 10MB)</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  'تأكيد الرفع'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            المستندات المحفوظة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
              <FileIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد ملفات محفوظة حالياً</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)} className="text-emerald-600">
                رفع أول ملف
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الملف</TableHead>
                    <TableHead className="text-center">الحجم</TableHead>
                    <TableHead className="text-center">تاريخ الرفع</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {files.map((file) => (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group hover:bg-gray-50/50"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {getFileIcon(file.mime_type)}
                            </div>
                            <span className="truncate max-w-[200px] sm:max-w-md" title={file.original_name}>
                              {file.original_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-gray-500 dir-ltr">
                          {formatFileSize(file.file_size)}
                        </TableCell>
                        <TableCell className="text-center text-gray-500">
                          {format(new Date(file.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => window.open(file.file_url, '_blank')}
                              title="تحميل"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(file)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  );
};

export default MyDocuments;
