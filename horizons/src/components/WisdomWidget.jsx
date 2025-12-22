import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Sun, Moon, Quote, Sparkles, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import wisdoms from '@/data/wisdoms.json';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const WisdomWidget = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hijriDate, setHijriDate] = useState('');
  const [adminMessages, setAdminMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    try {
      const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Riyadh'
      }).format(currentTime);
      setHijriDate(hijri);
    } catch (error) {
      setHijriDate('');
    }
  }, [currentTime]);
  
  useEffect(() => {
    const fetchAdminMessages = async () => {
      try {
        setLoadingMessages(true);
        const {
          data,
          error
        } = await supabase.from('admin_messages').select('*').eq('is_active', true).order('created_at', {
          ascending: false
        }).limit(3);
        if (error) throw error;
        setAdminMessages(data || []);
      } catch (error) {
        console.error('Error fetching admin messages:', error);
        setAdminMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchAdminMessages();
  }, []);
  
  const getDailyWisdom = () => {
    if (!user || wisdoms.length === 0) return 'مرحباً بك في نظام MTS Supreme';
    const start = new Date(currentTime.getFullYear(), 0, 0);
    const diff = currentTime - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const userHash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const wisdomIndex = (userHash + dayOfYear) % wisdoms.length;
    return wisdoms[wisdomIndex];
  };
  
  const wisdom = getDailyWisdom();
  const hours = currentTime.getHours();
  const isAM = hours < 12;
  
  return <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* القسم الأيمن: الساعة والتواريخ والحكمة */}
            <Card className="relative overflow-hidden rounded-3xl border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500"></div>

                <CardContent className="p-8 relative z-10">
                    {/* الساعة الرقمية */}
                    <div className="flex flex-col items-center mb-8">
                        {/* Ensure hours are on the left and minutes on the right with LTR direction */}
                        <div className="flex items-center gap-3 mb-4" dir="ltr">
                            <span className="text-7xl md:text-8xl font-bold tracking-tight tabular-nums text-white font-sans">
                                {format(currentTime, 'hh')}
                            </span>
                            <span className="text-6xl md:text-7xl font-bold text-violet-400">:</span>
                            <span className="text-7xl md:text-8xl font-bold tracking-tight tabular-nums text-white font-sans">
                                {format(currentTime, 'mm')}
                            </span>
                        </div>
                        
                        {/* اليوم */}
                        <div className="text-3xl font-bold text-white/90 mb-3 font-cairo">
                            {format(currentTime, 'EEEE', {
              locale: ar
            })}
                        </div>
                        
                        {/* التاريخ الميلادي والأيقونة */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                                <span className="text-lg font-semibold text-white font-cairo">
                                    {format(currentTime, 'MMMM', {
                  locale: ar
                })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                                <span className="text-lg font-semibold text-white font-cairo">
                                    {format(currentTime, 'd', {
                  locale: ar
                })}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                {isAM ? <Sun className="w-8 h-8 text-amber-400" /> : <Moon className="w-8 h-8 text-indigo-300" />}
                                <span className="text-xs font-semibold text-white/70 mt-1 font-cairo">
                                    {isAM ? 'صباحاً' : 'مساءً'}
                                </span>
                            </div>
                        </div>

                        {/* التاريخ الهجري */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-300" />
                                <span className="text-sm font-semibold text-white/80 font-cairo">
                                    {hijriDate || '...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ورقة اليوم */}
                    <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-5 text-white border border-white/20">
                        <Quote className="absolute -right-2 -top-2 text-white/10 w-16 h-16 transform rotate-12" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 text-orange-300">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs font-bold tracking-wide uppercase font-cairo">ورقة اليوم</span>
                            </div>
                            
                            <blockquote className="text-lg font-medium leading-relaxed text-white/90 font-cairo">
                                "{wisdom}"
                            </blockquote>
                        </div>

                        <div className="relative z-10 mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="text-xs text-white/60 font-cairo">إلهامك اليومي</span>
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                                <Quote className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* القسم الأيسر: رسائل الإدارة */}
            <Card className="relative overflow-hidden rounded-3xl border-0 shadow-xl bg-white">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

                <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 font-cairo">رسائل الإدارة</h3>
                                <p className="text-xs text-slate-500 font-cairo">آخر التحديثات </p>
                            </div>
                        </div>
                        {adminMessages.length > 0 && <div className="relative">
                                <Bell className="w-5 h-5 text-slate-400" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            </div>}
                    </div>

                    <div className="space-y-3 max-h-[520px] overflow-y-auto">
                        {loadingMessages ? <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-sm text-slate-500 font-cairo">جاري التحميل...</p>
                            </div> : adminMessages.length === 0 ? <div className="text-center py-8">
                                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 font-cairo">لا توجد رسائل حالياً</p>
                            </div> : adminMessages.map(msg => <div key={msg.id} className="group bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-all duration-200 cursor-pointer border border-slate-200 hover:border-blue-300 hover:shadow-md" onClick={() => navigate('/admin-messages')}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${msg.priority === 'high' ? 'bg-red-500' : msg.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors font-cairo">
                                                {msg.title}
                                            </h4>
                                        </div>
                                        <span className="text-xs text-slate-400 font-cairo">
                                            {formatDistanceToNow(new Date(msg.created_at), {
                  addSuffix: true,
                  locale: ar
                })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed pr-4 line-clamp-2 font-cairo">
                                        {msg.message}
                                    </p>
                                </div>)}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <button onClick={() => navigate('/admin-messages')} className="w-full py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-cairo">
                            عرض جميع الرسائل
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>;
};
export default WisdomWidget;