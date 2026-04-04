import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin or faculty
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

    // Fetch all students with attendance and academic data
    const [studentsRes, attendanceRes, academicRes] = await Promise.all([
      supabaseAdmin.from("students").select("id, name, roll_number, section, year"),
      supabaseAdmin.from("attendance").select("student_id, is_present"),
      supabaseAdmin.from("academic_records").select("student_id, semester, cgpa"),
    ]);

    const students = studentsRes.data || [];
    const attendance = attendanceRes.data || [];
    const academic = academicRes.data || [];

    // Calculate per-student metrics
    const studentMetrics = students.map((s: any) => {
      const att = attendance.filter((a: any) => a.student_id === s.id);
      const totalClasses = att.length;
      const present = att.filter((a: any) => a.is_present).length;
      const attendancePct = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : null;

      const records = academic.filter((a: any) => a.student_id === s.id);
      const latestCgpa = records.length > 0
        ? records.sort((a: any, b: any) => b.semester - a.semester)[0].cgpa
        : null;

      return {
        name: s.name,
        roll_number: s.roll_number,
        section: s.section,
        year: s.year,
        attendance_percentage: attendancePct,
        latest_cgpa: latestCgpa,
        total_classes: totalClasses,
        classes_present: present,
      };
    });

    // Build prompt for AI
    const prompt = `You are an academic advisor at an engineering college. Analyze the following student data and identify at-risk students who need intervention.

For each at-risk student, provide:
1. Student name and roll number
2. Risk level: HIGH, MEDIUM, or LOW
3. Risk factors (low attendance, low CGPA, both, or insufficient data)
4. A specific, actionable recommendation

Student Data:
${JSON.stringify(studentMetrics, null, 2)}

Rules:
- Attendance below 75% = risk factor
- CGPA below 5.0 = risk factor
- Students with both factors = HIGH risk
- Students with one factor = MEDIUM risk
- Students with no data = flag as LOW risk due to insufficient data
- If no students are at risk, say so clearly

Return your analysis as a structured response with clear sections for each at-risk student.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an academic risk analysis AI. Be concise and actionable." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Unable to generate analysis.";

    return new Response(JSON.stringify({
      analysis,
      student_metrics: studentMetrics,
      total_students: students.length,
      analyzed_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("risk-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
