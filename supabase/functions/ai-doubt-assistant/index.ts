import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, subject, section } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pull class notes for this subject / section as context (title + description snippet)
    let notesQuery = supabase.from("class_notes").select("title, description, subject, section").limit(20);
    if (subject) notesQuery = notesQuery.eq("subject", subject);
    if (section) notesQuery = notesQuery.eq("section", section);
    const { data: notes } = await notesQuery;

    const notesContext = (notes || [])
      .map((n: any, i: number) => `[Note ${i + 1}] ${n.title} (${n.subject}): ${n.description || "(no description)"}`)
      .join("\n");

    const systemPrompt = `You are a subject-scoped AI Doubt Assistant for a Computer Science student at Paavai Engineering College.

SUBJECT CONTEXT: ${subject || "General CSE"}
CLASS NOTES AVAILABLE FROM FACULTY:
${notesContext || "(no notes uploaded yet)"}

Rules:
- Prefer answers grounded in the class notes above. When you use a note, cite it as [Note N].
- If the notes don't cover it, answer with general CSE knowledge and clearly say "General knowledge (not from class notes):" before that part.
- Keep answers focused, under 300 words, with code examples when relevant.
- If the question is off-subject, gently redirect the student.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${res.status}`);
    }
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || "I couldn't generate an answer.";

    return new Response(JSON.stringify({ answer, notesUsed: notes?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
