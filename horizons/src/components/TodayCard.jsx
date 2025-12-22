import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Moon, Quote, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import wisdoms from '@/data/wisdoms.json';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const TodayCard = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hijriDate, setHijriDate] = useState('');

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

  const getDailyWisdom = () => {
    if (!user || !wisdoms || wisdoms.length === 0) return 'مرحباً بك في نظام MTS Supreme';
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

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500"></div>
      
      <CardContent className="p-5 h-full flex flex-col gap-4 relative z-10 text-white">
        
        {/* Time & Date Section - فوق */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-end gap-3" dir="ltr">
            <div className="text-5xl md:text-6xl font-bold tracking-tighter tabular-nums font-sans bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              {format(currentTime, 'hh:mm')}
            </div>
            <div className="flex flex-col mb-2 text-violet-300 font-medium text-base">
              <span>{format(currentTime, 'ss')}</span>
              <span className="uppercase text-[10px] tracking-wider">{isAM ? 'AM' : 'PM'}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-cairo font-semibold">{format(currentTime, 'EEEE, d MMMM', { locale: ar })}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-cairo font-semibold">{hijriDate}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        {/* Wisdom Section - تحت (تاخذ باقي المساحة) */}
        <div className="flex-1 w-full relative flex items-center">
          <Quote className="absolute -top-2 -right-2 text-white/5 w-16 h-16 -rotate-12" />
          
          <div className="relative z-10 bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-colors duration-500 group w-full">
            <div className="flex items-center justify-center gap-2 mb-3 text-orange-300">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase font-cairo">حكمة اليوم</span>
            </div>
            
            <blockquote className="text-base md:text-lg leading-relaxed font-medium text-white/90 font-cairo text-center group-hover:text-white transition-colors">
              "{wisdom}"
            </blockquote>
            
            <div className="mt-4 flex justify-center">
              <div className="w-12 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full"></div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default TodayCard;