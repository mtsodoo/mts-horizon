import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ProjectStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="إجمالي المشاريع"
        value={stats.total}
        icon={FolderKanban}
        color="bg-blue-500"
        delay={0}
      />
      <StatCard
        title="مشاريع نشطة"
        value={stats.active}
        icon={Clock}
        color="bg-green-500"
        delay={0.1}
      />
      <StatCard
        title="مشاريع متأخرة"
        value={stats.delayed}
        icon={AlertTriangle}
        color="bg-red-500"
        delay={0.2}
      />
      <StatCard
        title="نسبة الإنجاز"
        value={`${stats.successRate}%`}
        icon={CheckCircle2}
        color="bg-purple-500"
        delay={0.3}
      />
    </div>
  );
};

export default ProjectStats;