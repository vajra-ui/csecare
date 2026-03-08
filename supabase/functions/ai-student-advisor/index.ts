import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentName, studentContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build data context from student info
    let dataSection = "";
    if (studentContext) {
      const ctx = studentContext;
      dataSection += `\n\n--- STUDENT DATA (use this to personalize advice) ---`;
      dataSection += `\nName: ${ctx.name || "Unknown"}`;
      dataSection += `\nRoll Number: ${ctx.rollNumber || "N/A"}`;
      dataSection += `\nSection: ${ctx.section || "N/A"}`;
      dataSection += `\nYear: ${ctx.year || "N/A"}`;
      
      if (ctx.attendancePercentage !== null && ctx.attendancePercentage !== undefined) {
        dataSection += `\nOverall Attendance: ${ctx.attendancePercentage}%`;
        if (ctx.attendancePercentage < 75) {
          dataSection += ` ⚠️ BELOW 75% MINIMUM`;
        }
      }

      if (ctx.cgpa !== null && ctx.cgpa !== undefined) {
        dataSection += `\nCurrent CGPA: ${ctx.cgpa}/10`;
      }

      if (ctx.semesterCGPAs && ctx.semesterCGPAs.length > 0) {
        dataSection += `\nSemester-wise CGPAs: ${ctx.semesterCGPAs.map((s: any) => `Sem ${s.semester}: ${s.cgpa}`).join(", ")}`;
      }

      if (ctx.subjectScores && ctx.subjectScores.length > 0) {
        dataSection += `\nRecent Subject Scores:`;
        ctx.subjectScores.forEach((s: any) => {
          dataSection += `\n  - ${s.subject_name} (Sem ${s.semester}): Internal=${s.internal_marks ?? "N/A"}, External=${s.external_marks ?? "N/A"}, Total=${s.total_marks ?? "N/A"}, Grade=${s.grade ?? "N/A"}`;
        });
      }

      if (ctx.pendingAssignments !== undefined) {
        dataSection += `\nPending Assignments: ${ctx.pendingAssignments}`;
      }

      if (ctx.submittedAssignments !== undefined) {
        dataSection += `\nSubmitted Assignments: ${ctx.submittedAssignments}`;
      }

      if (ctx.achievements && ctx.achievements.length > 0) {
        dataSection += `\nAchievements: ${ctx.achievements.map((a: any) => a.title).join(", ")}`;
      }

      if (ctx.odRequests && ctx.odRequests.length > 0) {
        dataSection += `\nRecent OD Requests: ${ctx.odRequests.map((o: any) => `${o.reason} (${o.status})`).join("; ")}`;
      }

      dataSection += `\n--- END STUDENT DATA ---`;
    }

    const systemPrompt = `You are an AI Academic Advisor for ${studentName || 'a student'} at Paavai Engineering College, CSE Department. You have access to the student's real academic data below. Use this data to give PERSONALIZED and SPECIFIC advice.
${dataSection}

Based on the student's actual data:
- If attendance is low (<75%), warn them and suggest improvement strategies
- If CGPA is declining across semesters, identify the trend and suggest study strategies
- If specific subjects have low scores, suggest focused study plans for those subjects
- Congratulate achievements and encourage more participation
- Point out pending assignments and deadlines
- Give career guidance tailored to their performance level

Be encouraging, concise, and practical. Use bullet points when helpful. Reference their ACTUAL numbers and subjects. Keep responses under 250 words unless detailed explanations are requested. Always maintain a supportive and positive tone.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I'm unable to respond right now.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-student-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
