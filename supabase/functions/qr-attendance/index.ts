import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await anon.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Not authenticated");

    const body = await req.json();
    const action = body.action as string;

    // FACULTY: start a session
    if (action === "start") {
      const { section, subject, hour_number, duration_seconds = 300 } = body;
      const { data: faculty } = await supabase.from("faculty").select("id").eq("user_id", user.id).single();
      if (!faculty) throw new Error("Not a faculty user");
      const expiresAt = new Date(Date.now() + duration_seconds * 1000).toISOString();
      const { data, error } = await supabase.from("qr_attendance_sessions").insert({
        faculty_id: faculty.id,
        section,
        subject,
        hour_number,
        current_code: randomCode(),
        expires_at: expiresAt,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ session: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // FACULTY: rotate the code
    if (action === "rotate") {
      const { session_id } = body;
      const { data: faculty } = await supabase.from("faculty").select("id").eq("user_id", user.id).single();
      if (!faculty) throw new Error("Not a faculty user");
      const code = randomCode();
      const { data, error } = await supabase.from("qr_attendance_sessions")
        .update({ current_code: code, code_rotated_at: new Date().toISOString() })
        .eq("id", session_id).eq("faculty_id", faculty.id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ session: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // FACULTY: close the session
    if (action === "close") {
      const { session_id } = body;
      const { data: faculty } = await supabase.from("faculty").select("id").eq("user_id", user.id).single();
      if (!faculty) throw new Error("Not a faculty user");
      await supabase.from("qr_attendance_sessions")
        .update({ is_active: false })
        .eq("id", session_id).eq("faculty_id", faculty.id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STUDENT: mark attendance by scanning code
    if (action === "mark") {
      const { session_id, code } = body;
      const { data: student } = await supabase.from("students").select("id, section").eq("user_id", user.id).single();
      if (!student) throw new Error("Not a student");
      const { data: session } = await supabase.from("qr_attendance_sessions").select("*").eq("id", session_id).single();
      if (!session) throw new Error("Session not found");
      if (!session.is_active) throw new Error("Session closed");
      if (new Date(session.expires_at).getTime() < Date.now()) throw new Error("Session expired");
      if (session.section !== student.section) throw new Error("Not your section");
      if ((session.current_code || "").toUpperCase() !== String(code || "").toUpperCase()) {
        throw new Error("Invalid or rotated code — refresh the QR");
      }

      // Upsert attendance for the day/hour/student
      await supabase.from("attendance").delete()
        .eq("student_id", student.id)
        .eq("date", session.session_date)
        .eq("hour_number", session.hour_number);

      const { error: insErr } = await supabase.from("attendance").insert({
        student_id: student.id,
        faculty_id: session.faculty_id,
        date: session.session_date,
        hour_number: session.hour_number,
        subject: session.subject,
        is_present: true,
      });
      if (insErr) throw insErr;

      return new Response(JSON.stringify({ ok: true, marked: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
