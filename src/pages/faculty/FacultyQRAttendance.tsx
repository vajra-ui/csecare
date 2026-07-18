import { useEffect, useRef, useState } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RefreshCw, StopCircle, Radio } from 'lucide-react';

interface Session {
  id: string;
  section: string;
  subject: string;
  hour_number: number;
  current_code: string;
  expires_at: string;
  is_active: boolean;
}

export default function FacultyQRAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [hour, setHour] = useState('1');
  const [duration, setDuration] = useState('300');
  const [session, setSession] = useState<Session | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const rotateRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from('faculty').select('sections, current_subjects').eq('user_id', user.id).single();
      if (data) {
        const secs = (data.sections as string[]) || [];
        setSections(secs);
        setSubjects((data.current_subjects as string[]) || []);
        if (secs[0]) setSection(secs[0]);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) closeSession();
    };
    tick();
    const t = window.setInterval(tick, 1000);
    // Rotate code every 15s
    rotateRef.current = window.setInterval(rotate, 15000);
    return () => { clearInterval(t); if (rotateRef.current) clearInterval(rotateRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const start = async () => {
    if (!section || !subject) { toast({ title: 'Pick section & subject', variant: 'destructive' }); return; }
    const { data, error } = await supabase.functions.invoke('qr-attendance', {
      body: { action: 'start', section, subject, hour_number: Number(hour), duration_seconds: Number(duration) },
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setSession(data.session);
    toast({ title: 'QR session started', description: `Rotates every 15s. Expires in ${duration}s.` });
  };

  const rotate = async () => {
    if (!session) return;
    const { data } = await supabase.functions.invoke('qr-attendance', { body: { action: 'rotate', session_id: session.id } });
    if (data?.session) setSession(data.session);
  };

  const closeSession = async () => {
    if (!session) return;
    await supabase.functions.invoke('qr-attendance', { body: { action: 'close', session_id: session.id } });
    setSession(null);
    if (rotateRef.current) { clearInterval(rotateRef.current); rotateRef.current = null; }
    toast({ title: 'Session closed' });
  };

  const payload = session ? JSON.stringify({ s: session.id, c: session.current_code }) : '';

  return (
    <FacultyLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><QrCode className="text-secondary" /> QR Beacon Attendance</h1>
          <p className="text-muted-foreground">Students scan a rotating QR code to mark themselves present.</p>
        </div>

        {!session ? (
          <Card>
            <CardHeader><CardTitle>Start a session</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hour</Label>
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7,8].map(h => <SelectItem key={h} value={String(h)}>Hour {h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (seconds)</Label>
                <Input type="number" min={60} max={1800} value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button className="w-full" onClick={start}><Radio className="mr-2 h-4 w-4" /> Start QR Beacon</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live QR • {session.subject} • Section {session.section} • Hr {session.hour_number}</span>
                <Badge variant="secondary">{secondsLeft}s left</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={payload} size={280} level="M" />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Current code (fallback manual entry)</div>
                <div className="text-2xl font-mono tracking-widest">{session.current_code}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={rotate}><RefreshCw className="mr-2 h-4 w-4" /> Rotate now</Button>
                <Button variant="destructive" onClick={closeSession}><StopCircle className="mr-2 h-4 w-4" /> End session</Button>
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-md">
                Code auto-rotates every 15 seconds to prevent proxy attendance. Students must scan the current code from within the classroom.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </FacultyLayout>
  );
}
