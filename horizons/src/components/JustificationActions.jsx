import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Edit, Trash2 } from 'lucide-react';

const JustificationActions = ({ justification, onReview, onEdit, onDelete, onView }) => {
    return (
        <div className="flex items-center justify-center gap-1">
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(justification)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>عرض التفاصيل</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {justification.status === 'pending' && (
                 <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(justification)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>تعديل</p>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
            )}
           
             <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(justification)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>حذف</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

export default JustificationActions;