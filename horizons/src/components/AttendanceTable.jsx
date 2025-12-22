import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatDuration = (minutes) => {
  if (isNaN(minutes) || minutes < 0) return '---';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} س و ${remainingMinutes} د`;
};

const AttendanceTable = ({ attendanceByDay, loading }) => {
  
  const columns = useMemo(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() ? (
          <button
            {...{
              onClick: row.getToggleExpandedHandler(),
              style: { cursor: 'pointer' },
            }}
          >
            {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
          </button>
        ) : null;
      },
    },
    {
      accessorKey: 'work_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {"التاريخ"}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.getValue('work_date')), 'PPP'),
    },
    {
      id: 'total_hours',
      header: "إجمالي ساعات العمل",
      cell: ({ row }) => {
        const records = row.original.records;
        if (!records || records.length === 0) return '---';
        
        const totalMinutes = records.reduce((acc, record) => {
          if (record.check_in && record.check_out) {
            return acc + differenceInMinutes(parseISO(record.check_out), parseISO(record.check_in));
          }
          return acc;
        }, 0);

        return formatDuration(totalMinutes);
      },
    },
    {
      accessorKey: 'status',
      header: "الحالة",
      cell: ({ row }) => {
        const status = row.getValue('status');
        let statusText = 'غير محدد';
        let statusClass = 'bg-gray-200 text-gray-800';

        if (status === 'Present') {
            statusText = 'حاضر';
            statusClass = 'bg-green-200 text-green-800';
        } else if (status === 'Late') {
            statusText = 'متأخر';
            statusClass = 'bg-orange-200 text-orange-800';
        } else if (status === 'Absent') {
            statusText = 'غائب';
            statusClass = 'bg-red-200 text-red-800';
        }
        
        return <span className={`font-semibold px-3 py-1 rounded-full text-xs ${statusClass}`}>{statusText}</span>;
      },
    },
  ], []);

  const table = useReactTable({
    data: attendanceByDay || [],
    columns,
    getRowCanExpand: row => row.original.records && row.original.records.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      sorting: [{ id: 'work_date', desc: true }],
    },
  });

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
             <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  جاري تحميل بيانات الحضور...
                </TableCell>
              </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map(row => (
              <React.Fragment key={row.id}>
                <TableRow data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && (
                  <TableRow>
                    <TableCell colSpan={columns.length}>
                       <div className="p-4 bg-muted/50">
                        <h4 className="font-bold mb-2">التفاصيل:</h4>
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>وقت الدخول</TableHead>
                               <TableHead>وقت الخروج</TableHead>
                               <TableHead>المدة</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                            {row.original.records.map(record => (
                               <TableRow key={record.id}>
                                <TableCell>{format(parseISO(record.check_in), 'p')}</TableCell>
                                <TableCell>{record.check_out ? format(parseISO(record.check_out), 'p') : '---'}</TableCell>
                                <TableCell>{record.check_out ? formatDuration(differenceInMinutes(parseISO(record.check_out), parseISO(record.check_in))) : '---'}</TableCell>
                               </TableRow>
                            ))}
                           </TableBody>
                         </Table>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {"لا توجد سجلات حضور"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AttendanceTable;