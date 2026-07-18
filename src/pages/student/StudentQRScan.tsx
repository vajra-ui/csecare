import { useEffect, useRef, useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ScanLine, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function StudentQRScan() {
  const { toast } = useToast();
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualSessionId, setManualSessionId] = useState('');
  const [marked, setMarked] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const loadActive = async () => {
    const { data } = await supabase
      .from('qr_attendance_sessions')
      .select('*')
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setActiveSessions(data || []);
  };

  useEffect(() => { loadActive(); const t = setInterval(loadActive, 10000); return () => clearInterval(t); }, []);

  const submit = async (session_id: string, code: string) => {
    const { data, error } = await supabase.functions.invoke('qr-attendance', {
      body: { action: 'mark', session_id, code },
    });
    if (error || data?.error) {
      toast({ title: 'Not marked', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    setMarked(true);
    toast({ title: 'Attendance marked ✓' });
    await stopScan();
  };

  const startScan = async () => {
    setScanning(true);
    setTimeout(async () => {
      try {
        const el = document.getElementById('qr-reader');
        if (!el) return;
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (decoded) => {
            try {
              const parsed = JSON.parse(decoded);
              if (parsed.s && parsed.c) {
                await scanner.stop();
                submit(parsed.s, parsed.c);
              }
            } catch {}
          },
          () => {},
        );
      } catch (e: any) {
        toast({ title: 'Camera error', description: e.message, variant: 'destructive' });
        setScanning(false);
      }
    }, 100);
  };

  const stopScan = async () => {
    try { await scannerRef.current?.stop(); } catch {}
    scannerRef.current = null;
    setScanning(false);
  };

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ScanLine className="text-neon-cyan" /> QR Attendance</h1>
          <p className="text-muted-foreground">Scan the QR shown by your faculty to mark yourself present.</p>
        </div>

        {marked && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="text-green-500" /> Attendance marked successfully.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeSessions.length === 0 && <p className="text-muted-foreground text-sm">No active sessions right now.</p>}
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{s.subject} • Section {s.section} • Hr {s.hour_number}</div>
                  <div className="text-xs text-muted-foreground">Expires at {new Date(s.expires_at).toLocaleTimeString()}</div>
                </div>
                <Badge variant="secondary">Live</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Scan QR</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!scanning ? (
              <Button onClick={startScan}><ScanLine className="mr-2 h-4 w-4" /> Open camera</Button>
            ) : (
              <>
                <div id="qr-reader" className="w-full max-w-sm mx-auto" />
                <Button variant="outline" onClick={stopScan}>Stop</Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Manual code entry</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">If your camera is unavailable, ask faculty for the session ID and code.</p>
            <Input placeholder="Session ID" value={manualSessionId} onChange={e => setManualSessionId(e.target.value)} />
            <Input placeholder="6-char code" value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())} />
            <Button onClick={() => submit(manualSessionId, manualCode)} disabled={!manualSessionId || !manualCode}>Mark Present</Button>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
