
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import useNotificationSound from '@/hooks/useNotificationSound';

const OMAR_NAME = 'عمر';
const OMAR_ID = '57cc2b3c-2666-4097-af22-1235c393762e';

const formatTime = (date) => {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const ChatInterface = ({ 
  messages, 
  isLoading, 
  inputValue, 
  setInputValue, 
  handleSendMessage, 
  handleKeyDown, 
  scrollAreaRef, 
  textareaRef,
  profile
}) => (
  <div className="flex flex-col h-full">
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-4 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            
            <div className={`flex flex-col max-w-[80%] ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-[10px] text-gray-400">
                  {formatTime(msg.timestamp)}
                </span>
                {msg.toolsUsed && (
                  <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> تم التنفيذ
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot size={16} className="text-blue-600" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <motion.div className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
                <motion.div className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>

    <div className="p-4 border-t bg-gray-50">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 min-h-[44px] max-h-[120px] px-4 py-3 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={1}
        />
        <Button 
          className="h-[44px] w-[44px] rounded-xl bg-blue-600 hover:bg-blue-700"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        {OMAR_NAME} ينفذ القرارات تلقائياً (خصومات، إنذارات، موافقات)
      </p>
    </div>
  </div>
);

const OmarAssistant = ({ embedded = false }) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const { playSound } = useNotificationSound();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `مرحباً ${profile?.name_ar || ''}! أنا ${OMAR_NAME}، مدير الموارد البشرية. كيف أقدر أساعدك اليوم؟`,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef(null);
  const textareaRef = useRef(null);

  // إنشاء thread_id جديد عند فتح المحادثة
  useEffect(() => {
    if (isOpen && !threadId) {
      setThreadId(crypto.randomUUID());
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  // حفظ رسالة في قاعدة البيانات
  const saveMessageToDB = async (title, message, type, createdBy) => {
    try {
      await supabase.from('bot_messages').insert({
        employee_id: user?.id || profile?.id,
        title: title,
        message: message,
        type: type,
        is_read: true,
        action_required: false,
        thread_id: threadId,
        created_by: createdBy
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // ✅ حفظ رسالة الموظف في قاعدة البيانات
    await saveMessageToDB(
      '💬 رسالة موظف',
      messageText,
      'employee_message',
      user?.id || profile?.id
    );

    try {
      const conversationMessages = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));
      
      conversationMessages.push({ role: 'user', content: messageText });

      const { data, error } = await supabase.functions.invoke('super-action', {
        body: {
          context: 'omar_hr_response',
          employee_id: user?.id || profile?.id,
          messages: conversationMessages
        }
      });

      if (error) throw error;

      let responseText = 'تم استلام طلبك.';
      let toolsUsed = false;

      if (data?.content && Array.isArray(data.content)) {
        const textBlock = data.content.find(block => block.type === 'text');
        if (textBlock?.text) {
          responseText = textBlock.text;
        }
      }
      
      if (data?.tools_used) {
        toolsUsed = true;
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        toolsUsed: toolsUsed
      };

      setMessages(prev => [...prev, botMessage]);
      playSound('message');

      // ✅ حفظ رد عمر في قاعدة البيانات
      await saveMessageToDB(
        '💬 رد عمر',
        responseText,
        toolsUsed ? 'action' : 'info',
        OMAR_ID
      );

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // إعادة تعيين المحادثة عند الإغلاق
  const handleClose = () => {
    setIsOpen(false);
    setThreadId(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `مرحباً ${profile?.name_ar || ''}! أنا ${OMAR_NAME}، مدير الموارد البشرية. كيف أقدر أساعدك اليوم؟`,
        timestamp: new Date(),
      }
    ]);
  };

  if (embedded) {
    return (
      <Card className="h-full border shadow-sm">
        <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center gap-2">
          <Bot size={20} />
          <span className="font-bold">{OMAR_NAME}</span>
          <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full mr-auto">متاح • ينفذ تلقائياً</span>
        </div>
        <CardContent className="p-0 h-[400px]">
          <ChatInterface 
            messages={messages}
            isLoading={isLoading}
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendMessage={handleSendMessage}
            handleKeyDown={handleKeyDown}
            scrollAreaRef={scrollAreaRef}
            textareaRef={textareaRef}
            profile={profile}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-6 left-6 z-50"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <MessageSquare className="h-7 w-7 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </Button>
        </motion.div>
      )}

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            height: isMinimized ? 'auto' : '500px',
            width: '380px'
          }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-6 z-50 bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
        >
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">{OMAR_NAME}</h3>
                <p className="text-[10px] text-white/80">مدير الموارد البشرية • ينفذ تلقائياً</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
                onClick={handleClose}
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ChatInterface 
                messages={messages}
                isLoading={isLoading}
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSendMessage={handleSendMessage}
                handleKeyDown={handleKeyDown}
                scrollAreaRef={scrollAreaRef}
                textareaRef={textareaRef}
                profile={profile}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OmarAssistant;
