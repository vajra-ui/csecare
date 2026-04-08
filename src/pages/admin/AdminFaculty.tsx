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
  Pencil,
  Trash2,
} from 'lucide-react';
import { BulkUpload, FieldDef, UploadResult } from '@/components/admin/BulkUpload';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

const SECTIONS = ['CSE A', 'CSE B', 'CSE C', 'CSE D'] as const;

const facultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dob: z.string().min(1, 'Date of birth is required'),
  qualification: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).default(0),
  currentSubjects: z.string().optional(),
  sections: z.array(z.string()).default([]),
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
  sections: string[] | null;
  is_tutor: boolean;
  user_id: string | null;
  created_at: string;
}

export default function AdminFaculty() {
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FacultyFormData>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      name: '',
      dob: '',
      qualification: '',
      yearsOfExperience: 0,
      currentSubjects: '',
      sections: [],
      isTutor: false,
    },
  });

  const editForm = useForm<FacultyFormData>({
    resolver: zodResolver(facultySchema),
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
      toast({ title: 'Error', description: 'Failed to fetch faculty', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const validateTutorAssignment = (data: FacultyFormData, excludeId?: string): string | null => {
    if (!data.isTutor) return null;
    if (data.sections.length === 0) return 'A Tutor must be assigned to at least one section.';

    // For tutor, only allow ONE section (tutor is 1:1 with section)
    if (data.sections.length > 1) return 'A Tutor can only be assigned to one section.';

    const tutorSection = data.sections[0];

    // Check if section already has a tutor
    const sectionTutor = faculty.find(
      f => f.id !== excludeId && f.is_tutor && (f.sections?.includes(tutorSection) || f.section === tutorSection)
    );
    if (sectionTutor) {
      return `Section ${tutorSection} already has a Tutor: ${sectionTutor.name}.`;
    }

    return null;
  };

  const onSubmit = async (data: FacultyFormData) => {
    const tutorError = validateTutorAssignment(data);
    if (tutorError) {
      toast({ title: 'Tutor Assignment Error', description: tutorError, variant: 'destructive' });
      return;
    }

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
            sections: data.sections,
            section: data.isTutor && data.sections.length === 1 ? data.sections[0] : (data.sections[0] || null),
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

  const openEditDialog = (f: Faculty) => {
    setEditingFaculty(f);
    editForm.reset({
      name: f.name,
      dob: f.dob,
      qualification: f.qualification || '',
      yearsOfExperience: f.years_of_experience || 0,
      currentSubjects: f.current_subjects?.join(', ') || '',
      sections: f.sections || (f.section ? [f.section] : []),
      isTutor: f.is_tutor || false,
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (data: FacultyFormData) => {
    if (!editingFaculty) return;

    const tutorError = validateTutorAssignment(data, editingFaculty.id);
    if (tutorError) {
      toast({ title: 'Tutor Assignment Error', description: tutorError, variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const subjects = data.currentSubjects
        ? data.currentSubjects.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const { error } = await supabase
        .from('faculty')
        .update({
          name: data.name,
          dob: data.dob,
          qualification: data.qualification || null,
          years_of_experience: data.yearsOfExperience,
          current_subjects: subjects,
          sections: data.sections,
          section: data.isTutor && data.sections.length === 1 ? (data.sections[0] as any) : (data.sections[0] as any || null),
          is_tutor: data.isTutor,
        })
        .eq('id', editingFaculty.id);

      if (error) throw error;

      toast({ title: 'Faculty Updated', description: `${data.name} has been updated.` });
      setIsEditDialogOpen(false);
      setEditingFaculty(null);
      fetchFaculty();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update faculty',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFaculty) return;
    setDeleting(true);
    try {
      // Delete from faculty table (auth user remains but can't log in without a record)
      const { error } = await supabase
        .from('faculty')
        .delete()
        .eq('id', deletingFaculty.id);

      if (error) throw error;

      toast({ title: 'Faculty Deleted', description: `${deletingFaculty.name} has been removed.` });
      setDeletingFaculty(null);
      fetchFaculty();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete faculty',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredFaculty = faculty.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.faculty_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Bulk upload config ──
  const facultyFields: FieldDef[] = [
    { key: 'name', label: 'Name', required: true, aliases: ['faculty name', 'full name', 'teacher name'] },
    { key: 'dob', label: 'Date of Birth', required: true, aliases: ['date of birth', 'birthday', 'birth date'],
      validate: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Must be YYYY-MM-DD format' },
    { key: 'qualification', label: 'Qualification', required: false, aliases: ['qual', 'degree', 'education'] },
    { key: 'section', label: 'Section', required: false, aliases: ['sec', 'class', 'assigned section'],
      validate: (v: string) => !v || ['CSE A','CSE B','CSE C','CSE D'].includes(v) ? null : 'Must be CSE A/B/C/D or empty' },
    { key: 'is_tutor', label: 'Is Tutor', required: false, aliases: ['tutor', 'is tutor', 'tutor status'],
      validate: (v: string) => !v || ['true','false','yes','no','1','0'].includes(v.toLowerCase()) ? null : 'Must be true/false/yes/no' },
  ];

  const existingFacultyKeys = new Set(faculty.map(f => f.name));

  const handleBulkInsertFaculty = async (row: Record<string, string>): Promise<UploadResult> => {
    try {
      const isTutorVal = row.is_tutor?.toLowerCase();
      const isTutor = ['true', 'yes', '1'].includes(isTutorVal || '');
      const section = row.section && ['CSE A','CSE B','CSE C','CSE D'].includes(row.section) ? row.section : null;

      const response = await supabase.functions.invoke('create-user', {
        body: {
          type: 'faculty',
          data: {
            name: row.name,
            dob: row.dob,
            qualification: row.qualification || null,
            yearsOfExperience: 0,
            currentSubjects: [],
            section: section,
            isTutor: isTutor,
          },
        },
      });
      if (response.error) return { success: false, error: response.error.message };
      if (response.data?.error) return { success: false, error: response.data.error };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  };

  const FacultyFormFields = ({ formInstance, onSubmitFn, submitLabel, isSubmitting }: {
    formInstance: typeof form;
    onSubmitFn: (data: FacultyFormData) => void;
    submitLabel: string;
    isSubmitting: boolean;
  }) => (
    <Form {...formInstance}>
      <form onSubmit={formInstance.handleSubmit(onSubmitFn)} className="space-y-4">
        <FormField
          control={formInstance.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input placeholder="Dr. Jane Smith" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="dob"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={formInstance.control}
            name="qualification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qualification</FormLabel>
                <FormControl><Input placeholder="Ph.D, M.Tech" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formInstance.control}
            name="yearsOfExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience (Years)</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={formInstance.control}
          name="currentSubjects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Subjects</FormLabel>
              <FormControl>
                <Textarea placeholder="Data Structures, Algorithms (comma-separated)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="sections"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Sections</FormLabel>
              <FormDescription>Select one or more sections this faculty teaches in</FormDescription>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.map((sec) => (
                  <label key={sec} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/50 transition-colors">
                    <Checkbox
                      checked={field.value?.includes(sec)}
                      onCheckedChange={(checked) => {
                        const current = field.value || [];
                        if (checked) {
                          field.onChange([...current, sec]);
                        } else {
                          field.onChange(current.filter((s: string) => s !== sec));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{sec}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formInstance.control}
          name="isTutor"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Assign as Tutor</FormLabel>
                <FormDescription>Tutors can manage student records and approve OD requests</FormDescription>
              </div>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setIsEditDialogOpen(false); }}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
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
                <Plus className="mr-2 h-4 w-4" /> Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Faculty</DialogTitle>
                <DialogDescription>Faculty ID will be auto-generated. Login uses Faculty ID + DOB.</DialogDescription>
              </DialogHeader>
              <FacultyFormFields formInstance={form} onSubmitFn={onSubmit} submitLabel="Create Faculty" isSubmitting={creating} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Faculty</DialogTitle>
              <DialogDescription>Update faculty details for {editingFaculty?.name}</DialogDescription>
            </DialogHeader>
            <FacultyFormFields formInstance={editForm} onSubmitFn={onEditSubmit} submitLabel="Save Changes" isSubmitting={creating} />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingFaculty} onOpenChange={(open) => !open && setDeletingFaculty(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deletingFaculty?.name}</strong> ({deletingFaculty?.faculty_id})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BulkUpload
          title="Bulk Upload Faculty"
          description="Upload an Excel or CSV file with faculty data. Any column names are accepted — you'll map them in the next step."
          fields={facultyFields}
          templateFileName="faculty_template"
          templateSampleRow={{ name: 'Dr. Jane Smith', dob: '1985-03-20', qualification: 'Ph.D', section: 'CSE A', is_tutor: 'false' }}
          duplicateKeys={['name']}
          onInsertRow={handleBulkInsertFaculty}
          existingKeys={existingFacultyKeys}
        />

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
                {faculty.length === 0 ? 'No faculty added yet.' : 'No faculty match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Qualification</TableHead>
                      <TableHead className="hidden md:table-cell">Experience</TableHead>
                      <TableHead className="hidden sm:table-cell">Section</TableHead>
                      <TableHead>Tutor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFaculty.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-sm">{f.faculty_id}</TableCell>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{f.qualification || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{f.years_of_experience} yrs</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {f.section ? <Badge variant="outline">{f.section}</Badge> : '-'}
                        </TableCell>
                        <TableCell>
                          {f.is_tutor ? (
                            <Badge className="bg-success text-success-foreground">
                              <UserCheck className="h-3 w-3 mr-1" /> Tutor
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Faculty</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingFaculty(f)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
