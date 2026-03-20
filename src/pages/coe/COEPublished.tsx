import { useState, useEffect } from 'react';
import { FileCheck, Loader2, Send, Eye, Download } from 'lucide-react';
import { COELayout } from '@/components/layouts/COELayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function COEPublished() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [semester, setSemester] = useState('1');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const fetchResults = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('results')
      .select('*, students(name, register_number, section)')
      .eq('semester', parseInt(semester))
      .order('created_at', { ascending: false });
    setResults((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchResults(); }, [semester]);

  const publishAll = async () => {
    setPublishing(true);
    try {
      const unpublishedIds = results.filter(r => !r.is_published).map(r => r.id);
      if (unpublishedIds.length === 0) {
        toast({ title: 'All results already published' });
        setPublishing(false);
        return;
      }

      const { error } = await supabase
        .from('results')
        .update({ is_published: true, published_at: new Date().toISOString(), published_by: session?.user?.id } as any)
        .in('id', unpublishedIds);
      if (error) throw error;

      // Notify students
      const studentIds = [...new Set(results.filter(r => !r.is_published).map(r => r.student_id))];
      // Get user_ids for these students
      const { data: students } = await supabase.from('students').select('user_id').in('id', studentIds);
      if (students) {
        const notifications = students
          .filter(s => s.user_id)
          .map(s => ({
            user_id: s.user_id!,
            title: 'Results Published',
            message: `Semester ${semester} results have been published. Check your results in the portal.`,
            type: 'result',
            link: '/student/progress',
          }));
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast({ title: `${unpublishedIds.length} results published & students notified` });
      fetchResults();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const unpublishedCount = results.filter(r => !r.is_published).length;

  return (
    <COELayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileCheck className="h-7 w-7 text-green-500" /> Published Results
            </h1>
            <p className="text-muted-foreground text-sm">{results.length} results for Semester {semester}</p>
          </div>
          <div className="flex gap-3">
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
              </SelectContent>
            </Select>
            {unpublishedCount > 0 && (
              <Button onClick={publishAll} disabled={publishing} className="bg-green-600 hover:bg-green-700">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Publish {unpublishedCount} Results
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : results.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No results for this semester.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Register No.</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.students?.name || '—'}</TableCell>
                        <TableCell>{r.students?.register_number || '—'}</TableCell>
                        <TableCell>{r.subject_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.subject_code}</TableCell>
                        <TableCell>{r.marks ?? '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.grade || '—'}</Badge></TableCell>
                        <TableCell>
                          {r.is_published ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </COELayout>
  );
}
