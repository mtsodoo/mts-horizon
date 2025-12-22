
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Folder, User, File as FileIcon, FileText, Upload, Download, Trash2, Plus, 
    Loader2, ArrowRight, Palette, PenTool, FileSignature, Landmark, 
    Image as Images, Package, LayoutGrid, Calendar as CalendarIcon, 
    FileArchive, FileType 
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// --- Configuration ---
const STORAGE_API_URL = 'https://sys.mtserp.com';
const STORAGE_API_KEY = 'MTS_FILES_2025_SECRET_KEY';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for external storage

const fileTypes = [
    { value: 'design', label: 'تصميم', icon: Palette },
    { value: 'report', label: 'تقرير', icon: FileText },
    { value: 'policy', label: 'سياسة', icon: FileSignature },
    { value: 'contract', label: 'عقد', icon: Landmark },
    { value: 'photo', label: 'صورة', icon: Images },
    { value: 'other', label: 'أخرى', icon: Package },
];

const publicFolders = [
    { id: 'design', name: 'تصاميم', icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'report', name: 'تقارير', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'policy', name: 'سياسات', icon: FileSignature, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'contract', name: 'عقود', icon: Landmark, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { id: 'photo', name: 'صور', icon: Images, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
    { id: 'other', name: 'ملفات أخرى', icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

const fileIcons = {
    // Adobe Icons from CDN
    ai: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/illustrator.svg', bg: 'bg-orange-100' },
    eps: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/illustrator.svg', bg: 'bg-orange-100' },
    psd: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/photoshop.svg', bg: 'bg-blue-100' },
    indd: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/indesign.svg', bg: 'bg-pink-100' },
    xd: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/xd.svg', bg: 'bg-purple-100' },
    pdf: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/pdf.svg', bg: 'bg-red-100' },
    pr: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/premiere.svg', bg: 'bg-purple-100' },
    ae: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/aftereffects.svg', bg: 'bg-purple-100' },
    // Other file types
    zip: { type: 'lucide', icon: FileArchive, bg: 'bg-gray-100', color: 'text-gray-600' },
    rar: { type: 'lucide', icon: FileArchive, bg: 'bg-gray-100', color: 'text-gray-600' },
    txt: { type: 'lucide', icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600' },
    doc: { type: 'lucide', icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600' },
    docx: { type: 'lucide', icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600' },
    xls: { type: 'lucide', icon: FileType, bg: 'bg-green-100', color: 'text-green-600' },
    xlsx: { type: 'lucide', icon: FileType, bg: 'bg-green-100', color: 'text-green-600' },
    ppt: { type: 'lucide', icon: FileType, bg: 'bg-orange-100', color: 'text-orange-600' },
    pptx: { type: 'lucide', icon: FileType, bg: 'bg-orange-100', color: 'text-orange-600' },
    default: { type: 'lucide', icon: FileIcon, bg: 'bg-gray-100', color: 'text-gray-500' }
};

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

// --- Helper Functions ---
const getFileIconData = (file) => {
    const extension = file.original_name.split('.').pop()?.toLowerCase() || '';
    
    if (imageExtensions.includes(extension) || file.mime_type?.startsWith('image/')) {
        return { type: 'image', src: file.file_url };
    }
    
    const iconData = fileIcons[extension];
    if (iconData) {
        if (iconData.type === 'lucide') {
            return { type: 'lucide', icon: iconData.icon, bg: iconData.bg, color: iconData.color };
        }
        return { type: 'icon', src: iconData.src, bg: iconData.bg };
    }

    return { type: 'lucide', icon: fileIcons.default.icon, bg: fileIcons.default.bg, color: fileIcons.default.color };
};

const formatEmployeeName = (fullName) => {
    if (!fullName) return '';
    
    // Normalize string
    const normalized = fullName.trim();
    
    // Specific overrides based on user request
    const overrides = {
        'أميرة أحمد يحي جلي': 'أميرة أحمد',
        'الجوهرة نياف الحربي': 'الجوهرة الحربي',
        'زهراء أحمد حسين هاشم': 'زهراء أحمد',
        'ميمونة يوسف محمد الحربي': 'ميمونة الوسيدي',
        'هديل سلطان حمود العتيبي': 'هديل العتيبي'
    };

    if (overrides[normalized]) return overrides[normalized];

    // Default strategy: If name is long (more than 2 parts), show First + Last
    const parts = normalized.split(/\s+/);
    if (parts.length > 2) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    
    // Otherwise return as is (e.g., "Abdullah Omar", "Omar")
    return normalized;
};

const uploadFileToHostinger = async (file, userId, folder) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('folder', folder);

    try {
        const response = await fetch(`${STORAGE_API_URL}/upload.php`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STORAGE_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Hostinger Upload Error:", error);
        throw error;
    }
};

const deleteFileFromHostinger = async (fileUrl) => {
    try {
        const response = await fetch(`${STORAGE_API_URL}/delete.php`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STORAGE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: fileUrl })
        });

        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Hostinger Delete Error:", error);
        throw error;
    }
};

// --- Components ---

const FolderCard = ({ folder, onClick }) => (
    <Card 
        onClick={onClick}
        className={cn(
            "cursor-pointer hover:shadow-lg transition-all duration-200 group border-2",
            folder.borderColor || "border-muted"
        )}
    >
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[180px]">
            <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                folder.bgColor || "bg-secondary/20"
            )}>
                {folder.type === 'employee' ? (
                    folder.photo ? (
                        <img 
                            src={folder.photo} 
                            alt={folder.name} 
                            className="w-full h-full rounded-2xl object-cover"
                        />
                    ) : (
                        <User className="w-10 h-10 text-primary" />
                    )
                ) : (
                    <folder.icon className={cn("w-10 h-10", folder.color)} />
                )}
            </div>
            <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {folder.name}
                </h3>
                {folder.type === 'employee' && (
                    <p className="text-xs text-muted-foreground">ملفات الموظف</p>
                )}
                {folder.type === 'folder' && (
                    <p className="text-xs text-muted-foreground">مجلد عام</p>
                )}
            </div>
        </CardContent>
    </Card>
);

const FileCard = ({ file, onDelete }) => {
    const { profile } = useAuth();
    
    // Check permission to delete
    const canDelete = useMemo(() => {
        const isAdmin = ['general_manager', 'admin', 'super_admin'].includes(profile?.role);
        const isOwner = file.user_id === profile?.id;
        return isAdmin || isOwner;
    }, [profile, file]);

    const iconData = getFileIconData(file);
    const LucideIconComponent = iconData.type === 'lucide' ? iconData.icon : null;

    return (
        <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-muted/60 h-full">
            <div className={cn(
                "relative h-40 sm:h-48 flex items-center justify-center rounded-t-lg overflow-hidden group",
                iconData.type !== 'image' && (iconData.bg || 'bg-muted/30')
            )}>
                {iconData.type === 'image' && (
                    <img src={iconData.src} alt={file.original_name} className="absolute h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                )}
                {iconData.type === 'icon' && (
                    <img src={iconData.src} alt={`${file.original_name} icon`} className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                )}
                {iconData.type === 'lucide' && LucideIconComponent && (
                    <LucideIconComponent className={cn("w-12 h-12 sm:w-16 sm:h-16", iconData.color || 'text-gray-500')} />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>
            <CardContent className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-3 sm:gap-4">
                <div className="space-y-2">
                    <h4 className="font-bold truncate text-sm sm:text-base" title={file.original_name}>{file.original_name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{file.description || 'لا يوجد وصف'}</p>
                    
                    <div className="text-[10px] sm:text-xs text-muted-foreground/80 space-y-1.5 pt-2 border-t border-border/50">
                        {file.project_name && <p className="truncate flex items-center gap-1"><span className="w-14 font-medium">المشروع:</span> <span className="text-foreground">{file.project_name}</span></p>}
                        {file.delivery_date && <p className="flex items-center gap-1"><span className="w-14 font-medium">التسليم:</span> <span className="text-foreground">{format(parseISO(file.delivery_date), 'dd/MM/yyyy')}</span></p>}
                        <p className="flex items-center gap-1"><span className="w-14 font-medium">بواسطة:</span> <span className="text-foreground">{file.employee_name || 'غير معروف'}</span></p>
                        <p className="flex items-center gap-1"><span className="w-14 font-medium">التاريخ:</span> <span className="text-foreground">{format(parseISO(file.created_at), 'dd/MM/yyyy')}</span></p>
                    </div>
                </div>

                <div className="flex gap-2 mt-auto">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-2 hover:bg-primary/5 hover:text-primary text-xs sm:text-sm h-8 sm:h-9">
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" /> تحميل
                        </Button>
                    </a>
                    {canDelete && (
                        <Button variant="destructive" size="icon" onClick={() => onDelete(file)} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const UploadDialog = ({ onUploadComplete, currentFolder }) => {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState('');
    const [fileType, setFileType] = useState('other');
    const [projectName, setProjectName] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(null);

    // Set initial fileType if in a specific folder
    useEffect(() => {
        if (open && currentFolder?.type === 'folder' && fileTypes.some(ft => ft.value === currentFolder.value)) {
            setFileType(currentFolder.value);
        } else {
            setFileType('other');
        }
    }, [open, currentFolder]);

    const resetForm = () => {
        setSelectedFile(null);
        setDescription('');
        setFileType('other');
        setProjectName('');
        setDeliveryDate(null);
    };

    const handleFileSelect = (file) => {
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast({ variant: "destructive", title: "حجم الملف كبير جداً", description: `الحد الأقصى ${MAX_FILE_SIZE / 1024 / 1024}MB` });
            return;
        }
        
        setSelectedFile(file);
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile || !description) {
            toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى اختيار ملف وإدخال الوصف." });
            return;
        }

        setUploading(true);
        try {
            // 1. Upload to Hostinger API
            const uploadResponse = await uploadFileToHostinger(selectedFile, user.id, fileType);
            
            if (!uploadResponse.success && !uploadResponse.url) {
                throw new Error(uploadResponse.message || "Failed to upload to external storage");
            }

            const fileUrl = uploadResponse.url; // URL from Hostinger
            const storedName = fileUrl.split('/').pop(); // Extract filename from URL

            // 2. Save metadata to Supabase
            const { error: dbError } = await supabase.from('file_metadata').insert({
                user_id: user.id,
                folder_name: fileType,
                original_name: selectedFile.name,
                stored_name: storedName, // Storing filename for reference
                description: description,
                file_url: fileUrl,
                file_size: selectedFile.size,
                mime_type: selectedFile.type,
                project_name: projectName || null,
                delivery_date: deliveryDate,
                employee_name: profile?.name_ar,
                file_type: fileType,
                // file_path is less relevant here as it's external, but we can store relative path if needed
                file_path: storedName 
            });

            if (dbError) throw dbError;

            toast({ title: "تم الرفع بنجاح", className: "bg-green-100" });
            resetForm();
            setOpen(false);
            onUploadComplete();
        } catch (error) {
            console.error('Upload Process Error:', error);
            toast({ variant: "destructive", title: "فشل الرفع", description: error.message || "حدث خطأ أثناء الرفع" });
        } finally {
            setUploading(false);
        }
    };

    // Permission check for upload button visibility
    const canUpload = useMemo(() => {
        if (!currentFolder) return true; // Can upload generally (will need to select type)
        if (currentFolder.type === 'folder') return true; // Public folders are open
        if (currentFolder.type === 'employee') return currentFolder.value === user.id; // Only owner can upload to employee folder
        return true;
    }, [currentFolder, user]);

    if (!canUpload) return null;
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm hover:shadow-md transition-shadow"> <Plus className="h-4 w-4"/> رفع ملف جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>رفع ملف جديد (تخزين خارجي)</DialogTitle>
                    <DialogDescription>سيتم حفظ الملف على خوادم MTS الخارجية.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4" onDragEnter={handleDrag}>
                    <div className="flex flex-col gap-4">
                        <Label>الملف *</Label>
                        <div
                            className={cn("border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer h-full flex flex-col items-center justify-center", dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50')}
                            onClick={() => document.getElementById('file-upload-input')?.click()}
                            onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        >
                            <input id="file-upload-input" type="file" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0])} />
                            {selectedFile ? (
                                <div className="flex flex-col items-center gap-3">
                                    <FileText className="h-12 w-12 text-primary" />
                                    <div className="text-center">
                                        <p className="font-medium text-sm text-foreground truncate max-w-[200px]">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <Button variant="secondary" size="sm" className="h-8 mt-2" onClick={(e) => {e.stopPropagation(); setSelectedFile(null);}}>تغيير الملف</Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                    <div className="p-3 bg-secondary rounded-full">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">اسحب الملف هنا</p>
                                        <p className="text-xs mt-1">أو اضغط للاختيار</p>
                                    </div>
                                    <p className="text-[10px] bg-secondary/50 px-2 py-1 rounded">Max 50MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="description">الوصف *</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف موجز للملف..." className="resize-none" />
                        </div>
                        <div>
                            <Label htmlFor="fileType">نوع الملف *</Label>
                            <Select value={fileType} onValueChange={setFileType}>
                                <SelectTrigger><SelectValue placeholder="اختر نوع الملف" /></SelectTrigger>
                                <SelectContent>
                                    {fileTypes.map(ft => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="projectName">اسم المشروع</Label>
                            <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="اسم المشروع (اختياري)" />
                        </div>
                        <div>
                            <Label htmlFor="deliveryDate">تاريخ التسليم</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")}>
                                        <CalendarIcon className="ml-2 h-4 w-4" />
                                        {deliveryDate ? format(deliveryDate, 'PPP', { locale: ar }) : <span>اختر تاريخ</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                    <Button onClick={handleUpload} disabled={uploading}>
                        {uploading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {uploading ? 'جاري الرفع...' : 'رفع وتأكيد'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page Component ---
const FilesPage = () => {
    const [viewMode, setViewMode] = useState('root'); // 'root' | 'files'
    const [selectedFolder, setSelectedFolder] = useState(null); // { type, value, name }
    const [employees, setEmployees] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Fetch employees for folder list
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, name_ar, employee_photo_url, role')
                    .eq('is_active', true)
                    .neq('role', 'general_manager')
                    .neq('role', 'ai_manager')
                    .order('name_ar');
                
                if (error) throw error;
                setEmployees(data || []);
            } catch (error) {
                console.error('Error fetching employees:', error);
            }
        };
        fetchEmployees();
    }, []);

    // Fetch files when folder is selected
    const fetchFiles = async () => {
        if (!selectedFolder) {
            setFiles([]);
            return;
        }

        setLoading(true);
        try {
            let query = supabase.from('file_metadata').select('*').order('created_at', { ascending: false });

            if (selectedFolder.type === 'folder') {
                query = query.eq('folder_name', selectedFolder.value);
            } else if (selectedFolder.type === 'employee') {
                query = query.eq('user_id', selectedFolder.value);
            }

            const { data, error } = await query;
            if (error) throw error;
            setFiles(data || []);
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ", description: "لم نتمكن من جلب الملفات." });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [selectedFolder]);

    const handleFolderClick = (folder) => {
        setSelectedFolder(folder);
        setViewMode('files');
    };

    const handleBack = () => {
        setSelectedFolder(null);
        setViewMode('root');
    };

    const handleDelete = async (file) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا الملف؟ سيتم حذفه من الخوادم الخارجية وقاعدة البيانات.")) return;
        
        try {
            // 1. Delete from Hostinger
            await deleteFileFromHostinger(file.file_url);

            // 2. Delete from Supabase Metadata
            const { error: dbError } = await supabase.from('file_metadata').delete().eq('id', file.id);
            if (dbError) throw dbError;

            toast({ title: "تم الحذف بنجاح" });
            
            // Refresh files locally
            setFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (error) {
            console.error("Delete Error:", error);
            toast({ variant: "destructive", title: "فشل الحذف", description: error.message || "حدث خطأ أثناء الحذف" });
        }
    };
    
    // Combined Folders List
    const allFolders = useMemo(() => [
        ...publicFolders.map(f => ({ ...f, type: 'folder', value: f.id })),
        ...employees.map(e => ({ 
            id: e.id, 
            name: formatEmployeeName(e.name_ar), // Using the new helper function
            type: 'employee', 
            value: e.id, 
            photo: e.employee_photo_url,
            borderColor: 'border-gray-200'
        }))
    ], [employees]);

    return (
        <>
            <Helmet><title>إدارة الملفات (المتقدمة) | نظام ERP</title></Helmet>
            <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 gap-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                    <div className="flex items-center gap-4">
                        {viewMode === 'files' && (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full hover:bg-secondary">
                                <ArrowRight className="h-6 w-6" />
                            </Button>
                        )}
                        <PageTitle 
                            title={viewMode === 'root' ? "المجلدات والملفات (MTS Cloud)" : selectedFolder?.name} 
                            description={viewMode === 'root' ? "تصفح الملفات المخزنة على خوادم MTS" : "استعراض الملفات داخل هذا المجلد"} 
                        />
                    </div>
                    <UploadDialog 
                        onUploadComplete={() => {
                            if (viewMode === 'files') fetchFiles();
                        }} 
                        currentFolder={selectedFolder}
                    />
                </div>

                <div className="flex-1 min-h-0">
                    {viewMode === 'root' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {allFolders.map((folder) => (
                                <FolderCard 
                                    key={`${folder.type}-${folder.id}`} 
                                    folder={folder} 
                                    onClick={() => handleFolderClick(folder)} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full">
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                    {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
                                </div>
                            ) : files.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-muted p-12">
                                    <div className="p-6 bg-background rounded-full shadow-sm mb-4">
                                        <LayoutGrid className="h-16 w-16 opacity-20 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">المجلد فارغ</h3>
                                    <p className="max-w-md mx-auto mt-2">لا توجد ملفات في هذا المجلد حالياً. يمكنك رفع ملفات جديدة باستخدام الزر في الأعلى.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-8">
                                    <AnimatePresence mode='popLayout'>
                                        {files.map(file => (
                                            <motion.div 
                                                key={file.id} 
                                                layout 
                                                initial={{ opacity: 0, scale: 0.9 }} 
                                                animate={{ opacity: 1, scale: 1 }} 
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.2 }}
                                                className="h-full"
                                            >
                                                <FileCard file={file} onDelete={handleDelete} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FilesPage;
