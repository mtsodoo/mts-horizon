import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Send, Loader2, User, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { startConversation, submitAnswer } from '@/utils/claudeHRAssistant';
import { getAlertConversation } from '@/utils/alertOperations';
import { uploadFile } from '@/utils/fileStorage';
import { getEmployeeProfile } from '@/utils/omarFunctions';

const AlertChatDialog = ({ open, onOpenChange, alert, onComplete }) => {
    const { toast } = useToast();
    const [messages, setMessages] = useState([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationState, setConversationState] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [employeeInfo, setEmployeeInfo] = useState(null);
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (open && alert) {
            initializeConversation();
            loadEmployeeInfo();
        }
    }, [open, alert]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadEmployeeInfo = async () => {
        try {
            const profile = await getEmployeeProfile(alert.employee_id);
            setEmployeeInfo(profile);
        } catch (error) {
            console.error('❌ خطأ في تحميل معلومات الموظف:', error);
        }
    };

    const initializeConversation = async () => {
        setLoading(true);
        try {
            const existingMessages = await getAlertConversation(alert.id);
            
            if (existingMessages && existingMessages.length > 0) {
                setMessages(existingMessages);
                
                const lastSystemMessage = existingMessages
                    .filter(m => m.message_from === 'system')
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                
                if (alert.status === 'responded') {
                    setConversationState({ completed: true });
                } else {
                    const questionNumber = lastSystemMessage?.question_number || 1;
                    const history = existingMessages.map(m => ({
                        role: m.message_from === 'system' ? 'assistant' : 'user',
                        content: m.message_text
                    }));
                    
                    setConversationState({
                        alertId: alert.id,
                        conversationHistory: history,
                        questionNumber: questionNumber,
                        employeeContext: null
                    });
                }
            } else {
                const state = await startConversation(alert);
                
                if (!state) {
                    throw new Error('فشل بدء المحادثة');
                }
                
                setConversationState(state);
                
                const firstMessage = {
                    message_from: 'system',
                    message_text: state.conversationHistory[state.conversationHistory.length - 1].content,
                    question_number: 1,
                    created_at: new Date().toISOString()
                };
                setMessages([firstMessage]);
            }
        } catch (error) {
            console.error('❌ خطأ في بدء المحادثة:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل بدء المحادثة: ' + error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const result = await uploadFile(file, 'alert-attachments');
            setUploadedFile({
                name: file.name,
                url: result.url
            });
            toast({
                title: 'تم رفع الملف',
                description: file.name
            });
        } catch (error) {
            console.error('❌ خطأ في الرفع:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل رفع الملف'
            });
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!currentAnswer.trim() && !uploadedFile) return;
        
        if (!conversationState) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'المحادثة غير جاهزة، حاول مرة أخرى'
            });
            return;
        }
        
        if (conversationState?.completed) return;

        setLoading(true);
        try {
            const employeeMessage = {
                message_from: 'employee',
                message_text: currentAnswer || (uploadedFile ? `[ملف مرفق: ${uploadedFile.name}]` : ''),
                attachment_url: uploadedFile?.url,
                question_number: conversationState.questionNumber,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, employeeMessage]);

            const result = await submitAnswer(
                conversationState,
                currentAnswer || `تم رفع ملف: ${uploadedFile.name}`,
                uploadedFile?.url
            );

            if (result.completed) {
                const finalMessage = {
                    message_from: 'system',
                    message_text: result.message,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, finalMessage]);
                setConversationState({ completed: true });
                
                toast({
                    title: 'تم إكمال المحادثة',
                    description: 'شكراً على ردك. سيتم مراجعة إفادتك.'
                });

                if (onComplete) {
                    setTimeout(() => onComplete(), 2000);
                }
            } else {
                const nextMessage = {
                    message_from: 'system',
                    message_text: result.message,
                    question_number: result.questionNumber,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, nextMessage]);
                setConversationState(result);
            }

            setCurrentAnswer('');
            setUploadedFile(null);
        } catch (error) {
            console.error('❌ خطأ في الإرسال:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل إرسال الرد: ' + error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const getAlertTypeLabel = (type) => {
        const labels = {
            absence: 'غياب',
            late: 'تأخير',
            early_leave: 'انصراف مبكر',
            loan_reminder: 'تذكير سلفة'
        };
        return labels[type] || type;
    };

    const getAlertTypeIcon = (type) => {
        return <AlertCircle className="h-4 w-4" />;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-cairo text-xl flex items-center gap-2">
                        {getAlertTypeIcon(alert?.alert_type)}
                        توضيح {getAlertTypeLabel(alert?.alert_type)}
                    </DialogTitle>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                        {employeeInfo?.employee_number && (
                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                <User className="h-3 w-3 text-blue-600" />
                                <span className="font-mono text-blue-600">{employeeInfo.employee_number}</span>
                            </div>
                        )}
                        {employeeInfo?.name_ar && (
                            <span className="font-semibold">{employeeInfo.name_ar}</span>
                        )}
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{alert ? new Date(alert.reference_date).toLocaleDateString('ar-SA') : ''}</span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.message_from === 'employee' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                    msg.message_from === 'employee'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-white border'
                                }`}
                            >
                                <p className="text-sm font-cairo whitespace-pre-wrap">{msg.message_text}</p>
                                {msg.attachment_url && (
                                    // --- التصحيح هنا: تمت إضافة وسم a ---
                                    <a
                                        href={msg.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs underline mt-2 block hover:text-blue-200"
                                    >
                                        عرض المرفق
                                    </a>
                                )}
                                <p className="text-xs opacity-70 mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString('ar-SA', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white border rounded-lg p-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {!conversationState?.completed && (
                    <div className="space-y-2">
                        {uploadedFile && (
                            <div className="text-xs bg-blue-50 p-2 rounded flex items-center justify-between">
                                <span className="font-cairo">📎 {uploadedFile.name}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setUploadedFile(null)}
                                >
                                    ✕
                                </Button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="اكتب إجابتك هنا..."
                                className="font-cairo resize-none"
                                rows={3}
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                            <div className="flex flex-col gap-2">
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        disabled={loading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || (!currentAnswer.trim() && !uploadedFile)}
                                    size="icon"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {conversationState?.completed && (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-cairo text-green-700">
                            ✅ تم إكمال المحادثة بنجاح
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AlertChatDialog;