import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';

const FileUpload = ({ bucket, folder = '', onUploadComplete, acceptedFileTypes, maxFileSize = 5 * 1024 * 1024 }) => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const uploadedFile = acceptedFiles[0];
        setFile(uploadedFile);
        setUploading(true);
        setUploadError(null);
        setProgress(0);

        const fileExtension = uploadedFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, uploadedFile, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            handleSupabaseError(error, 'File upload failed');
            setUploadError(error.message);
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        
        setFileUrl(publicUrl);
        setUploading(false);
        toast({
            title: 'Success',
            description: 'File uploaded successfully.',
        });
        
        if (onUploadComplete) {
            onUploadComplete({
                url: publicUrl,
                path: filePath,
                name: uploadedFile.name,
                type: uploadedFile.type,
                size: uploadedFile.size,
            });
        }
    }, [bucket, folder, onUploadComplete, toast]);

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept: acceptedFileTypes,
        maxSize: maxFileSize,
        multiple: false,
    });

    const removeFile = () => {
        setFile(null);
        setFileUrl(null);
        setUploadError(null);
        setProgress(0);
        if (onUploadComplete) {
            onUploadComplete(null);
        }
    };
    
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full">
            {!file ? (
                <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}`}>
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Upload className="w-8 h-8" />
                        {isDragActive ? (
                            <p>أفلت الملف هنا ...</p>
                        ) : (
                            <p>اسحب وأفلت الملف هنا، أو انقر للتحديد</p>
                        )}
                        <p className="text-xs">
                            {acceptedFileTypes ? `${Object.values(acceptedFileTypes).flat().join(', ')} ` : ''}
                            (بحد أقصى {formatBytes(maxFileSize)})
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-4 border rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <File className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="flex-grow overflow-hidden">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {uploading && (
                <div className="mt-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-center mt-1">{progress}%</p>
                </div>
            )}
            
            {uploadError && (
                 <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm font-medium">خطأ في الرفع: {uploadError}</p>
                </div>
            )}

            {fileRejections.length > 0 && (
                <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
                    <p className="text-sm font-bold mb-1">تم رفض الملفات التالية:</p>
                    <ul>
                    {fileRejections.map(({ file, errors }) => (
                        <li key={file.path} className="text-sm">
                            {file.path} - {errors.map(e => e.message).join(', ')}
                        </li>
                    ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FileUpload;