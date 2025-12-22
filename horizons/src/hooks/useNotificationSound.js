import { useCallback, useRef, useEffect } from 'react';

const useNotificationSound = () => {
    const audioContextRef = useRef(null);
    const isUnlockedRef = useRef(false);

    // فتح AudioContext بعد أول تفاعل من المستخدم
    useEffect(() => {
        const unlockAudio = () => {
            if (!isUnlockedRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                // تشغيل صوت صامت لفتح القفل
                const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                source.start(0);
                isUnlockedRef.current = true;
                console.log('🔊 Audio unlocked!');
            }
        };

        // فتح الصوت عند أي تفاعل
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => document.addEventListener(event, unlockAudio, { once: true }));

        return () => {
            events.forEach(event => document.removeEventListener(event, unlockAudio));
        };
    }, []);

    const playSound = useCallback((type = 'default') => {
        try {
            // إنشاء AudioContext جديد إذا لم يكن موجوداً
            const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();

            // التأكد من أن AudioContext يعمل
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // أنواع مختلفة من الأصوات
            const sounds = {
                default: { freq: 800, duration: 200, volume: 0.5 },
                success: { freq: 1200, duration: 150, volume: 0.4 },
                warning: { freq: 600, duration: 250, volume: 0.5 },
                error: { freq: 400, duration: 350, volume: 0.5 },
                message: { freq: 880, duration: 180, volume: 0.5 },
                notification: { freq: 1000, duration: 200, volume: 0.6 }
            };

            const sound = sounds[type] || sounds.default;

            oscillator.frequency.value = sound.freq;
            oscillator.type = 'sine';

            // رفع مستوى الصوت
            gainNode.gain.setValueAtTime(sound.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + sound.duration / 1000);

            console.log(`🔔 Playing sound: ${type}`);
        } catch (error) {
            console.log('Sound error:', error);
        }
    }, []);

    // صوت مزدوج للتنبيهات المهمة
    const playDoubleBeep = useCallback(() => {
        playSound('notification');
        setTimeout(() => playSound('notification'), 250);
    }, [playSound]);

    // صوت ثلاثي للتنبيهات العاجلة
    const playTripleBeep = useCallback(() => {
        playSound('warning');
        setTimeout(() => playSound('warning'), 200);
        setTimeout(() => playSound('warning'), 400);
    }, [playSound]);

    return { playSound, playDoubleBeep, playTripleBeep };
};

export default useNotificationSound;