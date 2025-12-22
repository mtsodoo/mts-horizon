import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Paperclip, Download, Trash2, User, Calendar, MessageSquare, Briefcase, FileText, Image as ImageIcon, FileArchive, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchTaskFiles, deleteTaskFile, getFileIcon, formatFileSize } from '@/utils/taskUtils';

const FileItem = ({ file, onDelete, isOwner, canDelete }) => {
    const { toast } = useToast();
    const FileIcon = getFileIcon(file.file_type);

    const handleDelete = async () => {
        try {
            await deleteTaskFile(file.id, file.file_url);
            toast({ title: 'نجاح', description: 'تم حذف الملف بنجاح.' });
            onDelete(file.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'خطأ', description: `فشل حذف الملف: ${error.message}` });
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="truncate">
                            <a href={file.file_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline truncate block" title={file.file_name}>
                                {file.file_name}
                            </a>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                        </a>
                        {isOwner && canDelete && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            سيتم حذف هذا الملف نهائياً من قاعدة البيانات والتخزين. لا يمكن التراجع عن هذا الإجراء.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
                {file.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t">
                        <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
                        <p className="flex-grow">{file.notes}</p>
                    </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1"><User className="w-3 h-3" /> {file.profiles?.name_ar || 'غير معروف'}</div>
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(file.created_at), 'PPP p', { locale: ar })}</div>
                </div>
            </CardContent>
        </Card>
    );
};


const TaskUploadedFiles = ({ taskId, taskStatus, onFilesChange }) => {
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFiles = useCallback(async () => {
        if (!taskId) return;
        setLoading(true);
        try {
            const fetchedFiles = await fetchTaskFiles(taskId);
            setFiles(fetchedFiles);
            onFilesChange(fetchedFiles.length);
        } catch (error) {
            console.error('Failed to fetch task files:', error);
        } finally {
            setLoading(false);
        }
    }, [taskId, onFilesChange]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleFileDelete = (deletedFileId) => {
        const updatedFiles = files.filter(f => f.id !== deletedFileId);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles.length);
    };

    if (loading) {
        return <div className="text-center p-4">جاري تحميل الملفات...</div>;
    }
    
    if (files.length === 0) {
        return (
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">لا توجد ملفات مرفوعة</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم رفع أي نتائج أو مرفقات لهذه المهمة بعد.</p>
            </div>
        );
    }
    
    const canDelete = taskStatus !== 'completed' && taskStatus !== 'cancelled';

    return (
        <div className="space-y-4">
             <h3 className="text-lg font-semibold">الملفات المرفوعة ({files.length})</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {files.map(file => (
                    <FileItem 
                        key={file.id} 
                        file={file} 
                        onDelete={handleFileDelete}
                        isOwner={file.user_id === user.id}
                        canDelete={canDelete}
                    />
                ))}
            </div>
        </div>
    );
};

export default TaskUploadedFiles;