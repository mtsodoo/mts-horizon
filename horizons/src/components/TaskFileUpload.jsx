import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { formatFileSize } from '@/utils/taskUtils';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILES = 20;
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const TaskFileUpload = ({ 
    taskId,
    projectId,           // 🔥 جديد - مطلوب في deferred mode
    onUploadComplete,
    mode = 'immediate',
    onFilesChange
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [notes, setNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFilesChange = useCallback((data) => {
        if (mode === 'deferred' && onFilesChange) {
            onFilesChange(data);
        }
    }, [mode, onFilesChange]);

    useEffect(() => {
        handleFilesChange({ files: filesToUpload, notes });
    }, [filesToUpload, notes, handleFilesChange]);

    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        if (filesToUpload.length + acceptedFiles.length > MAX_FILES) {
            toast({ variant: 'destructive', title: 'خطأ', description: `لا يمكن رفع أكثر من ${MAX_FILES} ملف.` });
            return;
        }

        const newFiles = acceptedFiles.map(file => Object.assign(file, {
            id: uuidv4(),
            progress: 0,
            error: null,
        }));
        setFilesToUpload(prev => [...prev, ...newFiles]);

        fileRejections.forEach(({ file, errors }) => {
            errors.forEach(error => {
                let message = `فشل رفع الملف ${file.name}: `;
                if (error.code === 'file-too-large') message += `حجم الملف يتجاوز ${MAX_SIZE_MB} ميجابايت.`;
                else message += error.message;
                toast({ variant: 'destructive', title: 'خطأ', description: message });
            });
        });
    }, [filesToUpload.length, toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxSize: MAX_SIZE_BYTES,
        maxFiles: MAX_FILES,
    });

    const removeFile = (fileId) => {
        setFilesToUpload(prev => prev.filter(f => f.id !== fileId));
    };

    const handleImmediateUpload = async () => {
        if (filesToUpload.length === 0) return;
        if (!taskId) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'معرف المهمة مفقود' });
            return;
        }
        if (!projectId) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'معرف المشروع مفقود' });
            return;
        }

        setIsUploading(true);

        const uploadPromises = filesToUpload.map(async (file) => {
            const timestamp = Date.now();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
            const storedName = `${timestamp}-${sanitizedName}`;
            const filePath = `task-results/${taskId}/${storedName}`;
            
            try {
                const { error: uploadError } = await supabase.storage
                    .from('employee-documents')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('employee-documents')
                    .getPublicUrl(filePath);
                    
                if (!urlData?.publicUrl) throw new Error('Failed to get public URL.');

                const { error: dbError } = await supabase.from('file_metadata').insert({
                    user_id: user.id,
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
                });

                if (dbError) throw dbError;
                
                return { success: true };
            } catch (error) {
                console.error(`Upload failed for ${file.name}:`, error);
                setFilesToUpload(prev => prev.map(f => f.id === file.id ? { ...f, error: error.message } : f));
                return { success: false, error };
            }
        });

        await Promise.all(uploadPromises);
        
        setIsUploading(false);
        toast({ title: "نجاح", description: "اكتملت عملية رفع الملفات." });
        setFilesToUpload([]);
        setNotes('');
        if (onUploadComplete) onUploadComplete();
    };
    
    const hasFiles = filesToUpload.length > 0;

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-background">
            <div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadCloud className="w-10 h-10" />
                    <p className="font-semibold">اسحب وأفلت الملفات هنا، أو انقر للتصفح</p>
                    <p className="text-xs">الحد الأقصى {MAX_FILES} ملف، {MAX_SIZE_MB} ميجابايت لكل ملف</p>
                </div>
            </div>

            {hasFiles && (
                <div className="space-y-4">
                    <h4 className="font-semibold">الملفات المحددة ({filesToUpload.length}):</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {filesToUpload.map(file => (
                            <div key={file.id} className="p-3 border rounded-md">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileIcon className="w-6 h-6 text-primary flex-shrink-0" />
                                        <div className="truncate">
                                            <p className="font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} disabled={isUploading}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                {file.progress > 0 && <Progress value={file.progress} className="mt-2 h-2" />}
                                {file.error && <p className="text-xs text-destructive mt-1">{file.error}</p>}
                            </div>
                        ))}
                    </div>

                    <div>
                        <label htmlFor="notes" className="text-sm font-medium">ملاحظات (اختياري)</label>
                        <Textarea 
                            id="notes" 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="أضف وصفاً للملفات التي ترفعها..." 
                            className="mt-1" 
                        />
                    </div>

                    {mode === 'immediate' && (
                        <Button onClick={handleImmediateUpload} disabled={isUploading || !hasFiles} className="w-full">
                            {isUploading ? `جاري الرفع...` : `رفع ${filesToUpload.length} ملف`}
                        </Button>
                    )}

                    {mode === 'deferred' && (
                        <p className="text-sm text-muted-foreground text-center">
                            سيتم رفع الملفات عند حفظ المهمة
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskFileUpload;