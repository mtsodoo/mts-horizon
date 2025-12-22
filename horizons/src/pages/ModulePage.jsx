import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageTitle from '@/components/PageTitle';

const ModulePage = ({ title, icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageTitle title={title} icon={icon} />
      <Card>
        <CardHeader>
          <CardTitle>Welcome to {title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This module is under active development. Exciting features for managing {title.toLowerCase()} are coming soon! Stay tuned. 🚀
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ModulePage;