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

export default function AdminFacultyOD() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('faculty_od_requests')
        .select('*, faculty(name, faculty_id, section)')
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: string) => {
    const { error } = await supabase.from('faculty_od_requests').update({
      status,
      admin_remarks: remarks[id] || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    if (!error) {
      toast({ title: status === 'approved' ? 'Approved' : 'Rejected', description: `Faculty OD request ${status}.` });
      fetchData();
    } else {
      toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
    }
  };

  const filterByStatus = (status: string) => requests.filter(r => r.status === status);

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
            Faculty OD Requests
          </h1>
          <p className="text-muted-foreground text-sm">{filterByStatus('pending').length} pending requests</p>
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
                <Card className="futuristic-card">
                  <CardContent className="py-8 text-center text-muted-foreground">No {status} requests</CardContent>
                </Card>
              ) : (
                filterByStatus(status).map(r => (
                  <Card key={r.id} className="futuristic-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">{r.faculty?.name}</span>
                            <Badge variant="outline" className="text-xs">{r.faculty?.faculty_id}</Badge>
                            {r.faculty?.section && <Badge variant="secondary" className="text-xs">{r.faculty?.section}</Badge>}
                          </div>
                          <p className="text-sm mb-2">{r.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.start_date), 'MMM dd')} - {format(new Date(r.end_date), 'MMM dd, yyyy')}
                          </p>
                          {r.admin_remarks && <p className="text-xs mt-2 italic text-muted-foreground">Remarks: {r.admin_remarks}</p>}
                        </div>
                        {status === 'pending' && (
                          <div className="space-y-2 min-w-[200px]">
                            <Textarea
                              placeholder="Remarks (optional)"
                              className="text-xs h-16"
                              value={remarks[r.id] || ''}
                              onChange={e => setRemarks(prev => ({ ...prev, [r.id]: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 gap-1" onClick={() => handleAction(r.id, 'approved')}>
                                <CheckCircle className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => handleAction(r.id, 'rejected')}>
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
