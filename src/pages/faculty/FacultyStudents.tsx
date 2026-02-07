import { useState, useEffect } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Input } from '@/components/ui/input';
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
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  register_number: string;
  section: string;
  year: string;
  dob: string;
}

export default function FacultyStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: faculty } = await supabase
        .from('faculty')
        .select('id, section')
        .eq('user_id', user.id)
        .single();

      if (faculty) {
        // Fetch students assigned to this tutor OR in the tutor's section
        let query = supabase
          .from('students')
          .select('*')
          .order('roll_number');

        if (faculty.section) {
          query = query.eq('section', faculty.section as any);
        } else {
          query = query.eq('tutor_id', faculty.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setStudents(data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            My Students
          </h1>
          <p className="text-muted-foreground">
            Students assigned to you as tutor
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">{filteredStudents.length} students</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students assigned to you yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Register Number</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.roll_number}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.register_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.section}</Badge>
                      </TableCell>
                      <TableCell>{student.year}</TableCell>
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
