import { useState, useEffect } from 'react';
import { ClipboardCheck, Calendar, Users, Check, X, Loader2 } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  section: string;
}

interface AttendanceRecord {
  student_id: string;
  is_present: boolean;
}

export default function FacultyAttendance() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState('1');
  const [selectedSection, setSelectedSection] = useState('CSE A');
  const [subject, setSubject] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [existingAttendance, setExistingAttendance] = useState<string[]>([]);

  useEffect(() => {
    fetchStudents();
  }, [selectedSection]);

  useEffect(() => {
    checkExistingAttendance();
  }, [selectedDate, selectedHour, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_number, section')
        .eq('section', selectedSection as "CSE A" | "CSE B" | "CSE C" | "CSE D")
        .order('roll_number');

      if (error) throw error;
      setStudents(data || []);
      
      // Initialize attendance
      const initial: Record<string, boolean> = {};
      (data || []).forEach(s => { initial[s.id] = false; });
      setAttendance(initial);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAttendance = async () => {
    if (students.length === 0) return;

    try {
      const { data } = await supabase
        .from('attendance')
        .select('student_id, is_present')
        .eq('date', selectedDate)
        .eq('hour_number', parseInt(selectedHour))
        .in('student_id', students.map(s => s.id));

      if (data && data.length > 0) {
        const existing: Record<string, boolean> = {};
        data.forEach(a => { existing[a.student_id] = a.is_present; });
        setAttendance(prev => ({ ...prev, ...existing }));
        setExistingAttendance(data.map(a => a.student_id));
      } else {
        setExistingAttendance([]);
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const markAll = (present: boolean) => {
    const updated: Record<string, boolean> = {};
    students.forEach(s => { updated[s.id] = present; });
    setAttendance(updated);
  };

  const saveAttendance = async () => {
    if (!subject.trim()) {
      toast({
        title: 'Subject Required',
        description: 'Please enter the subject name.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Get faculty ID
      const { data: facultyData } = await supabase
        .from('faculty')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const records = students.map(student => ({
        student_id: student.id,
        faculty_id: facultyData?.id,
        date: selectedDate,
        hour_number: parseInt(selectedHour),
        subject: subject.trim(),
        is_present: attendance[student.id] || false,
      }));

      // Delete existing records for this date/hour
      if (existingAttendance.length > 0) {
        await supabase
          .from('attendance')
          .delete()
          .eq('date', selectedDate)
          .eq('hour_number', parseInt(selectedHour))
          .in('student_id', students.map(s => s.id));
      }

      // Insert new records
      const { error } = await supabase.from('attendance').insert(records);

      if (error) throw error;

      toast({
        title: 'Attendance Saved',
        description: `Marked attendance for ${students.length} students.`,
      });

      setExistingAttendance(students.map(s => s.id));
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to save attendance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Mark Attendance
          </h1>
          <p className="text-muted-foreground">
            Record student attendance by section and hour
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Section</label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSE A">CSE A</SelectItem>
                    <SelectItem value="CSE B">CSE B</SelectItem>
                    <SelectItem value="CSE C">CSE C</SelectItem>
                    <SelectItem value="CSE D">CSE D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Hour</label>
                <Select value={selectedHour} onValueChange={setSelectedHour}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                      <SelectItem key={h} value={h.toString()}>
                        Hour {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="Enter subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={saveAttendance} disabled={saving || students.length === 0}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Attendance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{presentCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{absentCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students - {selectedSection}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => markAll(true)}>
                  <Check className="h-4 w-4 mr-1" />
                  Mark All Present
                </Button>
                <Button variant="outline" size="sm" onClick={() => markAll(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Mark All Absent
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found in this section.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono">{student.roll_number}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-4">
                          <Checkbox
                            checked={attendance[student.id] || false}
                            onCheckedChange={() => toggleAttendance(student.id)}
                          />
                          <Badge
                            variant={attendance[student.id] ? 'default' : 'destructive'}
                            className={attendance[student.id] ? 'bg-success' : ''}
                          >
                            {attendance[student.id] ? 'Present' : 'Absent'}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </FacultyLayout>
  );
}
