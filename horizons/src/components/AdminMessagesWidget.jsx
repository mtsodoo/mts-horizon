import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Bell, AlertTriangle, Info, CheckCircle, MessageSquare, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function AdminMessagesWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messagesList, setMessagesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUnifiedMessages();

      const channel = supabase
        .channel('unified-messages-widget')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_messages', filter: `employee_id=eq.${user.id}` }, () => {
          fetchUnifiedMessages();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_messages' }, () => {
          fetchUnifiedMessages();
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [user]);

  const fetchUnifiedMessages = async () => {
    setLoading(true);
    try {
      // جلب رسائل عمر غير المقروءة
      const { data: botMsgs } = await supabase
        .from('bot_messages')
        .select('*')
        .eq('employee_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      // جلب الرسائل العامة (broadcast) فقط
      const { data: publicMsgs } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('is_active', true)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(5);

      // جلب الرسائل الخاصة للموظف الحالي فقط
      const { data: privateMsgs } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('is_active', true)
        .eq('is_private', true)
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // دمج الرسائل العامة والخاصة وترتيبها
      const allAdminMsgs = [...(publicMsgs || []), ...(privateMsgs || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      const { data: readMessages } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id);

      const readIds = new Set((readMessages || []).map(r => r.message_id));
      const unreadAdminMsgs = allAdminMsgs.filter(m => !readIds.has(m.id));

      const formattedBotMsgs = (botMsgs || []).map(m => ({ ...m, source: 'bot', priority: 'high' }));
      const formattedAdminMsgs = unreadAdminMsgs.map(m => ({ ...m, source: 'admin', type: 'info' }));

      setMessagesList([...formattedBotMsgs, ...formattedAdminMsgs]);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (msg) => {
    if (msg.source === 'bot') {
      await supabase.from('bot_messages').update({ is_read: true }).eq('id', msg.id);
      navigate('/system-messages');
    } else {
      handleOpenDetails(msg);
    }
    fetchUnifiedMessages();
  };

  const handleOpenDetails = async (msg) => {
    setDetailsMessage(msg);
    setIsDetailsModalOpen(true);

    if (msg.source === 'bot' && !msg.is_read) {
      await supabase.from('bot_messages').update({ is_read: true }).eq('id', msg.id);
      fetchUnifiedMessages();
    } else if (msg.source === 'admin') {
      await supabase.from('message_reads').upsert({
        user_id: user.id,
        message_id: msg.id,
        read_at: new Date().toISOString()
      }, { onConflict: 'user_id,message_id' });
      fetchUnifiedMessages();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-orange-500 w-5 h-5" />;
      case 'success': return <CheckCircle className="text-green-500 w-5 h-5" />;
      default: return <Info className="text-blue-500 w-5 h-5" />;
    }
  };

  return (
    <>
      <Card className="h-full min-h-[320px] flex flex-col border-t-4 border-t-blue-500 shadow-md bg-white">
        <CardHeader className="pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-800 font-cairo">مركز التنبيهات</CardTitle>
                <p className="text-xs text-muted-foreground">الرسائل والإشعارات</p>
              </div>
            </div>
            {messagesList.length > 0 && (
              <Badge variant="destructive" className="animate-pulse rounded-full px-2">{messagesList.length}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[240px]">
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-32 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-muted-foreground">جاري التحميل...</span>
                </div>
              ) : messagesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center space-y-2 py-8">
                  <div className="bg-gray-50 p-3 rounded-full"><MessageSquare className="h-6 w-6 text-gray-300" /></div>
                  <p className="text-sm text-muted-foreground font-cairo">لا توجد رسائل جديدة</p>
                </div>
              ) : (
                messagesList.map((msg) => (
                  <div
                    key={msg.id}
                    className={`group flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      msg.source === 'bot'
                        ? 'bg-orange-50 border-orange-100 hover:border-orange-300 hover:shadow-md'
                        : msg.is_private
                          ? 'bg-purple-50 border-purple-100 hover:border-purple-300 hover:shadow-md'
                          : 'bg-blue-50 border-blue-100 hover:border-blue-300 hover:shadow-md'
                    }`}
                    onClick={() => handleMessageClick(msg)}
                  >
                    <div className="mt-1">{getIcon(msg.type || 'info')}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-gray-800 truncate font-cairo">
                          {msg.source === 'bot' ? '💬 ' : msg.is_private ? '🔒 ' : '📢 '}{msg.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0 mr-2">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      
                      {msg.source === 'admin' && msg.sender_name && (
                        <p className="text-[10px] text-gray-500 mb-1">
                          من: {msg.sender_name}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500 line-clamp-2 font-cairo leading-relaxed mb-2">
                        {msg.message}
                      </p>

                      <Button
                        size="sm"
                        className={`h-7 text-xs w-full justify-center ${
                          msg.source === 'bot'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : msg.is_private
                              ? 'bg-purple-500 hover:bg-purple-600 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageClick(msg);
                        }}
                      >
                        {msg.source === 'bot' ? 'الانتقال للرد' : 'عرض التفاصيل'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="p-3 border-t bg-gray-50/50 flex gap-2">
          <Button
            variant="ghost"
            className="flex-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 justify-between group"
            onClick={() => navigate('/system-messages')}
          >
            <span>رسائل شؤون الموظفين</span>
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
          </Button>
          <Button
            variant="ghost"
            className="flex-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 justify-between group"
            onClick={() => navigate('/admin-messages')}
          >
            <span>رسائل الإدارة</span>
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
          </Button>
        </div>
      </Card>

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsMessage?.source === 'bot' ? '💬' : detailsMessage?.is_private ? '🔒' : '📢'} {detailsMessage?.title}
            </DialogTitle>
            <DialogDescription>
              {detailsMessage?.created_at && formatDistanceToNow(new Date(detailsMessage.created_at), { addSuffix: true, locale: ar })}
              {detailsMessage?.sender_name && (
                <span className="block mt-1 text-purple-600">
                  من: {detailsMessage.sender_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className={`p-4 rounded-lg border ${
              detailsMessage?.source === 'bot'
                ? 'bg-orange-50 border-orange-100'
                : detailsMessage?.is_private
                  ? 'bg-purple-50 border-purple-100'
                  : 'bg-blue-50 border-blue-100'
            }`}>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {detailsMessage?.message}
              </p>
            </div>

            {detailsMessage?.source === 'bot' && (
              <div className="mt-4">
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    navigate('/system-messages');
                  }}
                >
                  الانتقال للرد على عمر
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDetailsModalOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}