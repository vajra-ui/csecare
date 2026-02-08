import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Plus,
  Search,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const facultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dob: z.string().min(1, 'Date of birth is required'),
  qualification: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).default(0),
  currentSubjects: z.string().optional(),
  section: z.enum(['CSE A', 'CSE B', 'CSE C', 'CSE D', 'none']).default('none'),
  isTutor: z.boolean().default(false),
});

type FacultyFormData = z.infer<typeof facultySchema>;

interface Faculty {
  id: string;
  faculty_id: string;
  name: string;
  dob: string;
  qualification: string | null;
  years_of_experience: number;
  current_subjects: string[] | null;
  section: string | null;
  is_tutor: boolean;
  created_at: string;
}

export default function AdminFaculty() {
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<FacultyFormData>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      name: '',
      dob: '',
      qualification: '',
      yearsOfExperience: 0,
      currentSubjects: '',
      section: 'none',
      isTutor: false,
    },
  });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaculty(data || []);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch faculty',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FacultyFormData) => {
    setCreating(true);
    try {
      const subjects = data.currentSubjects
        ? data.currentSubjects.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const response = await supabase.functions.invoke('create-user', {
        body: {
          type: 'faculty',
          data: {
            name: data.name,
            dob: data.dob,
            qualification: data.qualification || null,
            yearsOfExperience: data.yearsOfExperience,
            currentSubjects: subjects,
            section: data.section === 'none' ? null : data.section,
            isTutor: data.isTutor,
          },
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Faculty Created',
        description: `${data.name} has been added with ID: ${response.data.faculty?.faculty_id}`,
      });

      form.reset();
      setIsDialogOpen(false);
      fetchFaculty();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create faculty',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleTutor = async (facultyMember: Faculty) => {
    try {
      const { error } = await supabase
        .from('faculty')
        .update({ is_tutor: !facultyMember.is_tutor })
        .eq('id', facultyMember.id);

      if (error) throw error;

      toast({
        title: facultyMember.is_tutor ? 'Tutor Removed' : 'Tutor Assigned',
        description: `${facultyMember.name} is ${facultyMember.is_tutor ? 'no longer' : 'now'} a tutor.`,
      });

      fetchFaculty();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tutor status',
        variant: 'destructive',
      });
    }
  };

  const filteredFaculty = faculty.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.faculty_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-secondary" />
              Faculty Management
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Add faculty, assign tutors, and manage teaching staff
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Faculty</DialogTitle>
                <DialogDescription>
                  Faculty ID will be auto-generated. Login uses Faculty ID + DOB.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="qualification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualification</FormLabel>
                          <FormControl>
                            <Input placeholder="Ph.D, M.Tech" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yearsOfExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience (Years)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="currentSubjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Subjects</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Data Structures, Algorithms, DBMS (comma-separated)"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Section</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Section</SelectItem>
                            <SelectItem value="CSE A">CSE A</SelectItem>
                            <SelectItem value="CSE B">CSE B</SelectItem>
                            <SelectItem value="CSE C">CSE C</SelectItem>
                            <SelectItem value="CSE D">CSE D</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isTutor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Assign as Tutor</FormLabel>
                          <FormDescription>
                            Tutors can manage student records and approve OD requests
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Faculty
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or faculty ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">{filteredFaculty.length} faculty</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFaculty.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {faculty.length === 0 
                  ? 'No faculty added yet. Add your first faculty member above.'
                  : 'No faculty match your search.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faculty ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-sm">{f.faculty_id}</TableCell>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>{f.qualification || '-'}</TableCell>
                      <TableCell>{f.years_of_experience} years</TableCell>
                      <TableCell>
                        {f.section ? (
                          <Badge variant="outline">{f.section}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {f.is_tutor ? (
                          <Badge className="bg-success text-success-foreground">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Tutor
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Faculty</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTutor(f)}
                        >
                          {f.is_tutor ? 'Remove Tutor' : 'Make Tutor'}
                        </Button>
                      </TableCell>
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
