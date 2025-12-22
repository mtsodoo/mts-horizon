import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from 'antd';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone } from 'lucide-react';

const roleColors = {
  manager: 'default',
  member: 'secondary',
  viewer: 'outline'
};

const roleLabels = {
  manager: 'مدير المشروع',
  member: 'عضو فريق',
  viewer: 'مشاهد'
};

const ProjectTeamCard = ({ member }) => {
  return (
    <Card className="overflow-hidden hover:bg-accent/5 transition-colors">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar size={48} src={member.profile?.employee_photo_url}>
          {member.profile?.name_ar?.charAt(0)}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold truncate">{member.profile?.name_ar}</h4>
            <Badge variant={roleColors[member.role]}>{roleLabels[member.role]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{member.profile?.job_title || 'موظف'}</p>
          <div className="flex gap-3 mt-2">
            {member.profile?.phone && (
              <a href={`tel:${member.profile.phone}`} className="text-muted-foreground hover:text-primary">
                <Phone className="w-3 h-3" />
              </a>
            )}
             {/* Assuming email is available in profile or we handle generic contact */}
             <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                {member.is_active ? 'نشط' : 'غير نشط'}
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectTeamCard;