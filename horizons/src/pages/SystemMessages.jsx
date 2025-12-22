import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
// تم إضافة Lock هنا
import { Send, Paperclip, Bot, CheckCircle, MessageCircle, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import FileUpload from '@/components/FileUpload';
import { message, Spin, Badge } from 'antd';
import { logSystemActivity } from '@/utils/omarTools';

const SystemMessages = () => {
  const { user, profile } = useAuth();
  const scrollRef = useRef(null);
  const [activeTickets, setActiveTickets] = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEndButtons, setShowEndButtons] = useState(false);

  useEffect(() => {
    if (user) fetchAllTickets();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (selectedTicket) {
      fetchChatHistory(selectedTicket);
      // ✅ تعديل: الأزرار تظهر بعد أول رد من الموظف
      setShowEndButtons((selectedTicket.reply_count || 0) >= 1);
    }
  }, [selectedTicket]);

  const fetchAllTickets = async () => {
    setLoading(true);
    try {
      // ✅ نجيب كل الرسائل للموظف
      const { data: allMsgs, error: allError } = await supabase
        .from('bot_messages')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // ✅ نفصل النشطة عن المغلقة
      const threadMap = new Map();
      const activeThreads = [];
      const closedThreads = [];

      (allMsgs || []).forEach(msg => {
        const threadId = msg.thread_id || msg.id;

        // نحفظ آخر رسالة في كل thread
        if (!threadMap.has(threadId) || new Date(msg.created_at) > new Date(threadMap.get(threadId).created_at)) {
          threadMap.set(threadId, msg);
        }
      });

      // نصنف الـ threads
      threadMap.forEach(msg => {
        const isClosed = msg.title?.includes('إغلاق') ||
          msg.type === 'success' ||
          msg.title?.includes('قرار نهائي');

        if (isClosed) {
          closedThreads.push(msg);
        } else {
          activeThreads.push(msg);
        }
      });

      setActiveTickets(activeThreads);
      setClosedTickets(closedThreads.slice(0, 30)); // آخر 30 محادثة مغلقة

      if (activeThreads.length > 0 && !selectedTicket) {
        setSelectedTicket(activeThreads[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async (ticket) => {
    if (!ticket) return;

    setLoadingChat(true);
    try {
      const threadId = ticket.thread_id || ticket.id;

      const { data: botMsgs } = await supabase
        .from('bot_messages')
        .select('*')
        .eq('employee_id', user.id)
        .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
        .order('created_at', { ascending: true });

      const { data: userMsgs } = await supabase
        .from('absence_justifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      const allMessages = [
        ...(botMsgs || []).map(m => ({ ...m, sender: 'bot' })),
        ...(userMsgs || []).map(m => ({
          ...m,
          sender: 'user',
          message: m.reason,
          file_url: m.file_url,
          file_name: m.file_name
        }))
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setChatHistory(allMessages);

      // ✅ نعلّم كل رسائل هذا الـ thread كمقروءة
      await supabase
        .from('bot_messages')
        .update({ is_read: true })
        .eq('employee_id', user.id)
        .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
        .eq('is_read', false);

    } catch (error) {
      console.error(error);
    } finally {
      setLoadingChat(false);
    }
  };

  const getImageBase64 = async (fileUrl, fileName) => {
    try {
      const urlParts = fileUrl.split('/storage/v1/object/public/');
      if (urlParts.length < 2) {
        console.error('Invalid storage URL:', fileUrl);
        return null;
      }

      const pathParts = urlParts[1].split('/');
      const bucket = pathParts[0];
      const filePath = pathParts.slice(1).join('/');

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        return null;
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(data);
      });
    } catch (error) {
      console.error('Error converting image:', error);
      return null;
    }
  };

  const callOmarEdgeFunction = async (employeeReply, fileData = null, replyCount = 0) => {
    try {
      let messageContent;
      if (fileData && fileData.url) {
        const fileName = fileData.name?.toLowerCase() || '';
        const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/);

        if (isImage) {
          const base64 = await getImageBase64(fileData.url, fileData.name);
          if (base64) {
            messageContent = [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
                  data: base64
                }
              },
              {
                type: 'text',
                text: employeeReply || 'هذا هو التقرير/الإثبات المطلوب'
              }
            ];
          } else {
            messageContent = `${employeeReply}\n\n[مرفق: ${fileData.name}]\nرابط: ${fileData.url}`;
          }
        } else {
          messageContent = `${employeeReply}\n\n[مرفق: ${fileData.name}]\nرابط: ${fileData.url}`;
        }
      } else {
        messageContent = employeeReply;
      }

      const conversationHistory = chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message || msg.title || ''
      }));

      conversationHistory.push({ role: 'user', content: messageContent });

      // 🔥 Workflow مبسط - عمر يسأل بس، الموظف يقرر
      let systemInstruction = '';

      if (replyCount === 1) {
        systemInstruction = 'اسأل عن سبب التأخير أو الغياب بشكل مباشر ومختصر. جملة واحدة فقط.';
      } else {
        systemInstruction = 'رد بجملة قصيرة جداً على كلام الموظف. لا تسأل أسئلة إضافية.';
      }

      const { data, error } = await supabase.functions.invoke('super-action', {
        body: {
          context: 'omar_hr_response',
          employee_id: user.id,
          alert_id: selectedTicket?.id,
          thread_id: selectedTicket?.thread_id || selectedTicket?.id,
          messages: conversationHistory,
          system_instruction: systemInstruction,
          reply_count: replyCount
        }
      });

      if (error) throw error;

      let responseText = 'تم استلام ردك.';
      if (data?.content && Array.isArray(data.content)) {
        const textBlock = data.content.find(block => block.type === 'text');
        if (textBlock?.text) {
          responseText = textBlock.text;
        }
      }

      // ✅ إضافة سؤال التأكيد في نهاية رد عمر
      responseText += '\n\nإذا وصلتك الرسالة وكل شي واضح، اختر "إنهاء المحادثة" 👇';

      return responseText;
    } catch (error) {
      console.error('Error calling Omar:', error);
      return 'عذراً، حدث خطأ في معالجة ردك. حاول مرة أخرى.';
    }
  };

  const handleSubmitResponse = async () => {
    if (!replyText.trim() && !uploadedFile) {
      message.error('اكتب رداً أو أرفق ملفاً.');
      return;
    }

    const currentReplyText = replyText;
    const currentUploadedFile = uploadedFile;
    const threadId = selectedTicket.thread_id || selectedTicket.id;
    const currentReplyCount = (selectedTicket.reply_count || 0) + 1;

    setReplyText('');
    setUploadedFile(null);
    setSubmitting(true);

    const tempUserMsg = {
      sender: 'user',
      message: currentReplyText || (currentUploadedFile ? 'مرفق' : ''),
      file_url: currentUploadedFile?.url,
      file_name: currentUploadedFile?.name,
      created_at: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, tempUserMsg]);

    try {
      await supabase.from('absence_justifications').insert({
        user_id: user.id,
        absence_date: new Date().toISOString().split('T')[0],
        reason: currentReplyText,
        file_url: currentUploadedFile?.url,
        file_name: currentUploadedFile?.name,
        status: 'pending',
        thread_id: threadId
      });

      // ✅ نحدث كل رسائل الـ thread ونخليها action_required: false
      await supabase
        .from('bot_messages')
        .update({ action_required: false, is_read: true })
        .or(`id.eq.${threadId},thread_id.eq.${threadId}`);

      const omarReply = await callOmarEdgeFunction(currentReplyText, currentUploadedFile, currentReplyCount);

      // ✅ رد عمر يصير للقراءة فقط - ما يطلع تنبيه
      const { data: newBotMsg } = await supabase
        .from('bot_messages')
        .insert({
          employee_id: user.id,
          title: '💬 رد عمر',
          message: omarReply,
          type: 'info',
          action_required: false, // ✅ ما يظهر Dialog مرة ثانية
          is_read: false, // الموظف لازم يفتح الرسالة عشان يقراها
          created_by: '57cc2b3c-2666-4097-af22-1235c393762e',
          thread_id: threadId,
          reply_count: currentReplyCount
        })
        .select()
        .single();

      setChatHistory(prev => [...prev, { ...newBotMsg, sender: 'bot' }]);

      await supabase
        .from('bot_messages')
        .update({ reply_count: currentReplyCount })
        .eq('id', selectedTicket.id);

      logSystemActivity(user.id, 'CHAT_RESPONSE', 'INVESTIGATION', {
        ticketId: selectedTicket.id,
        hasFile: !!currentUploadedFile,
        replyCount: currentReplyCount
      });

      message.success('تم الرد');

      // إذا الموظف رد مرتين أو أكثر، نعرض الأزرار
      if (currentReplyCount >= 1) {
        setShowEndButtons(true);
      }

      // ✅ المحادثة مفتوحة بس ما تطلع تنبيه
      setSelectedTicket(prev => ({
        ...prev,
        reply_count: currentReplyCount,
        action_required: false, // ✅ ما يطلع Dialog
        isClosed: false
      }));

      fetchAllTickets();

    } catch (error) {
      console.error(error);
      message.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 دالة إنهاء المحادثة
  const handleEndConversation = async () => {
    setSubmitting(true);
    try {
      const threadId = selectedTicket.thread_id || selectedTicket.id;

      // عمر يكتب رسالة نهائية
      const finalMessage = 'تمام، بيجيك القرار على التنبيهات خلال 24 ساعة. شكراً لتعاونك.';

      const { data: finalBotMsg } = await supabase
        .from('bot_messages')
        .insert({
          employee_id: user.id,
          title: '✅ تم إغلاق المحادثة',
          message: finalMessage,
          type: 'success',
          action_required: false,
          is_read: false,
          created_by: '57cc2b3c-2666-4097-af22-1235c393762e',
          thread_id: threadId
        })
        .select()
        .single();

      setChatHistory(prev => [...prev, { ...finalBotMsg, sender: 'bot' }]);

      // إغلاق كل الرسائل في الـ thread
      await supabase
        .from('bot_messages')
        .update({ action_required: false })
        .or(`id.eq.${threadId},thread_id.eq.${threadId}`);

      logSystemActivity(user.id, 'CONVERSATION_ENDED', 'INVESTIGATION', {
        ticketId: selectedTicket.id,
        threadId: threadId
      });

      message.success('تم إغلاق المحادثة');

      setSelectedTicket(prev => ({
        ...prev,
        isClosed: true,
        action_required: false
      }));

      setShowEndButtons(false);
      fetchAllTickets();

    } catch (error) {
      console.error(error);
      message.error('حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 دالة مواصلة المحادثة
  const handleContinueConversation = () => {
    setShowEndButtons(false);
    message.info('اكتب ما تريد إضافته');
  };

  const getMessageIcon = (msg) => {
    if (msg.title?.includes('تأخير')) return '⏰';
    if (msg.title?.includes('غياب')) return '📅';
    if (msg.title?.includes('مقبول') || msg.type === 'success') return '✅';
    if (msg.title?.includes('مرفوض')) return '❌';
    if (msg.title?.includes('قرار نهائي')) return '⚖️';
    if (msg.title?.includes('إغلاق')) return '🔒';
    return '📩';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <Helmet><title>رسائل النظام - عمر</title></Helmet>
      <PageTitle
        title=" HR Manager"
        icon={Bot}
        description="مدير الموارد البشرية"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px] items-stretch">
        <Card className="col-span-1 bg-white flex flex-col h-full rounded-2xl border-none shadow-md">
          <CardHeader className="bg-slate-50 border-b p-4">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>سجل الرسائل</span>
              {activeTickets.length > 0 && (
                <Badge count={activeTickets.length} style={{ backgroundColor: '#ef4444' }} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {activeTickets.length > 0 && (
                <div className="border-b">
                  <div className="px-4 py-2 bg-red-50 text-red-700 text-xs font-bold">
                    🔴 تحتاج رد ({activeTickets.length})
                  </div>
                  {activeTickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket({ ...t, isClosed: false })}
                      className={`p-4 cursor-pointer hover:bg-red-50 border-l-4 ${selectedTicket?.id === t.id ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                    >
                      <div className="font-bold text-sm mb-1 text-red-800 flex items-center justify-between">
                        <span>{getMessageIcon(t)} {t.title}</span>
                        {(t.reply_count || 0) > 0 && (
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {t.reply_count} ردود
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1">{t.message}</p>
                      <div className="text-[10px] text-gray-400">
                        {t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ar }) : 'الآن'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {closedTickets.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold">
                    📁 الأرشيف ({closedTickets.length})
                  </div>
                  {closedTickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket({ ...t, isClosed: true })}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 ${selectedTicket?.id === t.id ? 'border-gray-400 bg-gray-50' : 'border-transparent'}`}
                    >
                      <div className="font-medium text-sm mb-1 text-gray-600">
                        {getMessageIcon(t)} {t.title}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1 mb-1">{t.message}</p>
                      <div className="text-[10px] text-gray-400">
                        {t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ar }) : 'الآن'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTickets.length === 0 && closedTickets.length === 0 && !loading && (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p>لا توجد رسائل</p>
                </div>
              )}

              {loading && (
                <div className="p-8 text-center">
                  <Spin />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2 shadow-lg flex flex-col h-full bg-[#f0f2f5] overflow-hidden rounded-2xl border-none">
          <div className="p-4 bg-white border-b flex items-center gap-3 shadow-sm z-10">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Bot />
            </div>
            <div>
              <h3 className="font-bold">عمر (HR Manager)</h3>
              <p className="text-xs text-green-600">متصل الآن</p>
            </div>
            {selectedTicket && (selectedTicket.reply_count || 0) > 0 && (
              <div className="mr-auto">
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                  {selectedTicket.reply_count} ردود
                </span>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-4 bg-[#efeae2]">
            <div className="space-y-4">
              {!selectedTicket && !loadingChat && (
                <div className="text-center text-gray-400 py-20">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>اختر رسالة لعرض المحادثة</p>
                </div>
              )}

              {loadingChat && (
                <div className="text-center py-20">
                  <Spin />
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[80%] ${msg.sender === 'user'
                    ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none'
                    : 'bg-white text-gray-800 rounded-tl-none'
                    }`}>
                    {msg.file_url && (
                      <div className="mb-2">
                        {msg.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={msg.file_url}
                            alt={msg.file_name}
                            className="max-w-full rounded-lg border cursor-pointer hover:opacity-90"
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        ) : (
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border hover:bg-white"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span className="text-xs truncate">{msg.file_name || 'مرفق'}</span>
                          </a>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <span className="text-[9px] block mt-1 text-right text-gray-400">
                      {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { locale: ar }) : 'الآن'}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-3 bg-[#f0f2f5] border-t">
            {!selectedTicket ? (
              <div className="text-center text-gray-400 p-3">
                اختر رسالة لعرض المحادثة
              </div>
            ) : (selectedTicket.isClosed) ? (
              <div className="text-center p-4 bg-gray-100 rounded-xl">
                <div className="text-gray-500 text-sm">✅ تم إغلاق هذه المحادثة</div>
                <div className="text-gray-400 text-xs mt-1">للقراءة فقط</div>
              </div>
            ) : showEndButtons ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-blue-800 text-sm font-bold mb-3">هل تريد إضافة شيء آخر؟</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleContinueConversation}
                      className="bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-xl h-12 font-bold"
                    >
                      <MessageCircle className="w-5 h-5 ml-2" />
                      عندي كلام ثاني
                    </Button>
                    <Button
                      onClick={handleEndConversation}
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 font-bold"
                    >
                      {submitting ? <Spin size="small" /> : (
                        <>
                          <CheckCircle className="w-5 h-5 ml-2" />
                          إنهاء المحادثة
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {uploadedFile && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-xl border border-green-200">
                    {uploadedFile.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={uploadedFile.url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Paperclip className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-green-600">جاهز للإرسال ✓</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setUploadedFile(null)}
                    >
                      ✕
                    </Button>
                  </div>
                )}

                <div className="flex items-end gap-2 bg-white p-2 rounded-2xl shadow-sm border">
                  <div className="shrink-0">
                    <FileUpload
                      bucket="employee-documents"
                      folder="chat"
                      onUploadComplete={setUploadedFile}
                      icon={
                        <Button variant="ghost" size="icon" className={`rounded-full ${uploadedFile ? 'text-green-500' : ''}`}>
                          <Paperclip className="w-5 h-5" />
                        </Button>
                      }
                    />
                  </div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={uploadedFile ? "أضف تعليق (اختياري)..." : "اكتب ردك..."}
                    className="flex-1 border-none shadow-none resize-none py-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitResponse();
                      }
                    }}
                  />
                  <div className="shrink-0">
                    <Button
                      onClick={handleSubmitResponse}
                      disabled={submitting}
                      className="bg-blue-600 rounded-full h-10 w-10 p-0 flex items-center justify-center"
                    >
                      {submitting ? <Spin size="small" /> : <Send className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SystemMessages;