import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

const motivationalQuotes = [
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "It’s hard to beat a person who never gives up.", author: "Babe Ruth" },
    { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
];

const WelcomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [quote, setQuote] = useState({ quote: '', author: '' });
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        setQuote(randomQuote);

        const timer = setTimeout(() => {
            navigate('/');
        }, 10000);

        return () => clearTimeout(timer);
    }, [navigate]);

    const imageUrl = `https://source.unsplash.com/1600x900/?nature,water,motivation&t=${new Date().getTime()}`;
    
    // Extract a display name from the user object, defaulting to 'User'
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    return (
        <>
            <Helmet>
                <title>{t('welcome.greeting')} {displayName}!</title>
            </Helmet>
            <div className="relative h-screen w-screen overflow-hidden">
                <AnimatePresence>
                    {imageLoaded && (
                        <motion.div
                            className="absolute inset-0 z-10 bg-black/50 flex flex-col items-center justify-center text-white text-center p-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        >
                            <motion.h1 
                                className="text-5xl md:text-7xl font-bold mb-4"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.8, delay: 1 }}
                            >
                                {t('welcome.greeting')} {displayName}!
                            </motion.h1>
                            <motion.p 
                                className="text-2xl md:text-4xl italic"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.8, delay: 1.3 }}
                            >
                                "{quote.quote}"
                            </motion.p>
                            <motion.p 
                                className="text-xl md:text-2xl mt-4"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.8, delay: 1.6 }}
                            >
                                - {quote.author}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.img
                    src={imageUrl}
                    alt="Motivational Background"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    onLoad={() => setImageLoaded(true)}
                />
            </div>
        </>
    );
};

export default WelcomePage;