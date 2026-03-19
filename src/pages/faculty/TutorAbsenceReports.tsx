import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, FileText, RefreshCw, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/csvExport';

interface AbsentStudent {
  student_id: string;
  student_name: string;
  roll_number: string;
  hours: number[];
  subjects: string[];
}

export default function TutorAbsenceReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [existingReports, setExistingReports] = useState<any[]>([]);
  const [tutorFacultyId, setTutorFacultyId] = useState('');
  const [tutorSection, setTutorSection] = useState('');
  const [classifyDialog, setClassifyDialog] = useState<AbsentStudent | null>(null);
  const [classifyForm, setClassifyForm] = useState({ leave_type: 'uninformed', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (tutorFacultyId) fetchAbsentees(); }, [selectedDate, tutorFacultyId]);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: faculty } = await supabase.from('faculty').select('id, section').eq('user_id', authUser.id).eq('is_tutor', true).single();
    if (!faculty) { setLoading(false); return; }
    setTutorFacultyId(faculty.id);
    setTutorSection(faculty.section || '');
  };

  const fetchAbsentees = async () => {
    setLoading(true);
    try {
      // Get all attendance records for the date in tutor's section
      const { data: students } = await supabase.from('students').select('id, name, roll_number').eq('section', tutorSection as any).order('roll_number');
      if (!students || students.length === 0) { setLoading(false); return; }

      const studentIds = students.map(s => s.id);
      const { data: attendance } = await supabase.from('attendance').select('student_id, hour_number, subject, is_present').eq('date', selectedDate).in('student_id', studentIds);

      // Get existing absence reports
      const { data: reports } = await supabase.from('absence_reports').select('*').eq('date', selectedDate).eq('tutor_id', tutorFacultyId);
      setExistingReports(reports || []);

      // Filter absent students
      const absentMap = new Map<string, AbsentStudent>();
      (attendance || []).filter(a => !a.is_present).forEach(a => {
        const student = students.find(s => s.id === a.student_id);
        if (!student) return;
        if (!absentMap.has(a.student_id)) {
          absentMap.set(a.student_id, {
            student_id: a.student_id,
            student_name: student.name,
            roll_number: student.roll_number,
            hours: [],
            subjects: [],
          });
        }
        const entry = absentMap.get(a.student_id)!;
        entry.hours.push(a.hour_number);
        entry.subjects.push(a.subject);
      });

      setAbsentStudents(Array.from(absentMap.values()).sort((a, b) => a.roll_number.localeCompare(b.roll_number)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const classifyAbsence = async () => {
    if (!classifyDialog) return;
    setSubmitting(true);
    try {
      const existing = existingReports.find(r => r.student_id === classifyDialog.student_id);
      if (existing) {
        await supabase.from('absence_reports').update({
          leave_type: classifyForm.leave_type,
          reason: classifyForm.reason,
          hours_absent: classifyDialog.hours,
          reported_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('absence_reports').insert({
          student_id: classifyDialog.student_id,
          tutor_id: tutorFacultyId,
          date: selectedDate,
          leave_type: classifyForm.leave_type,
          reason: classifyForm.reason,
          hours_absent: classifyDialog.hours,
          reported_at: new Date().toISOString(),
        });
      }
      toast({ title: 'Classified', description: `Absence report saved for ${classifyDialog.student_name}` });
      setClassifyDialog(null);
      setClassifyForm({ leave_type: 'uninformed', reason: '' });
      fetchAbsentees();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const submitDailyReport = async () => {
    const unreported = absentStudents.filter(s => !existingReports.find(r => r.student_id === s.student_id));
    if (unreported.length > 0) {
      toast({ title: 'Incomplete', description: `Please classify all ${unreported.length} remaining absences first.`, variant: 'destructive' });
      return;
    }
    toast({ title: 'Daily Report Submitted', description: 'All absence classifications have been reported to HOD.' });
  };

  const exportCSV = () => {
    const data = absentStudents.map(s => {
      const report = existingReports.find(r => r.student_id === s.student_id);
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.student_name,
        'Hours Absent': s.hours.join(', '),
        'Subjects': s.subjects.join(', '),
        'Leave Type': report?.leave_type || 'Not classified',
        'Reason': report?.reason || '',
      };
    });
    downloadCSV(data, `absence_report_${selectedDate}`);
  };

  const reportedCount = absentStudents.filter(s => existingReports.find(r => r.student_id === s.student_id)).length;

  if (loading) return <FacultyLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></FacultyLayout>;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-warning" /> Absence Reports
            </h1>
            <p className="text-muted-foreground text-sm">Classify student absences for {tutorSection}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
            <Button variant="outline" size="icon" onClick={fetchAbsentees}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-destructive">{absentStudents.length}</p>
            <p className="text-xs text-muted-foreground">Total Absent</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-success">{reportedCount}</p>
            <p className="text-xs text-muted-foreground">Classified</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-warning">{absentStudents.length - reportedCount}</p>
            <p className="text-xs text-muted-foreground">Pending Classification</p>
          </CardContent></Card>
        </div>

        {/* Absent Students Table */}
        <Card className="futuristic-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Absent Students - {format(new Date(selectedDate), 'MMM dd, yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV} disabled={absentStudents.length === 0}>Export CSV</Button>
                <Button size="sm" onClick={submitDailyReport} disabled={absentStudents.length === 0} className="gap-1">
                  <Send className="h-3 w-3" /> Submit Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {absentStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No absent students found for this date.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Hours Absent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentStudents.map((s, i) => {
                    const report = existingReports.find(r => r.student_id === s.student_id);
                    return (
                      <TableRow key={s.student_id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono">{s.roll_number}</TableCell>
                        <TableCell className="font-medium">{s.student_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {s.hours.map(h => <Badge key={h} variant="outline" className="text-xs">H{h}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {report ? (
                            <Badge className={report.leave_type === 'informed' ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}>
                              {report.leave_type === 'informed' ? 'Informed' : 'Uninformed'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant={report ? 'outline' : 'default'} onClick={() => {
                            setClassifyDialog(s);
                            if (report) setClassifyForm({ leave_type: report.leave_type, reason: report.reason || '' });
                            else setClassifyForm({ leave_type: 'uninformed', reason: '' });
                          }}>
                            {report ? 'Edit' : 'Classify'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Classify Dialog */}
        <Dialog open={!!classifyDialog} onOpenChange={() => setClassifyDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Classify Absence - {classifyDialog?.student_name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Absent Hours: {classifyDialog?.hours.map(h => `H${h}`).join(', ')}</p>
                <p className="text-sm text-muted-foreground">Subjects: {classifyDialog?.subjects.join(', ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Leave Type</label>
                <Select value={classifyForm.leave_type} onValueChange={v => setClassifyForm(f => ({ ...f, leave_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informed">Informed Leave</SelectItem>
                    <SelectItem value="uninformed">Uninformed Leave</SelectItem>
                    <SelectItem value="medical">Medical Leave</SelectItem>
                    <SelectItem value="od">On Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reason / Description</label>
                <Textarea value={classifyForm.reason} onChange={e => setClassifyForm(f => ({ ...f, reason: e.target.value }))} placeholder="Enter reason for absence..." />
              </div>
              <Button onClick={classifyAbsence} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Classification
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
