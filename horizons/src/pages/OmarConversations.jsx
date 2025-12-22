
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Search,
    Filter,
    MessageSquare,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    User,
    Calendar,
    Send,
    History
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

const OmarConversations = () => {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const { toast } = useToast();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('active'); // active, all, closed
    const [searchTerm, setSearchTerm] = useState('');
    
    // Dialog state
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [managerNote, setManagerNote] = useState('');
    const [justifications, setJustifications] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Fetch conversations based on filters
    const fetchConversations = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('bot_messages')
                .select(`
                    *,
                    employee:employee_id (
                        id,
                        name_ar,
                        department,
                        employee_number
                    )
                `)
                .order('created_at', { ascending: false });

            if (filterStatus === 'active') {
                query = query.or('action_required.eq.true,reply_count.gt.0');
            } else if (filterStatus === 'closed') {
                query = query.eq('action_required', false);
            }

            const { data, error } = await query;

            if (error) throw error;
            setConversations(data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "فشل في تحميل المحادثات",
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch conversation details (justifications/replies)
    const fetchConversationDetails = async (messageId) => {
        setLoadingDetails(true);
        try {
            // Fetch associated justifications/replies using thread_id matching the message ID
            // Assuming thread_id in absence_justifications links to bot_messages.id or a common thread ID
            // For now, let's assume we link by user_id and approximate time or if there's a direct link.
            // Based on user prompt: "All employee replies (from absence_justifications where thread_id = message.id)"
            
            const { data, error } = await supabase
                .from('absence_justifications')
                .select('*')
                .eq('thread_id', messageId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setJustifications(data || []);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [filterStatus]);

    const handleOpenConversation = (conversation) => {
        setSelectedConversation(conversation);
        setManagerNote('');
        fetchConversationDetails(conversation.id);
        setIsDialogOpen(true);
    };

    const handleDecision = async (decision) => {
        if (!selectedConversation) return;

        try {
            const updates = {
                updated_at: new Date().toISOString()
            };
            
            let toastMessage = "";
            let newStatus = "";

            if (decision === 'accept') {
                // Update latest justification status
                if (justifications.length > 0) {
                    const latestJustification = justifications[justifications.length - 1];
                    await supabase
                        .from('absence_justifications')
                        .update({ 
                            status: 'approved',
                            manager_notes: managerNote,
                            reviewed_by: profile.id,
                            reviewed_at: new Date().toISOString()
                        })
                        .eq('id', latestJustification.id);
                }
                
                // Close conversation
                updates.action_required = false;
                toastMessage = "تم قبول العذر وإغلاق المحادثة";
                newStatus = "approved";

            } else if (decision === 'reject') {
                // Update latest justification status
                 if (justifications.length > 0) {
                    const latestJustification = justifications[justifications.length - 1];
                    await supabase
                        .from('absence_justifications')
                        .update({ 
                            status: 'rejected',
                            manager_notes: managerNote,
                            reviewed_by: profile.id,
                            reviewed_at: new Date().toISOString()
                        })
                        .eq('id', latestJustification.id);
                }
                
                // Maybe keep conversation open or close it? Let's close it for now as decision is made
                updates.action_required = false;
                toastMessage = "تم رفض العذر";
                newStatus = "rejected";

            } else if (decision === 'deduct') {
                // Create deduction record
                const { error: deductionError } = await supabase
                    .from('attendance_deductions')
                    .insert({
                        user_id: selectedConversation.employee_id,
                        deduction_date: new Date().toISOString(), // Or alert date
                        deduction_type: 'disciplinary',
                        violation_type: 'other',
                        amount: 0, // Should be calculated or input, for now 0 or manual entry needed later
                        notes: managerNote || 'خصم إداري من محادثة عمر',
                        created_by: profile.id
                    });
                
                if (deductionError) throw deductionError;
                
                updates.action_required = false;
                toastMessage = "تم تطبيق الخصم";
                 newStatus = "deducted";

            } else if (decision === 'close') {
                updates.action_required = false;
                toastMessage = "تم إغلاق المحادثة";
                newStatus = "closed";
            }

            // Update bot message status
            const { error: updateError } = await supabase
                .from('bot_messages')
                .update(updates)
                .eq('id', selectedConversation.id);

            if (updateError) throw updateError;

            // Send closing message from "Omar" (Manager acting as Omar) if there's a note
            if (managerNote) {
                 await supabase
                .from('bot_messages')
                .insert({
                    employee_id: selectedConversation.employee_id,
                    title: 'رد من الإدارة',
                    message: managerNote,
                    type: 'info', // or reply
                    is_read: false,
                    action_required: false,
                    thread_id: selectedConversation.id, // Creating a new message in same thread logically, or just standalone
                    created_by: profile.id
                });
            }

            toast({
                title: "تم بنجاح",
                description: toastMessage,
                variant: "default", 
                className: "bg-green-500 text-white"
            });

            setIsDialogOpen(false);
            fetchConversations(); // Refresh list

        } catch (error) {
            console.error('Error processing decision:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "حدث خطأ أثناء تنفيذ الإجراء",
            });
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchTerm) return true;
        const employeeName = conv.employee?.name_ar || '';
        return employeeName.includes(searchTerm);
    });

    const getStatusBadge = (status, actionRequired) => {
        if (actionRequired) return <Badge variant="destructive" className="animate-pulse">مطلوب إجراء</Badge>;
        return <Badge variant="secondary">مغلقة</Badge>;
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'late': return <Clock className="h-4 w-4 text-orange-500" />;
            case 'absence': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">محادثات المساعد عمر</h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة المحادثات الآلية ومراجعة تبريرات الموظفين
                    </p>
                </div>
                
                <div className="flex gap-2">
                     <div className="relative w-64">
                        <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث باسم الموظف..."
                            className="pr-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="active" onValueChange={setFilterStatus} className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-3">
                    <TabsTrigger value="active">نشطة</TabsTrigger>
                    <TabsTrigger value="closed">مغلقة</TabsTrigger>
                    <TabsTrigger value="all">الكل</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                   {/* Content Rendered Below */}
                </TabsContent>
                <TabsContent value="closed" className="mt-4">
                   {/* Content Rendered Below */}
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                   {/* Content Rendered Below */}
                </TabsContent>
            </Tabs>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredConversations.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center h-64">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground">لا توجد محادثات</h3>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            لا توجد محادثات تطابق معايير البحث الحالية
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredConversations.map((conv) => (
                        <Card key={conv.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary" onClick={() => handleOpenConversation(conv)}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {conv.employee?.name_ar?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{conv.employee?.name_ar || 'مستخدم غير معروف'}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {conv.employee?.department || 'بدون قسم'} • {format(new Date(conv.created_at), 'dd MMMM yyyy', { locale: arSA })}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {getStatusBadge(null, conv.action_required)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="bg-muted/30 p-3 rounded-lg text-sm">
                                        <div className="flex items-center gap-2 font-medium mb-1 text-primary">
                                            {getTypeIcon(conv.type)}
                                            {conv.title}
                                        </div>
                                        <p className="text-muted-foreground line-clamp-2 text-xs">
                                            {conv.message}
                                        </p>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                                        <div className="flex items-center gap-1">
                                            <History className="h-3 w-3" />
                                            <span>آخر تحديث: {format(new Date(conv.updated_at || conv.created_at), 'HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full">
                                            <MessageSquare className="h-3 w-3" />
                                            <span>{conv.reply_count || 0} ردود</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Conversation Detail Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            مراجعة المحادثة: {selectedConversation?.employee?.name_ar}
                        </DialogTitle>
                        <DialogDescription>
                            مراجعة تفاصيل التنبيه وردود الموظف واتخاذ القرار المناسب
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                        <ScrollArea className="flex-1 pr-4 -mr-4 h-[400px]">
                            <div className="space-y-6">
                                {/* Original Bot Alert */}
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                                        <img src="/lovable-uploads/omar-avatar.png" alt="Omar" className="h-full w-full object-cover rounded-full opacity-90" onError={(e) => {e.target.style.display='none'}} />
                                        <span className="text-xs font-bold">عمر</span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">المساعد عمر</span>
                                            <span className="text-xs text-muted-foreground">{selectedConversation && format(new Date(selectedConversation.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                        </div>
                                        <div className="bg-primary/5 p-3 rounded-lg rounded-tr-none text-sm border border-primary/10">
                                            <h4 className="font-semibold mb-1 flex items-center gap-2 text-primary">
                                                {selectedConversation && getTypeIcon(selectedConversation.type)}
                                                {selectedConversation?.title}
                                            </h4>
                                            <p>{selectedConversation?.message}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Responses / Justifications */}
                                {loadingDetails ? (
                                    <div className="flex justify-center py-4">
                                        <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                                    </div>
                                ) : justifications.length > 0 ? (
                                    justifications.map((justification) => (
                                        <div key={justification.id} className="flex gap-3 flex-row-reverse">
                                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shrink-0">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 space-y-1 text-left" dir="rtl">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="text-xs text-muted-foreground">{format(new Date(justification.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                                    <span className="text-sm font-semibold">{selectedConversation?.employee?.name_ar}</span>
                                                </div>
                                                <div className="bg-secondary p-3 rounded-lg rounded-tl-none text-sm text-right">
                                                    <p>{justification.reason}</p>
                                                    {justification.file_url && (
                                                        <a href={justification.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 text-blue-600 hover:underline text-xs bg-white/50 p-2 rounded">
                                                            <Filter className="h-3 w-3" />
                                                            مرفق: {justification.file_name || 'ملف'}
                                                        </a>
                                                    )}
                                                    <div className="mt-2 pt-2 border-t border-black/5 flex justify-between items-center text-xs">
                                                        <span>تاريخ الغياب: {justification.absence_date}</span>
                                                        <span className={`px-2 py-0.5 rounded-full ${
                                                            justification.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            justification.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {justification.status === 'pending' ? 'قيد المراجعة' : 
                                                             justification.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                                        لم يقم الموظف بالرد بعد
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">ملاحظات المدير / الرد (اختياري)</label>
                                <Textarea 
                                    placeholder="اكتب ردك أو سبب القرار هنا..." 
                                    className="resize-none h-20"
                                    value={managerNote}
                                    onChange={(e) => setManagerNote(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Button 
                                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                    onClick={() => handleDecision('accept')}
                                    disabled={justifications.length === 0}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    قبول العذر
                                </Button>
                                <Button 
                                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                                    onClick={() => handleDecision('reject')}
                                    disabled={justifications.length === 0}
                                >
                                    <XCircle className="h-4 w-4" />
                                    رفض العذر
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="border-orange-500 text-orange-600 hover:bg-orange-50 gap-2"
                                    onClick={() => handleDecision('deduct')}
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    تطبيق خصم
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    className="gap-2"
                                    onClick={() => handleDecision('close')}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    إغلاق المحادثة
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OmarConversations;
