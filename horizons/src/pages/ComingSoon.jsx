import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Construction } from 'lucide-react';

const ComingSoonPage = ({ pageTitle = "Coming Soon" }) => { // Added default prop value
    return (
        <>
            <Helmet>
                <title>{pageTitle} | Coming Soon</title>
            </Helmet>
            <motion.div
                className="flex flex-col items-center justify-center h-full text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Construction className="w-24 h-24 text-blue-500 mb-6" />
                <h1 className="text-4xl font-bold mb-2">Coming Soon!</h1>
                <p className="text-lg text-muted-foreground">
                    The "{pageTitle}" module is under construction. Awesome features are on the way!
                </p>
            </motion.div>
        </>
    );
};

export default ComingSoonPage;