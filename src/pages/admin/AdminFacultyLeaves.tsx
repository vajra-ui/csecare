import { useState, useEffect } from 'react';
import { CalendarOff, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AdminFacultyLeaves() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('faculty_leaves')
        .select('*, faculty(name, faculty_id, section)')
        .order('created_at', { ascending: false });
      setLeaves(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: string) => {
    const { error } = await supabase.from('faculty_leaves').update({
      status,
      remarks: remarks[id] || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    if (!error) {
      toast({ title: status === 'approved' ? 'Approved' : 'Rejected', description: `Faculty leave ${status}.` });
      fetchData();
    } else {
      toast({ title: 'Error', description: 'Failed to update leave', variant: 'destructive' });
    }
  };

  const filterByStatus = (status: string) => leaves.filter(l => l.status === status);

  const getDays = (start: string, end: string) => {
    return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <CalendarOff className="h-7 w-7 text-primary" />
            Faculty Leave Requests
          </h1>
          <p className="text-muted-foreground text-sm">{filterByStatus('pending').length} pending requests</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total', value: leaves.length, color: 'text-foreground' },
            { label: 'Pending', value: filterByStatus('pending').length, color: 'text-yellow-600' },
            { label: 'Approved', value: filterByStatus('approved').length, color: 'text-green-600' },
            { label: 'Rejected', value: filterByStatus('rejected').length, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-6 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({filterByStatus('pending').length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({filterByStatus('approved').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({filterByStatus('rejected').length})</TabsTrigger>
          </TabsList>

          {['pending', 'approved', 'rejected'].map(status => (
            <TabsContent key={status} value={status} className="space-y-3">
              {filterByStatus(status).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">No {status} leave requests</CardContent>
                </Card>
              ) : (
                filterByStatus(status).map(l => (
                  <Card key={l.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">{l.faculty?.name}</span>
                            <Badge variant="outline" className="text-xs">{l.faculty?.faculty_id}</Badge>
                            {l.faculty?.section && <Badge variant="secondary" className="text-xs">{l.faculty?.section}</Badge>}
                            <Badge variant="outline" className="text-xs capitalize">{l.leave_type}</Badge>
                          </div>
                          <p className="text-sm mb-2">{l.reason}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(l.start_date), 'MMM dd')} - {format(new Date(l.end_date), 'MMM dd, yyyy')}
                            </span>
                            <Badge variant="secondary" className="text-xs">{getDays(l.start_date, l.end_date)} day(s)</Badge>
                          </div>
                          {l.remarks && <p className="text-xs mt-2 italic text-muted-foreground">Remarks: {l.remarks}</p>}
                        </div>
                        {status === 'pending' && (
                          <div className="space-y-2 min-w-[200px]">
                            <Textarea
                              placeholder="Remarks (optional)"
                              className="text-xs h-16"
                              value={remarks[l.id] || ''}
                              onChange={e => setRemarks(prev => ({ ...prev, [l.id]: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 gap-1" onClick={() => handleAction(l.id, 'approved')}>
                                <CheckCircle className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => handleAction(l.id, 'rejected')}>
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
