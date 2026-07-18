import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Anomaly {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  detail: string;
  entity?: string;
  metric?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
    const twoWeekAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0];

    const [studentsRes, attRes, scoresRes, acadRes, auditRes] = await Promise.all([
      admin.from("students").select("id, name, roll_number, section"),
      admin.from("attendance").select("student_id, is_present, date, faculty_id, created_at").gte("date", twoWeekAgo),
      admin.from("subject_scores").select("student_id, subject, internal_marks, updated_at"),
      admin.from("academic_records").select("student_id, semester, cgpa"),
      admin.from("grade_audit").select("*").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(200),
    ]);

    const students = studentsRes.data ?? [];
    const attendance = attRes.data ?? [];
    const audits = auditRes.data ?? [];
    const anomalies: Anomaly[] = [];

    // 1. Section-wise attendance drop week over week
    const sections = Array.from(new Set(students.map((s: any) => s.section).filter(Boolean)));
    for (const sec of sections) {
      const secStudentIds = new Set(students.filter((s: any) => s.section === sec).map((s: any) => s.id));
      const thisWeek = attendance.filter((a: any) => secStudentIds.has(a.student_id) && a.date >= weekAgo);
      const prevWeek = attendance.filter((a: any) => secStudentIds.has(a.student_id) && a.date < weekAgo);
      const pct = (arr: any[]) => arr.length ? (arr.filter(x => x.is_present).length / arr.length) * 100 : null;
      const t = pct(thisWeek), p = pct(prevWeek);
      if (t !== null && p !== null && p - t >= 10) {
        anomalies.push({
          id: `att-drop-${sec}`,
          severity: p - t >= 20 ? "HIGH" : "MEDIUM",
          category: "Attendance",
          title: `Section ${sec} attendance dropped ${(p - t).toFixed(1)}%`,
          detail: `This week: ${t.toFixed(1)}% vs last week ${p.toFixed(1)}%.`,
          entity: `Section ${sec}`,
          metric: `${(p - t).toFixed(1)}% drop`,
        });
      }
    }

    // 2. Suspiciously fast attendance marking (many rows saved by same faculty in <10s)
    const facultyBursts: Record<string, any[]> = {};
    attendance.forEach((a: any) => {
      if (!a.faculty_id || !a.created_at) return;
      (facultyBursts[a.faculty_id] ||= []).push(new Date(a.created_at).getTime());
    });
    Object.entries(facultyBursts).forEach(([fid, times]) => {
      times.sort((a, b) => a - b);
      let maxBurst = 0;
      for (let i = 0; i < times.length; i++) {
        let j = i;
        while (j < times.length && times[j] - times[i] < 10_000) j++;
        maxBurst = Math.max(maxBurst, j - i);
      }
      if (maxBurst >= 30) {
        anomalies.push({
          id: `fast-mark-${fid}`,
          severity: maxBurst >= 60 ? "HIGH" : "MEDIUM",
          category: "Marking Speed",
          title: `Faculty marked ${maxBurst} entries in under 10s`,
          detail: `Possible bulk/automated marking pattern detected.`,
          entity: `Faculty ${fid.slice(0, 8)}`,
          metric: `${maxBurst} rows / 10s`,
        });
      }
    });

    // 3. Sudden CGPA drop (>= 1.0 between latest two semesters)
    const byStudent: Record<string, any[]> = {};
    (acadRes.data ?? []).forEach((r: any) => {
      (byStudent[r.student_id] ||= []).push(r);
    });
    Object.entries(byStudent).forEach(([sid, recs]) => {
      recs.sort((a, b) => b.semester - a.semester);
      if (recs.length >= 2 && recs[1].cgpa - recs[0].cgpa >= 1.0) {
        const s = students.find((x: any) => x.id === sid);
        if (!s) return;
        anomalies.push({
          id: `cgpa-drop-${sid}`,
          severity: recs[1].cgpa - recs[0].cgpa >= 2 ? "HIGH" : "MEDIUM",
          category: "Academic",
          title: `${s.name} CGPA dropped ${(recs[1].cgpa - recs[0].cgpa).toFixed(2)}`,
          detail: `Sem ${recs[1].semester}: ${recs[1].cgpa} → Sem ${recs[0].semester}: ${recs[0].cgpa}`,
          entity: `${s.roll_number} / ${s.section}`,
          metric: `-${(recs[1].cgpa - recs[0].cgpa).toFixed(2)} CGPA`,
        });
      }
    });

    // 4. Recent grade edits (from immutable ledger) - inform HOD of any activity
    if (audits.length > 0) {
      const updates = audits.filter((a: any) => a.action === "UPDATE").length;
      const deletes = audits.filter((a: any) => a.action === "DELETE").length;
      if (updates + deletes > 0) {
        anomalies.push({
          id: `grade-edits`,
          severity: deletes > 0 ? "MEDIUM" : "LOW",
          category: "Grade Ledger",
          title: `${updates} grade updates & ${deletes} deletions in last 7 days`,
          detail: `All changes are logged in the immutable audit ledger.`,
          entity: "System",
          metric: `${updates + deletes} changes`,
        });
      }
    }

    // sort HIGH → MEDIUM → LOW
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    anomalies.sort((a, b) => order[a.severity] - order[b.severity]);

    return new Response(JSON.stringify({
      anomalies,
      generated_at: new Date().toISOString(),
      counts: {
        high: anomalies.filter(a => a.severity === "HIGH").length,
        medium: anomalies.filter(a => a.severity === "MEDIUM").length,
        low: anomalies.filter(a => a.severity === "LOW").length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("anomaly-radar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
