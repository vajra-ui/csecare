import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complementary pairing: match a student weak in subject X with a student strong in X (and vice versa).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { section } = await req.json();
    if (!section) throw new Error("section required");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch students in section
    const { data: students } = await supabase
      .from("students")
      .select("id, name, roll_number")
      .eq("section", section);
    if (!students || students.length < 2) {
      return new Response(JSON.stringify({ pairs: [], error: "Need at least 2 students" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull recent subject_scores per student
    const studentIds = students.map((s: any) => s.id);
    const { data: scores } = await supabase
      .from("subject_scores")
      .select("student_id, subject, total_marks, internal_marks")
      .in("student_id", studentIds);

    // Build per-student subject -> score map (average total_marks)
    const map = new Map<string, Map<string, number>>();
    for (const s of students) map.set(s.id, new Map());
    for (const sc of scores || []) {
      const m = map.get(sc.student_id)!;
      const val = sc.total_marks ?? sc.internal_marks ?? 0;
      m.set(sc.subject, val);
    }

    // Greedy complementary pairing
    const allSubjects = Array.from(new Set((scores || []).map((s: any) => s.subject)));
    const paired = new Set<string>();
    const results: any[] = [];

    for (let i = 0; i < students.length; i++) {
      const a = students[i];
      if (paired.has(a.id)) continue;
      let best: any = null;
      let bestScore = -1;
      let bestComplement: any[] = [];

      for (let j = i + 1; j < students.length; j++) {
        const b = students[j];
        if (paired.has(b.id)) continue;

        const aMap = map.get(a.id)!;
        const bMap = map.get(b.id)!;
        let score = 0;
        const complement: any[] = [];
        for (const sub of allSubjects) {
          const av = aMap.get(sub) ?? 50;
          const bv = bMap.get(sub) ?? 50;
          const diff = Math.abs(av - bv);
          if (diff >= 15) {
            score += diff;
            complement.push({
              subject: sub,
              stronger: av > bv ? a.name : b.name,
              weaker: av > bv ? b.name : a.name,
              gap: Math.round(diff),
            });
          }
        }
        if (score > bestScore) {
          bestScore = score;
          best = b;
          bestComplement = complement;
        }
      }

      if (best) {
        paired.add(a.id);
        paired.add(best.id);
        results.push({
          student_a: a.id,
          student_b: best.id,
          complementary_subjects: bestComplement,
          match_score: Math.min(100, Math.round(bestScore / Math.max(1, allSubjects.length))),
          reasoning: bestComplement.length > 0
            ? `Strong complementary skills across ${bestComplement.length} subject(s). ${a.name} and ${best.name} can help each other.`
            : `Similar performance profile — good peer study partners.`,
        });
      }
    }

    // Wipe old pairs for section, insert new
    await supabase.from("study_buddy_pairs").delete().eq("section", section);
    const inserts = results.map(r => ({ ...r, section, generated_by: user.id }));
    if (inserts.length > 0) {
      await supabase.from("study_buddy_pairs").insert(inserts);
    }

    return new Response(JSON.stringify({ pairs: results.length, section }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
