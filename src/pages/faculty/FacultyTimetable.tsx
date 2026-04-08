import { useState, useEffect } from 'react';
import { Calendar, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  hour_number: number;
  subject: string;
  section: string;
  faculty_id: string;
}

const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = [1, 2, 3, 4, 5, 6, 7, 8];
const allSections = ['CSE A', 'CSE B', 'CSE C', 'CSE D'];

export default function FacultyTimetable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyDbId, setFacultyDbId] = useState('');
  const [isTutor, setIsTutor] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ day: '1', hour: '1', subject: '', section: '', faculty_id: '' });
  const [facultySections, setFacultySections] = useState<string[]>([]);
  const [facultySubjects, setFacultySubjects] = useState<string[]>([]);

  // For tutor: list all faculty to assign
  const [allFaculty, setAllFaculty] = useState<{ id: string; name: string; faculty_id: string }[]>([]);
  const [tutorSection, setTutorSection] = useState('');

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: faculty } = await supabase
        .from('faculty')
        .select('id, is_tutor, section, sections, current_subjects')
        .eq('user_id', authUser.id)
        .single();

      if (faculty) {
        setFacultyDbId(faculty.id);
        setIsTutor(!!faculty.is_tutor);
        setTutorSection(faculty.section || '');
        setFacultySections((faculty.sections as string[]) || (faculty.section ? [faculty.section] : []));
        setFacultySubjects((faculty.current_subjects as string[]) || []);

        if (faculty.is_tutor && faculty.section) {
          // Tutor sees entire section timetable
          const { data } = await supabase
            .from('timetable')
            .select('*')
            .eq('section', faculty.section as any)
            .order('day_of_week')
            .order('hour_number');
          setEntries(data || []);

          // Fetch all faculty for assignment
          const { data: fList } = await supabase.from('faculty').select('id, name, faculty_id').order('name');
          setAllFaculty(fList || []);
        } else {
          // Regular faculty sees their own entries
          const { data } = await supabase
            .from('timetable')
            .select('*')
            .eq('faculty_id', faculty.id)
            .order('day_of_week')
            .order('hour_number');
          setEntries(data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntry = (day: number, hour: number) => {
    return entries.find(e => e.day_of_week === day && e.hour_number === hour);
  };

  const getEntriesForSlot = (day: number, hour: number) => {
    return entries.filter(e => e.day_of_week === day && e.hour_number === hour);
  };

  const getFacultyName = (fid: string) => {
    const f = allFaculty.find(x => x.id === fid);
    return f ? f.name : '';
  };

  const addEntry = async () => {
    if (!form.subject) {
      toast({ title: 'Enter subject', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const assignFacultyId = isTutor ? (form.faculty_id || facultyDbId) : facultyDbId;
      const assignSection = isTutor ? (tutorSection || form.section) : form.section;

      if (!assignSection) {
        toast({ title: 'Select section', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Check if slot exists for the same section
      const existing = entries.find(
        e => e.day_of_week === parseInt(form.day) && e.hour_number === parseInt(form.hour)
          && e.section === assignSection
      );
      if (existing) {
        toast({ title: 'Slot occupied', description: 'This time slot already has an entry for this section.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('timetable').insert({
        day_of_week: parseInt(form.day),
        hour_number: parseInt(form.hour),
        subject: form.subject,
        section: assignSection as any,
        faculty_id: assignFacultyId,
      });

      if (error) throw error;
      toast({ title: 'Added', description: 'Timetable entry added.' });
      setAddOpen(false);
      setForm({ day: '1', hour: '1', subject: '', section: '', faculty_id: '' });
      fetchTimetable();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    try {
      await supabase.from('timetable').delete().eq('id', id);
      setEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Available sections for the add form
  const availableSections = isTutor && tutorSection
    ? [tutorSection]
    : facultySections.length > 0
      ? facultySections
      : allSections;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Timetable {isTutor && tutorSection ? `— ${tutorSection}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isTutor ? 'Manage your section timetable' : 'Your weekly class schedule — add or remove entries'}
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select value={form.day} onValueChange={v => setForm({ ...form, day: v })}>
                    <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6].map(d => (
                        <SelectItem key={d} value={d.toString()}>{dayNames[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.hour} onValueChange={v => setForm({ ...form, hour: v })}>
                    <SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger>
                    <SelectContent>
                      {hours.map(h => (
                        <SelectItem key={h} value={h.toString()}>Hour {h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {facultySubjects.length > 0 ? (
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                    <SelectContent>
                      {facultySubjects.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Subject name" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                )}

                {isTutor && allFaculty.length > 0 && (
                  <Select value={form.faculty_id} onValueChange={v => setForm({ ...form, faculty_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Assign Faculty" /></SelectTrigger>
                    <SelectContent>
                      {allFaculty.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.faculty_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {!(isTutor && tutorSection) && (
                  <Select value={form.section} onValueChange={v => setForm({ ...form, section: v })}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      {availableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                <Button onClick={addEntry} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No timetable entries found. Click "Add Entry" to configure your schedule.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 bg-muted text-sm font-medium">Day / Hour</th>
                      {hours.map(h => (
                        <th key={h} className="border border-border p-2 bg-muted text-sm font-medium">
                          Hour {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map(day => (
                      <tr key={day}>
                        <td className="border border-border p-2 font-medium text-sm bg-muted/50">
                          {dayNames[day]}
                        </td>
                        {hours.map(hour => {
                          const slotEntries = getEntriesForSlot(day, hour);
                          return (
                            <td key={hour} className="border border-border p-2 text-center relative group">
                              {slotEntries.length > 0 ? (
                                <div className="space-y-1">
                                  {slotEntries.map(entry => (
                                    <div key={entry.id} className="relative">
                                      <p className="text-sm font-medium">{entry.subject}</p>
                                      {isTutor && (
                                        <p className="text-xs text-muted-foreground">{getFacultyName(entry.faculty_id)}</p>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        {entry.section}
                                      </Badge>
                                      <Button
                                        variant="ghost" size="icon"
                                        className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                                        onClick={() => deleteEntry(entry.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FacultyLayout>
  );
}
