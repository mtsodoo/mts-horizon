import React from 'react';

const attendanceStatusConfig = {
    present: { label: 'حاضر', color: 'bg-green-500' },
    late: { label: 'متأخر', color: 'bg-orange-500' },
    absent: { label: 'غائب', color: 'bg-red-500' },
    on_leave: { label: 'إجازة', color: 'bg-blue-500' },
    
    // Justification based statuses
    unjustified_absence: { label: 'قيد التبرير', color: 'bg-yellow-500' },
    medical_excuse: { label: 'عذر طبي', color: 'bg-cyan-500' },
    annual_leave: { label: 'إجازة سنوية', color: 'bg-lime-500' },
    acceptable_reason: { label: 'سبب مقبول', color: 'bg-purple-500' },
    field_work: { label: 'مهمة عمل', color: 'bg-teal-500' },
    rejected: { label: 'غياب مرفوض', color: 'bg-red-700' },
    
    default: { label: 'غير معروف', color: 'bg-gray-400' },
};

/**
 * Returns the color class for a given attendance status.
 * @param {string} status - The attendance status.
 * @returns {string} The Tailwind CSS background color class.
 */
export const getAttendanceColor = (status) => {
    return attendanceStatusConfig[status]?.color || attendanceStatusConfig.default.color;
};

/**
 * Returns the label for a given attendance status.
 * @param {string} status - The attendance status.
 * @returns {string} The display label in Arabic.
 */
export const getAttendanceLabel = (status) => {
    return attendanceStatusConfig[status]?.label || attendanceStatusConfig.default.label;
};