import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/csvExport';

export default function AdminAbsenceReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterSection, setFilterSection] = useState('all');

  useEffect(() => { fetchReports(); }, [selectedDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('absence_reports')
        .select('*, student:students!absence_reports_student_id_fkey(name, roll_number, section), tutor:faculty!absence_reports_tutor_id_fkey(name)')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });
      setReports(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtered = filterSection === 'all' ? reports : reports.filter(r => r.student?.section === filterSection);

  const exportReport = () => {
    downloadCSV(filtered.map(r => ({
      'Date': r.date,
      'Roll Number': r.student?.roll_number || '',
      'Student Name': r.student?.name || '',
      'Section': r.student?.section || '',
      'Leave Type': r.leave_type,
      'Reason': r.reason || '',
      'Hours Absent': (r.hours_absent || []).join(', '),
      'Reported By': r.tutor?.name || '',
    })), `absence_report_${selectedDate}`);
  };

  const stats = {
    total: filtered.length,
    informed: filtered.filter(r => r.leave_type === 'informed').length,
    uninformed: filtered.filter(r => r.leave_type === 'uninformed').length,
    medical: filtered.filter(r => r.leave_type === 'medical').length,
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-warning" /> Daily Absence Reports
            </h1>
            <p className="text-muted-foreground text-sm">HOD view of daily student absence classifications</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="CSE A">CSE A</SelectItem>
                <SelectItem value="CSE B">CSE B</SelectItem>
                <SelectItem value="CSE C">CSE C</SelectItem>
                <SelectItem value="CSE D">CSE D</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchReports}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Informed', value: stats.informed, color: 'text-success' },
            { label: 'Uninformed', value: stats.uninformed, color: 'text-destructive' },
            { label: 'Medical', value: stats.medical, color: 'text-primary' },
          ].map(s => (
            <Card key={s.label} className="futuristic-card"><CardContent className="pt-6 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>

        <Card className="futuristic-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Absence Report - {format(new Date(selectedDate), 'MMM dd, yyyy')}</CardTitle>
              <Button variant="outline" size="sm" onClick={exportReport} className="gap-1"><Download className="h-3 w-3" /> Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No absence reports for this date.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Tutor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono">{r.student?.roll_number}</TableCell>
                      <TableCell className="font-medium">{r.student?.name}</TableCell>
                      <TableCell>{r.student?.section}</TableCell>
                      <TableCell>
                        <Badge className={
                          r.leave_type === 'informed' ? 'bg-success/20 text-success border-success/30' :
                          r.leave_type === 'medical' ? 'bg-primary/20 text-primary border-primary/30' :
                          'bg-destructive/20 text-destructive border-destructive/30'
                        } variant="outline">{r.leave_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{r.reason || '-'}</TableCell>
                      <TableCell>{(r.hours_absent || []).map((h: number) => `H${h}`).join(', ')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.tutor?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
