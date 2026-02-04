import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Megaphone,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Bell,
  Info,
} from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  priority: z.enum(['info', 'important', 'urgent']),
  targetAudience: z.enum(['all', 'faculty', 'students']),
  startDate: z.string().min(1, 'Start date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: 'info' | 'important' | 'urgent';
  target_audience: 'all' | 'faculty' | 'students';
  start_date: string;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
}

const priorityConfig = {
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10' },
  important: { icon: Bell, color: 'text-warning', bg: 'bg-warning/10' },
  urgent: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'info',
      targetAudience: 'all',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
    },
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    setCreating(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: data.title,
        description: data.description,
        priority: data.priority,
        target_audience: data.targetAudience,
        start_date: new Date(data.startDate).toISOString(),
        expiry_date: new Date(data.expiryDate).toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Announcement Published',
        description: 'Your announcement is now live.',
      });

      form.reset();
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Announcement Deactivated' : 'Announcement Activated',
      });

      fetchAnnouncements();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update announcement',
        variant: 'destructive',
      });
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Announcement Deleted',
      });

      fetchAnnouncements();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-primary" />
              Announcements
            </h1>
            <p className="text-muted-foreground">
              Create and manage announcements for faculty and students
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Announcements are visible on the home screen before login.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Announcement title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Announcement details..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="important">Important</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audience</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="faculty">Faculty Only</SelectItem>
                              <SelectItem value="students">Students Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                      Publish
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No announcements yet. Create your first announcement above.
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement) => {
              const config = priorityConfig[announcement.priority];
              const Icon = config.icon;
              const expired = isExpired(announcement.expiry_date);

              return (
                <Card key={announcement.id} className={expired ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {announcement.title}
                            {expired && (
                              <Badge variant="secondary">Expired</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {announcement.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={announcement.is_active}
                          onCheckedChange={() => toggleActive(announcement.id, announcement.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {announcement.target_audience}
                      </Badge>
                      <span>
                        {new Date(announcement.start_date).toLocaleDateString()} - {new Date(announcement.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
