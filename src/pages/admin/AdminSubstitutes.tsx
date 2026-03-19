import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck, Users, CalendarOff, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminSubstitutes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [allFaculty, setAllFaculty] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [selectedSub, setSelectedSub] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchAll(); }, [filterDate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leavesRes, subsRes, facultyRes, ttRes] = await Promise.all([
        supabase.from('faculty_leaves').select('*, faculty!faculty_leaves_faculty_id_fkey(id, name, faculty_id, section)').eq('status', 'approved').gte('end_date', filterDate).lte('start_date', filterDate),
        supabase.from('substitute_allocations').select('*, original:faculty!substitute_allocations_original_faculty_id_fkey(name, faculty_id), substitute:faculty!substitute_allocations_substitute_faculty_id_fkey(name, faculty_id)').eq('date', filterDate),
        supabase.from('faculty').select('id, name, faculty_id, section, current_subjects'),
        supabase.from('timetable').select('*'),
      ]);
      setLeaves(leavesRes.data || []);
      setSubstitutes(subsRes.data || []);
      setAllFaculty(facultyRes.data || []);
      setTimetable(ttRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getAffectedPeriods = (leave: any) => {
    const dayOfWeek = new Date(filterDate).getDay();
    return timetable.filter(t => t.faculty_id === leave.faculty?.id && t.day_of_week === dayOfWeek);
  };

  const getAvailableFaculty = (hour: number, section: string) => {
    const dayOfWeek = new Date(filterDate).getDay();
    const busyFacultyIds = timetable.filter(t => t.day_of_week === dayOfWeek && t.hour_number === hour).map(t => t.faculty_id);
    const onLeaveFacultyIds = leaves.map(l => l.faculty?.id).filter(Boolean);
    const alreadyAssigned = substitutes.filter(s => s.hour_number === hour && s.date === filterDate).map(s => s.substitute_faculty_id);
    return allFaculty.filter(f => !busyFacultyIds.includes(f.id) && !onLeaveFacultyIds.includes(f.id) && !alreadyAssigned.includes(f.id));
  };

  const assignSubstitute = async () => {
    if (!selectedSub || !assignDialog) return;
    try {
      const { error } = await supabase.from('substitute_allocations').insert({
        leave_id: assignDialog.leaveId,
        original_faculty_id: assignDialog.originalFacultyId,
        substitute_faculty_id: selectedSub,
        date: filterDate,
        hour_number: assignDialog.hour,
        section: assignDialog.section,
        subject: assignDialog.subject,
        status: 'assigned',
      });
      if (error) throw error;
      toast({ title: 'Substitute Assigned', description: 'Faculty has been assigned as substitute.' });
      setAssignDialog(null);
      setSelectedSub('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UserCheck className="h-7 w-7 text-primary" /> Substitute Management
            </h1>
            <p className="text-muted-foreground text-sm">Manage faculty substitutes for leaves</p>
          </div>
          <div className="flex items-center gap-3">
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-auto" />
            <Button variant="outline" size="icon" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <CalendarOff className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{leaves.length}</p>
            <p className="text-xs text-muted-foreground">Faculty on Leave</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">{leaves.reduce((sum, l) => sum + getAffectedPeriods(l).length, 0)}</p>
            <p className="text-xs text-muted-foreground">Affected Periods</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{substitutes.length}</p>
            <p className="text-xs text-muted-foreground">Substitutes Assigned</p>
          </CardContent></Card>
        </div>

        {/* Faculty on Leave + Affected Periods */}
        {leaves.length === 0 ? (
          <Card className="futuristic-card"><CardContent className="py-12 text-center text-muted-foreground">
            <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No faculty on approved leave for {format(new Date(filterDate), 'MMM dd, yyyy')}</p>
          </CardContent></Card>
        ) : (
          leaves.map(leave => {
            const periods = getAffectedPeriods(leave);
            return (
              <Card key={leave.id} className="futuristic-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CalendarOff className="h-5 w-5 text-warning" />
                      {leave.faculty?.name} ({leave.faculty?.faculty_id})
                    </span>
                    <Badge variant="outline" className="capitalize">{leave.leave_type} Leave</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {periods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scheduled classes on this day.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hour</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Substitute</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {periods.map(p => {
                          const existingSub = substitutes.find(s => s.hour_number === p.hour_number && s.original_faculty_id === leave.faculty?.id && s.date === filterDate);
                          return (
                            <TableRow key={p.id}>
                              <TableCell>Hour {p.hour_number}</TableCell>
                              <TableCell>{p.section}</TableCell>
                              <TableCell>{p.subject}</TableCell>
                              <TableCell>
                                {existingSub ? (
                                  <Badge className="bg-success/20 text-success border-success/30">{existingSub.substitute?.name}</Badge>
                                ) : (
                                  <Badge variant="destructive">Unassigned</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {!existingSub && (
                                  <Button size="sm" onClick={() => setAssignDialog({
                                    leaveId: leave.id, originalFacultyId: leave.faculty?.id,
                                    hour: p.hour_number, section: p.section, subject: p.subject,
                                  })}>
                                    Assign
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* All Substitutes Today */}
        {substitutes.length > 0 && (
          <Card className="futuristic-card">
            <CardHeader><CardTitle>Today's Substitute Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hour</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Original Faculty</TableHead>
                    <TableHead>Substitute</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {substitutes.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>Hour {s.hour_number}</TableCell>
                      <TableCell>{s.section}</TableCell>
                      <TableCell>{s.subject}</TableCell>
                      <TableCell>{s.original?.name}</TableCell>
                      <TableCell className="font-medium">{s.substitute?.name}</TableCell>
                      <TableCell><Badge className="bg-success/20 text-success border-success/30 capitalize">{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Assign Dialog */}
        <Dialog open={!!assignDialog} onOpenChange={() => { setAssignDialog(null); setSelectedSub(''); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Substitute Faculty</DialogTitle></DialogHeader>
            {assignDialog && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Hour:</span> {assignDialog.hour}</div>
                  <div><span className="text-muted-foreground">Section:</span> {assignDialog.section}</div>
                  <div><span className="text-muted-foreground">Subject:</span> {assignDialog.subject}</div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Available Faculty</label>
                  <Select value={selectedSub} onValueChange={setSelectedSub}>
                    <SelectTrigger><SelectValue placeholder="Select substitute" /></SelectTrigger>
                    <SelectContent>
                      {getAvailableFaculty(assignDialog.hour, assignDialog.section).map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.faculty_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignSubstitute} disabled={!selectedSub} className="w-full">Assign Substitute</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
