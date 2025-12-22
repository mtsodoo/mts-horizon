import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, Plus, Search, Filter, Eye, Trash2, 
    AlertCircle, Clock, Users, X, Calendar, CheckCircle, UserCheck, XCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import PageTitle from '@/components/PageTitle';
import { formatDistanceToNow, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminMessages = () => {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [readCounts, setReadCounts] = useState({});
    const [myReadMessages, setMyReadMessages] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    
    const [employees, setEmployees] = useState([]);

    const isManager = useMemo(() => {
        const managerRoles = ['general_manager', 'admin', 'super_admin'];
        return managerRoles.includes(profile?.role);
    }, [profile]);

    const [newMessage, setNewMessage] = useState({
        title: '',
        message: '',
        priority: 'medium',
        expires_at: '',
        is_private: false,
        target_user_id: null,
        sender_name: 'الإدارة'
    });

    // ✅ دالة للتحقق إذا الرسالة منتهية
    const isMessageExpired = (message) => {
        if (!message.expires_at) return false;
        return isPast(new Date(message.expires_at));
    };

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name_ar, email')
                .eq('is_active', true)
                .order('name_ar');
            
            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    useEffect(() => {
        if (isManager) {
            fetchEmployees();
        }
    }, [isManager]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            
            let messagesData;
            
            if (isManager) {
                // ✅ المدير يشوف كل الرسائل (بدون فلتر expires_at)
                const { data, error } = await supabase
                    .from('admin_messages')
                    .select(`
                        *,
                        profiles!admin_messages_created_by_fkey(name_ar, role),
                        target_profile:profiles!admin_messages_target_user_id_fkey(name_ar)
                    `)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                messagesData = data;
            } else {
                // ✅ الموظف يشوف الرسائل العامة (بدون فلتر expires_at)
                const { data: publicMsgs, error: publicError } = await supabase
                    .from('admin_messages')
                    .select(`
                        *,
                        profiles!admin_messages_created_by_fkey(name_ar, role),
                        target_profile:profiles!admin_messages_target_user_id_fkey(name_ar)
                    `)
                    .eq('is_active', true)
                    .eq('is_private', false)
                    .order('created_at', { ascending: false });
                
                if (publicError) throw publicError;
                
                // + الرسائل الخاصة الموجهة له
                const { data: privateMsgs, error: privateError } = await supabase
                    .from('admin_messages')
                    .select(`
                        *,
                        profiles!admin_messages_created_by_fkey(name_ar, role),
                        target_profile:profiles!admin_messages_target_user_id_fkey(name_ar)
                    `)
                    .eq('is_active', true)
                    .eq('is_private', true)
                    .eq('target_user_id', user.id)
                    .order('created_at', { ascending: false });
                
                if (privateError) throw privateError;
                
                // دمج وترتيب
                messagesData = [...(publicMsgs || []), ...(privateMsgs || [])]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            // ✅ ترتيب: النشطة أولاً، ثم المنتهية
            messagesData = (messagesData || []).sort((a, b) => {
                const aExpired = a.expires_at && isPast(new Date(a.expires_at));
                const bExpired = b.expires_at && isPast(new Date(b.expires_at));
                if (aExpired && !bExpired) return 1;
                if (!aExpired && bExpired) return -1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            setMessages(messagesData || []);
            setFilteredMessages(messagesData || []);
            
            const messageIds = (messagesData || []).map(m => m.id);

            if (messageIds.length > 0) {
              const countsPromises = messageIds.map(id => 
                supabase.rpc('get_message_read_count', { message_uuid: id })
              );

              const { data: readsData, error: readsError } = await supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', user.id)
                .in('message_id', messageIds);
              
              if (readsError) throw readsError;
              setMyReadMessages(new Set(readsData.map(r => r.message_id)));

              const countsResults = await Promise.all(countsPromises);
              const counts = {};
              countsResults.forEach((res, index) => {
                  if (res.data !== null) {
                      counts[messageIds[index]] = res.data;
                  }
              });
              setReadCounts(counts);
            }
            
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast({
                title: "خطأ",
                description: "فشل في تحميل الرسائل",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchMessages();
            
            const channel = supabase
                .channel('admin-messages')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'admin_messages' 
                }, () => {
                    fetchMessages();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    useEffect(() => {
        let filtered = messages;
        if (searchTerm) {
            filtered = filtered.filter(msg => 
                msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                msg.message.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(msg => msg.priority === priorityFilter);
        }
        // ✅ فلتر الحالة (نشطة/منتهية)
        if (statusFilter === 'active') {
            filtered = filtered.filter(msg => !isMessageExpired(msg));
        } else if (statusFilter === 'expired') {
            filtered = filtered.filter(msg => isMessageExpired(msg));
        }
        setFilteredMessages(filtered);
    }, [searchTerm, priorityFilter, statusFilter, messages]);

    const handleAddMessage = async () => {
        if (!newMessage.title.trim() || !newMessage.message.trim()) {
            return toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
        }
        
        if (newMessage.is_private && !newMessage.target_user_id) {
            return toast({ title: "خطأ", description: "يرجى اختيار موظف للرسالة الخاصة", variant: "destructive" });
        }
        
        try {
            const messageData = {
                title: newMessage.title,
                message: newMessage.message,
                priority: newMessage.priority,
                created_by: user.id,
                expires_at: newMessage.expires_at || null,
                is_private: newMessage.is_private,
                sender_name: newMessage.sender_name,
                target_user_id: newMessage.is_private ? newMessage.target_user_id : null
            };
            
            const { error } = await supabase.from('admin_messages').insert([messageData]);
            if (error) throw error;
            
            toast({ 
                title: "نجاح", 
                description: newMessage.is_private 
                    ? "تم إرسال الرسالة الخاصة بنجاح" 
                    : "تم إضافة الرسالة بنجاح" 
            });
            
            setShowAddDialog(false);
            setNewMessage({ 
                title: '', 
                message: '', 
                priority: 'medium', 
                expires_at: '',
                is_private: false,
                target_user_id: null,
                sender_name: 'الإدارة'
            });
            fetchMessages();
        } catch (error) {
            console.error('Error adding message:', error);
            toast({ title: "خطأ", description: "فشل في إضافة الرسالة", variant: "destructive" });
        }
    };

    const confirmDelete = (messageId) => {
        setMessageToDelete(messageId);
        setShowDeleteConfirm(true);
    };

    const executeDeleteMessage = async () => {
        if (!messageToDelete) return;
        try {
            const { error } = await supabase.from('admin_messages').update({ is_active: false }).eq('id', messageToDelete);
            if (error) throw error;
            toast({ title: "نجاح", description: "تم حذف الرسالة بنجاح" });
            fetchMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            toast({ title: "خطأ", description: "فشل في حذف الرسالة", variant: "destructive" });
        } finally {
            setShowDeleteConfirm(false);
            setMessageToDelete(null);
        }
    };

    const markAsRead = async (messageId) => {
        if (myReadMessages.has(messageId)) return;
        try {
            await supabase.from('message_reads').insert([{ message_id: messageId, user_id: user.id }]);
            setMyReadMessages(prev => new Set(prev).add(messageId));
            setReadCounts(prev => ({...prev, [messageId]: (prev[messageId] || 0) + 1 }));
        } catch (error) {
            // Ignore if already read
        }
    };

    const handleViewDetails = (message) => {
        setSelectedMessage(message);
        setShowDetailsDialog(true);
        markAsRead(message.id);
    };

    const getPriorityProps = (priority) => {
        switch (priority) {
            case 'high': return { color: 'bg-red-500', text: 'عالية' };
            case 'medium': return { color: 'bg-yellow-500', text: 'متوسطة' };
            case 'low': return { color: 'bg-green-500', text: 'عادية' };
            default: return { color: 'bg-gray-500', text: 'غير محدد' };
        }
    };

    // ✅ إحصائيات الرسائل
    const stats = useMemo(() => ({
        total: messages.length,
        active: messages.filter(m => !isMessageExpired(m)).length,
        expired: messages.filter(m => isMessageExpired(m)).length,
        unread: messages.filter(m => !myReadMessages.has(m.id)).length
    }), [messages, myReadMessages]);

    return (
        <>
            <Helmet><title>رسائل الإدارة - MTS Supreme</title></Helmet>
            <div className="container mx-auto p-6 space-y-6">
                <PageTitle icon={MessageSquare} title="رسائل الإدارة" description="آخر التحديثات والإعلانات من الإدارة" />

                {/* ✅ إحصائيات سريعة */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-blue-50">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                            <p className="text-xs text-gray-500">إجمالي الرسائل</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                            <p className="text-xs text-gray-500">نشطة</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                            <p className="text-xs text-gray-500">منتهية</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600">{stats.unread}</p>
                            <p className="text-xs text-gray-500">غير مقروءة</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 w-full md:w-auto">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input type="text" placeholder="البحث في الرسائل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
                            </div>
                            <div className="flex gap-2 items-center flex-wrap">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm">
                                    <option value="all">جميع الأولويات</option>
                                    <option value="high">عالية</option>
                                    <option value="medium">متوسطة</option>
                                    <option value="low">عادية</option>
                                </select>
                                {/* ✅ فلتر الحالة */}
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm">
                                    <option value="all">جميع الحالات</option>
                                    <option value="active">نشطة فقط</option>
                                    <option value="expired">منتهية فقط</option>
                                </select>
                            </div>
                            {isManager && <Button onClick={() => setShowAddDialog(true)} className="gap-2"><Plus className="h-4 w-4" />رسالة جديدة</Button>}
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div><p className="mt-4 text-muted-foreground">جاري التحميل...</p></div>
                ) : filteredMessages.length === 0 ? (
                    <Card><CardContent className="p-12 text-center"><MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" /><p className="text-muted-foreground text-lg">لا توجد رسائل</p></CardContent></Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredMessages.map((message) => {
                            const priorityProps = getPriorityProps(message.priority);
                            const isRead = myReadMessages.has(message.id);
                            const expired = isMessageExpired(message);
                            
                            return (
                                <motion.div key={message.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <Card className={`hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden ${!isRead && !expired && 'border-primary'} ${expired && 'opacity-75 border-red-300'}`} onClick={() => handleViewDetails(message)}>
                                        
                                        {/* ✅ شريط "منتهية" الأحمر الكبير */}
                                        {expired && (
                                            <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-2 font-bold text-lg flex items-center justify-center gap-2">
                                                <XCircle className="w-5 h-5" />
                                                منتهية
                                            </div>
                                        )}
                                        
                                        <CardContent className={`p-6 ${expired ? 'pt-14' : ''}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                        <div className={`w-2 h-2 rounded-full ${priorityProps.color}`}></div>
                                                        <h3 className={`font-bold text-lg text-card-foreground hover:text-primary transition-colors ${expired && 'line-through text-gray-500'}`}>{message.title}</h3>
                                                        <Badge variant="outline">{priorityProps.text}</Badge>
                                                        {message.is_private && <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300"><UserCheck className="w-3 h-3 ml-1" />خاصة</Badge>}
                                                        {!isRead && !expired && <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">جديد</Badge>}
                                                    </div>
                                                    <p className={`text-muted-foreground text-sm line-clamp-2 mb-3 pr-5 ${expired && 'text-gray-400'}`}>{message.message}</p>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ar })}</span>
                                                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{message.sender_name || message.profiles?.name_ar || 'الإدارة'}</span>
                                                        {message.is_private && message.target_profile && (
                                                            <span className="flex items-center gap-1 text-purple-600">إلى: {message.target_profile.name_ar}</span>
                                                        )}
                                                        {!message.is_private && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{readCounts[message.id] || 0} قراءة</span>}
                                                        {message.expires_at && (
                                                            <span className={`flex items-center gap-1 ${expired ? 'text-red-600 font-bold' : 'text-orange-600'}`}>
                                                                <Calendar className="h-3 w-3" />
                                                                {expired ? 'انتهت في: ' : 'تنتهي: '}
                                                                {new Date(message.expires_at).toLocaleDateString('ar-SA')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isRead && <CheckCircle className="h-5 w-5 text-green-500" title="مقروءة" />}
                                                    {isManager && (
                                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); confirmDelete(message.id); }} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50"><Trash2 className="h-4 w-4" /></Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                )}

                {/* نافذة إضافة رسالة */}
                <AnimatePresence>
                    {showAddDialog && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddDialog(false)}>
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-card-foreground">رسالة جديدة</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(false)}><X className="h-5 w-5" /></Button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                        <input 
                                            type="checkbox" 
                                            id="is_private"
                                            checked={newMessage.is_private}
                                            onChange={(e) => setNewMessage({
                                                ...newMessage, 
                                                is_private: e.target.checked,
                                                target_user_id: e.target.checked ? newMessage.target_user_id : null
                                            })}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="is_private" className="text-sm font-semibold text-purple-700 cursor-pointer">
                                            رسالة خاصة لموظف واحد
                                        </label>
                                    </div>

                                    {newMessage.is_private && (
                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">
                                                الموظف المستهدف *
                                            </label>
                                            <select 
                                                value={newMessage.target_user_id || ''} 
                                                onChange={(e) => setNewMessage({...newMessage, target_user_id: e.target.value})}
                                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            >
                                                <option value="">اختر الموظف...</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name_ar} ({emp.email})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-muted-foreground mb-2">
                                            اسم المرسل
                                        </label>
                                        <select 
                                            value={newMessage.sender_name} 
                                            onChange={(e) => setNewMessage({...newMessage, sender_name: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        >
                                            <option value="الإدارة">الإدارة</option>
                                            <option value="الموارد البشرية">الموارد البشرية</option>
                                            <option value="النظام">النظام</option>
                                            <option value="المدير العام">المدير العام</option>
                                        </select>
                                    </div>

                                    <div><label className="block text-sm font-semibold text-muted-foreground mb-2">عنوان الرسالة *</label><Input value={newMessage.title} onChange={(e) => setNewMessage({...newMessage, title: e.target.value})} placeholder="أدخل عنوان الرسالة" /></div>
                                    <div><label className="block text-sm font-semibold text-muted-foreground mb-2">نص الرسالة *</label><textarea value={newMessage.message} onChange={(e) => setNewMessage({...newMessage, message: e.target.value})} placeholder="أدخل نص الرسالة" rows={6} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background" /></div>
                                    <div><label className="block text-sm font-semibold text-muted-foreground mb-2">الأولوية</label><select value={newMessage.priority} onChange={(e) => setNewMessage({...newMessage, priority: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"><option value="low">عادية</option><option value="medium">متوسطة</option><option value="high">عالية</option></select></div>
                                    <div><label className="block text-sm font-semibold text-muted-foreground mb-2">تاريخ الانتهاء (اختياري)</label><Input type="datetime-local" value={newMessage.expires_at} onChange={(e) => setNewMessage({...newMessage, expires_at: e.target.value})} /><p className="text-xs text-muted-foreground mt-1">بعد هذا التاريخ ستظهر الرسالة بشريط "منتهية"</p></div>
                                    <div className="flex gap-3 pt-4"><Button onClick={handleAddMessage} className="flex-1">إرسال الرسالة</Button><Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">إلغاء</Button></div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showDetailsDialog && selectedMessage && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsDialog(false)}>
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                
                                {/* ✅ شريط منتهية في التفاصيل */}
                                {isMessageExpired(selectedMessage) && (
                                    <div className="bg-red-600 text-white text-center py-3 font-bold text-xl mb-4 rounded-lg flex items-center justify-center gap-2">
                                        <XCircle className="w-6 h-6" />
                                        هذه الرسالة منتهية
                                    </div>
                                )}
                                
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-3 h-3 rounded-full ${getPriorityProps(selectedMessage.priority).color}`}></div>
                                            <h3 className="text-2xl font-bold text-card-foreground">{selectedMessage.title}</h3>
                                            {selectedMessage.is_private && <Badge variant="secondary" className="bg-purple-100 text-purple-700">خاصة</Badge>}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{selectedMessage.sender_name || selectedMessage.profiles?.name_ar || 'الإدارة'}</span>
                                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true, locale: ar })}</span>
                                            {!selectedMessage.is_private && <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{readCounts[selectedMessage.id] || 0} قراءة</span>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setShowDetailsDialog(false)}><X className="h-5 w-5" /></Button>
                                </div>
                                <div className="bg-background rounded-xl p-6"><p className="text-card-foreground leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p></div>
                                {selectedMessage.expires_at && (
                                    <div className={`mt-4 p-4 ${isMessageExpired(selectedMessage) ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40'} border rounded-lg flex items-center gap-2`}>
                                        <AlertCircle className={`h-5 w-5 ${isMessageExpired(selectedMessage) ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
                                        <span className={`text-sm ${isMessageExpired(selectedMessage) ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                                            {isMessageExpired(selectedMessage) ? 'انتهت هذه الرسالة في ' : 'تنتهي هذه الرسالة في '}
                                            {new Date(selectedMessage.expires_at).toLocaleString('ar-SA')}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>لن يتم حذف الرسالة بشكل دائم، بل سيتم أرشفتها وإخفاؤها عن الموظفين. يمكنك استعادتها لاحقًا إذا لزم الأمر.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={executeDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">نعم، أرشفة</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
};

export default AdminMessages;