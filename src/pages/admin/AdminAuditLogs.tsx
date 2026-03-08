import { useState, useEffect } from 'react';
import { FileSpreadsheet, Loader2, Search, Download, Filter, Calendar, ChevronDown } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { generateAuditLogPDF } from '@/lib/pdfReports';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  user_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  STUDENT_CREATED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FACULTY_CREATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  STUDENT_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  FACULTY_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function AdminAuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueTables = [...new Set(logs.map(l => l.table_name).filter(Boolean))];

  const filteredLogs = logs.filter(log => {
    const matchSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.table_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details ? JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()) : false);
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const matchTable = tableFilter === 'all' || log.table_name === tableFilter;
    return matchSearch && matchAction && matchTable;
  });

  const handleExport = () => {
    generateAuditLogPDF(filteredLogs);
    toast({ title: 'Exported', description: 'Audit log PDF downloaded.' });
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground text-sm">Visual timeline of all system activity</p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={filteredLogs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{uniqueActions.length}</p>
              <p className="text-xs text-muted-foreground">Action Types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">
                {logs.filter(l => {
                  const diff = Date.now() - new Date(l.created_at).getTime();
                  return diff < 86400000;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Last 24 Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
              <p className="text-xs text-muted-foreground">Filtered Results</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, tables, or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  {uniqueTables.map(t => (
                    <SelectItem key={t!} value={t!}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit logs found.</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}
                        >
                          {log.action}
                        </span>
                        {log.table_name && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {log.table_name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {formatTimeAgo(log.created_at)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {typeof log.details === 'object'
                            ? Object.entries(log.details)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')
                            : String(log.details)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
