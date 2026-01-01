import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, User, File as FileIcon, FileText, Upload, Download, Trash2, Loader2, ArrowRight, Palette, FileSignature, Landmark, Image as Images, Package, LayoutGrid, Calendar as CalendarIcon, FileArchive, FileType, Receipt, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
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

const STORAGE_API_URL = 'https://sys.mtserp.com';
const STORAGE_API_KEY = 'MTS_FILES_2025_SECRET_KEY';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const fileTypes = [
  { value: 'design', label: 'تصميم', icon: Palette },
  { value: 'report', label: 'تقرير', icon: FileText },
  { value: 'policy', label: 'سياسة', icon: FileSignature },
  { value: 'contract', label: 'عقد', icon: Landmark },
  { value: 'photo', label: 'صورة', icon: Images },
  { value: 'custody_receipts', label: 'فاتورة عهدة', icon: Receipt },
  { value: 'other', label: 'أخرى', icon: Package },
];

const publicFolders = [
  { id: 'government-docs', name: 'مستندات حكومية', icon: Landmark, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  { id: 'design', name: 'تصاميم', icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'report', name: 'تقارير', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'policy', name: 'سياسات', icon: FileSignature, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { id: 'contract', name: 'عقود', icon: Landmark, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { id: 'photo', name: 'صور', icon: Images, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  { id: 'custody_receipts', name: 'فواتير العهد والتسويات', icon: Receipt, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'projects', name: 'ملفات المشاريع', icon: Folder, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  { id: 'other', name: 'ملفات أخرى', icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

const fileIcons = {
  ai: { 
    src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHJ4PSI4IiBmaWxsPSIjMzMwMDAwIi8+PHRleHQgeD0iNDgiIHk9IjYyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjRkY5QTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BaTwvdGV4dD48L3N2Zz4=', 
    bg: 'bg-orange-100' 
  },
  eps: { 
    src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHJ4PSI4IiBmaWxsPSIjMzMwMDAwIi8+PHRleHQgeD0iNDgiIHk9IjYyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjRkY5QTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BaTwvdGV4dD48L3N2Zz4=', 
    bg: 'bg-orange-100' 
  },
  psd: { 
    src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHJ4PSI4IiBmaWxsPSIjMDAxRTM2Ii8+PHRleHQgeD0iNDgiIHk9IjYyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMzFBOEZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QczwvdGV4dD48L3N2Zz4=', 
    bg: 'bg-blue-100' 
  },
  pdf: { src: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme/icons/pdf.svg', bg: 'bg-red-100' },
  zip: { type: 'lucide', icon: FileArchive, bg: 'bg-gray-100', color: 'text-gray-600' },
  doc: { type: 'lucide', icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600' },
  docx: { type: 'lucide', icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600' },
  xls: { type: 'lucide', icon: FileType, bg: 'bg-green-100', color: 'text-green-600' },
  xlsx: { type: 'lucide', icon: FileType, bg: 'bg-green-100', color: 'text-green-600' },
  default: { type: 'lucide', icon: FileIcon, bg: 'bg-gray-100', color: 'text-gray-500' }
};

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

const getFileIconData = (file) => {
  const ext = file.original_name.split('.').pop()?.toLowerCase() || '';
  if (imageExtensions.includes(ext) || file.mime_type?.startsWith('image/')) return { type: 'image', src: file.file_url };
  const iconData = fileIcons[ext] || fileIcons.default;
  if (iconData.type === 'lucide') return { type: 'lucide', icon: iconData.icon, bg: iconData.bg, color: iconData.color };
  return { type: 'icon', src: iconData.src, bg: iconData.bg };
};

const formatEmployeeName = (fullName) => {
  if (!fullName) return '';
  const overrides = { 'أميرة أحمد يحي جلي': 'أميرة أحمد', 'الجوهرة نياف الحربي': 'الجوهرة الحربي', 'زهراء أحمد حسين هاشم': 'زهراء أحمد', 'ميمونة يوسف محمد الحربي': 'ميمونة الوسيدي', 'هديل سلطان حمود العتيبي': 'هديل العتيبي' };
  if (overrides[fullName.trim()]) return overrides[fullName.trim()];
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : fullName;
};

const uploadFileToHostinger = async (file, userId, folder) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  formData.append('folder', folder);
  const response = await fetch(`${STORAGE_API_URL}/upload.php`, { method: 'POST', headers: { 'Authorization': `Bearer ${STORAGE_API_KEY}` }, body: formData });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const deleteFileFromHostinger = async (fileUrl) => {
  const response = await fetch(`${STORAGE_API_URL}/delete.php`, { method: 'POST', headers: { 'Authorization': `Bearer ${STORAGE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: fileUrl }) });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const FolderCard = ({ folder, onClick }) => (
  <Card onClick={onClick} className={cn("cursor-pointer hover:shadow-lg transition-all duration-200 group border-2", folder.borderColor || "border-muted")}>
    <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-3">
      {folder.photo ? (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-background shadow-lg group-hover:scale-105 transition-transform">
          <img src={folder.photo} alt={folder.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={cn("w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105", folder.bgColor || "bg-muted")}>
          {folder.icon && <folder.icon className={cn("h-7 w-7 sm:h-8 sm:w-8", folder.color || "text-primary")} />}
        </div>
      )}
      <h3 className="font-bold text-sm sm:text-base text-foreground truncate max-w-full">{folder.name}</h3>
    </CardContent>
  </Card>
);

const FileCard = ({ file, onDelete }) => {
  const iconData = getFileIconData(file);
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full group border-2 hover:border-primary/50">
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {iconData.type === 'image' ? <img src={iconData.src} alt={file.original_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : iconData.type === 'icon' ? <div className={cn("p-6 rounded-2xl", iconData.bg)}><img src={iconData.src} alt="file icon" className="w-16 h-16 sm:w-20 sm:h-20" /></div> : <div className={cn("p-6 rounded-2xl", iconData.bg)}><iconData.icon className={cn("w-16 h-16 sm:w-20 sm:h-20", iconData.color)} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.open(file.file_url, '_blank')} className="text-xs"><Download className="w-4 h-4 ml-1" /> تحميل</Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(file)} className="text-xs"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
        </div>
      </div>
      <CardContent className="p-3 flex-grow flex flex-col">
        <p className="font-semibold text-sm truncate" title={file.original_name}>{file.original_name}</p>
        {file.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{file.notes}</p>}
        <div className="mt-auto pt-2"><p className="text-[10px] text-muted-foreground">{format(parseISO(file.created_at), 'dd MMM yyyy', { locale: ar })}</p></div>
      </CardContent>
    </Card>
  );
};

const UploadDialog = ({ onUploadComplete, currentFolder }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('other');
  const [notes, setNotes] = useState('');
  const [expiryDate, setExpiryDate] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const folderName = currentFolder?.type === 'folder' ? currentFolder.value : fileType;
      const targetUserId = currentFolder?.type === 'employee' ? currentFolder.value : user.id;
      const result = await uploadFileToHostinger(file, targetUserId, folderName);
      if (!result.success) throw new Error(result.message || 'فشل الرفع');
      await supabase.from('file_metadata').insert({ user_id: targetUserId, folder_name: folderName, original_name: file.name, stored_name: result.stored_name, file_path: result.file_path, file_size: file.size, mime_type: file.type, file_url: result.url, notes: notes || null, expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null });
      toast({ title: 'تم الرفع بنجاح' });
      setIsOpen(false);
      setFile(null);
      setNotes('');
      setExpiryDate(null);
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل الرفع', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button className="gap-2 shadow-md"><Upload className="w-4 h-4" /> رفع ملف جديد</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>رفع ملف جديد</DialogTitle><DialogDescription>{currentFolder ? `سيتم الرفع إلى: ${currentFolder.name}` : 'اختر الملف والنوع'}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>الملف</Label><Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= MAX_FILE_SIZE) setFile(f); else toast({ variant: 'destructive', title: 'خطأ', description: 'حجم الملف أكبر من 50MB' }); }} />{file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}</div>
          {!currentFolder && <div className="space-y-2"><Label>نوع الملف</Label><Select value={fileType} onValueChange={setFileType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fileTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-2"><Label>ملاحظات (اختياري)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أضف وصفاً للملف..." /></div>
          <div className="space-y-2"><Label>تاريخ انتهاء الصلاحية (اختياري)</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-right", !expiryDate && "text-muted-foreground")}><CalendarIcon className="ml-2 h-4 w-4" />{expiryDate ? format(expiryDate, 'PPP', { locale: ar }) : 'اختر تاريخ'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} /></PopoverContent></Popover></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button><Button onClick={handleUpload} disabled={!file || uploading}>{uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}{uploading ? 'جاري الرفع...' : 'رفع'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FilesPage = () => {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState('root');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowedFolders, setAllowedFolders] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        const { data: empData } = await supabase.from('profiles').select('id, name_ar, employee_photo_url, role').eq('is_active', true).neq('role', 'general_manager').neq('role', 'ai_manager').order('name_ar');
        setEmployees(empData || []);
        if (['general_manager', 'super_admin', 'admin'].includes(profile.role)) {
          setAllowedFolders(['ALL']);
        } else {
          const { data: permData } = await supabase.from('folder_permissions').select('folder_key').eq('role', profile.role).eq('can_view', true);
          setAllowedFolders((permData || []).map(p => p.folder_key));
        }
      } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
    };
    fetchData();
  }, [profile]);

  const fetchFiles = async () => {
    if (!selectedFolder) { setFiles([]); return; }
    setLoading(true);
    try {
      let query = supabase.from('file_metadata').select('*').order('created_at', { ascending: false });
      if (selectedFolder.type === 'folder') query = query.eq('folder_name', selectedFolder.value);
      else if (selectedFolder.type === 'employee') query = query.eq('user_id', selectedFolder.value);
      const { data, error } = await query;
      if (error) throw error;
      setFiles(data || []);
    } catch (error) { toast({ variant: "destructive", title: "خطأ", description: "لم نتمكن من جلب الملفات." }); } finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, [selectedFolder]);

  const handleDelete = async (file) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الملف؟")) return;
    try {
      await deleteFileFromHostinger(file.file_url);
      await supabase.from('file_metadata').delete().eq('id', file.id);
      toast({ title: "تم الحذف بنجاح" });
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error) { toast({ variant: "destructive", title: "فشل الحذف", description: error.message }); }
  };

  const allFolders = useMemo(() => {
    const canViewAll = allowedFolders.includes('ALL');
    const filteredPublic = publicFolders.filter(f => canViewAll || allowedFolders.includes(f.id)).map(f => ({ ...f, type: 'folder', value: f.id }));
    const filteredEmployees = employees.filter(e => canViewAll || allowedFolders.includes(e.id)).map(e => ({ id: e.id, name: formatEmployeeName(e.name_ar), type: 'employee', value: e.id, photo: e.employee_photo_url, borderColor: 'border-gray-200' }));
    return [...filteredPublic, ...filteredEmployees];
  }, [employees, allowedFolders]);

  const canUpload = ['general_manager', 'admin', 'super_admin', 'operations_manager'].includes(profile?.role);

  if (loading && viewMode === 'root') return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>إدارة الملفات | MTS</title></Helmet>
      <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            {viewMode === 'files' && <Button variant="ghost" size="icon" onClick={() => { setSelectedFolder(null); setViewMode('root'); }} className="rounded-full hover:bg-secondary"><ArrowRight className="h-6 w-6" /></Button>}
            <PageTitle title={viewMode === 'root' ? "المجلدات والملفات" : selectedFolder?.name} description={viewMode === 'root' ? "تصفح الملفات المخزنة على خوادم MTS" : "استعراض الملفات داخل هذا المجلد"} />
          </div>
          {canUpload && <UploadDialog onUploadComplete={() => { if (viewMode === 'files') fetchFiles(); }} currentFolder={selectedFolder} />}
        </div>
        <div className="flex-1 min-h-0">
          {viewMode === 'root' ? (
            allFolders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-muted p-12">
                <div className="p-6 bg-background rounded-full shadow-sm mb-4"><EyeOff className="h-16 w-16 opacity-20 text-primary" /></div>
                <h3 className="text-xl font-bold text-foreground">لا يوجد مجلدات متاحة</h3>
                <p className="max-w-md mx-auto mt-2">ليس لديك صلاحية للوصول لأي مجلدات حالياً. تواصل مع المدير العام.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {allFolders.map((folder) => <FolderCard key={`${folder.type}-${folder.id}`} folder={folder} onClick={() => { setSelectedFolder(folder); setViewMode('files'); }} />)}
              </div>
            )
          ) : (
            <div className="h-full">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
              ) : files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-muted p-12">
                  <div className="p-6 bg-background rounded-full shadow-sm mb-4"><LayoutGrid className="h-16 w-16 opacity-20 text-primary" /></div>
                  <h3 className="text-xl font-bold text-foreground">المجلد فارغ</h3>
                  <p className="max-w-md mx-auto mt-2">لا توجد ملفات في هذا المجلد حالياً. يمكنك رفع ملفات جديدة باستخدام الزر في الأعلى.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-8">
                  <AnimatePresence mode='popLayout'>
                    {files.map(file => <motion.div key={file.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="h-full"><FileCard file={file} onDelete={handleDelete} /></motion.div>)}
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