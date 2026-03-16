import { useState, useEffect } from 'react';
import { CalendarCheck, Loader2, Download } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { downloadCSV } from '@/lib/csvExport';
import { generateAttendanceReportPDF } from '@/lib/pdfReports';

interface AttendanceRecord {
  id: string;
  date: string;
  hour_number: number;
  subject: string;
  is_present: boolean;
}

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [percentage, setPercentage] = useState<number | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ name: string; roll_number: string; section: string } | null>(null);

  useEffect(() => { fetchAttendance(); }, [user]);

  const fetchAttendance = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id, name, roll_number, section')
        .eq('user_id', authUser.id)
        .single();

      if (studentData) {
        setStudentInfo({ name: studentData.name, roll_number: studentData.roll_number, section: studentData.section });

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', studentData.id)
          .order('date', { ascending: false })
          .order('hour_number', { ascending: true })
          .limit(500);

        setRecords(attendanceData || []);

        const { data: percentageData } = await supabase.rpc('get_attendance_percentage', {
          _student_id: studentData.id,
        });
        if (percentageData !== null) setPercentage(percentageData);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = records.filter(r => r.is_present).length;
  const absentCount = records.filter(r => !r.is_present).length;

  const handleDownloadCSV = () => {
    downloadCSV(records.map(r => ({
      Date: new Date(r.date).toLocaleDateString(),
      Hour: r.hour_number,
      Subject: r.subject,
      Status: r.is_present ? 'Present' : 'Absent',
    })), `attendance-${studentInfo?.roll_number || 'report'}`);
  };

  const handleDownloadPDF = () => {
    if (!studentInfo) return;
    // Group by subject for PDF
    const subjectMap: Record<string, { present: number; total: number }> = {};
    records.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = { present: 0, total: 0 };
      subjectMap[r.subject].total++;
      if (r.is_present) subjectMap[r.subject].present++;
    });
    const attendanceData = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      present: data.present,
      total: data.total,
      percentage: Math.round((data.present / data.total) * 100),
    }));
    generateAttendanceReportPDF(
      studentInfo.name, studentInfo.roll_number, studentInfo.section,
      attendanceData, percentage || 0
    );
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-7 w-7 text-primary" />
              Attendance
            </h1>
            <p className="text-muted-foreground text-sm">View your attendance records</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={records.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={records.length === 0}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Overall Percentage</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{percentage !== null ? `${percentage}%` : '-'}</div>
                  {percentage !== null && <Progress value={percentage} className="h-2" />}
                </div>
              )}
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{records.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{presentCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{absentCount}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Attendance</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No attendance records found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hour</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>Hour {record.hour_number}</TableCell>
                      <TableCell>{record.subject}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={record.is_present ? 'default' : 'destructive'} className={record.is_present ? 'bg-green-600' : ''}>
                          {record.is_present ? 'Present' : 'Absent'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
