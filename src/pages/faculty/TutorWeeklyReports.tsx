import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, RefreshCw, Download, MessageSquare, Eye } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { downloadCSV } from '@/lib/csvExport';
import { pushNotification, warmMessages } from '@/lib/notifyWarm';

export default function TutorWeeklyReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState('');
  const [tutorSection, setTutorSection] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [commentDialog, setCommentDialog] = useState<any>(null);
  const [comment, setComment] = useState('');

  const weekStart = format(startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => { init(); }, []);
  useEffect(() => { if (tutorId) fetchData(); }, [weekOffset, tutorId]);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: faculty } = await supabase.from('faculty').select('id, section').eq('user_id', authUser.id).eq('is_tutor', true).single();
    if (!faculty) { setLoading(false); return; }
    setTutorId(faculty.id);
    setTutorSection(faculty.section || '');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: studs } = await supabase.from('students').select('id, name, roll_number').eq('section', tutorSection as any).order('roll_number');
      setStudents(studs || []);

      if (studs && studs.length > 0) {
        const { data: acts } = await supabase.from('student_activities').select('*').in('student_id', studs.map(s => s.id)).gte('event_date', weekStart).lte('event_date', weekEnd);
        setActivities(acts || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getStudentActivities = (studentId: string) => activities.filter(a => a.student_id === studentId);

  const exportWeekly = () => {
    const data = students.map(s => {
      const acts = getStudentActivities(s.id);
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.name,
        'Activities Count': acts.length,
        'Activities': acts.map(a => `${a.title} (${a.category})`).join('; '),
        'Week': `${weekStart} to ${weekEnd}`,
      };
    });
    downloadCSV(data, `weekly_report_${weekStart}`);
  };

  const verifyActivity = async (activityId: string) => {
    await supabase.from('student_activities').update({ status: 'verified', verified_by: tutorId, verified_at: new Date().toISOString() }).eq('id', activityId);
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      const { data: stud } = await supabase.from('students').select('user_id').eq('id', activity.student_id).maybeSingle();
      if (stud?.user_id) {
        await pushNotification({
          userId: stud.user_id,
          ...warmMessages.achievementApproved(activity.title || 'Your achievement'),
          link: '/student/achievements',
          dedupeKey: `activity:${activityId}:verified`,
        });
      }
    }
    toast({ title: 'Verified', description: 'Activity marked as verified.' });
    fetchData();
  };

  if (loading) return <FacultyLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></FacultyLayout>;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" /> Weekly Reports
            </h1>
            <p className="text-muted-foreground text-sm">Student activity reports for {tutorSection}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>← Prev Week</Button>
            <Badge variant="outline" className="px-3 py-1">{format(new Date(weekStart), 'MMM dd')} - {format(new Date(weekEnd), 'MMM dd, yyyy')}</Badge>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>Next Week →</Button>
            <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-primary">{activities.length}</p>
            <p className="text-xs text-muted-foreground">Activities This Week</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-success">{activities.filter(a => a.status === 'verified').length}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent></Card>
        </div>

        {/* Student-wise Report */}
        <Card className="futuristic-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Student-wise Weekly Report</CardTitle>
              <Button variant="outline" size="sm" onClick={exportWeekly} className="gap-1"><Download className="h-3 w-3" /> Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => {
                  const acts = getStudentActivities(s.id);
                  const verified = acts.filter(a => a.status === 'verified').length;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono">{s.roll_number}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant={acts.length > 0 ? 'default' : 'outline'}>{acts.length}</Badge>
                      </TableCell>
                      <TableCell>
                        {acts.length > 0 ? (
                          <Badge className="bg-success/20 text-success border-success/30">{verified}/{acts.length}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {acts.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setViewStudent(s)} className="gap-1">
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Student Activities Dialog */}
        <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{viewStudent?.name}'s Activities</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-96 overflow-auto">
              {viewStudent && getStudentActivities(viewStudent.id).map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">{a.category}</Badge>
                          <Badge className={a.status === 'verified' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>{a.status}</Badge>
                        </div>
                        <h4 className="font-semibold">{a.title}</h4>
                        <p className="text-sm text-muted-foreground">{a.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.event_date), 'MMM dd, yyyy')}</p>
                        {a.proof_file_name && <p className="text-xs text-primary mt-1">📎 {a.proof_file_name}</p>}
                      </div>
                      {a.status === 'pending' && (
                        <Button size="sm" onClick={() => verifyActivity(a.id)}>Verify</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
