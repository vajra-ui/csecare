import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string" || identifier.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Invalid identifier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const upper = identifier.trim().toUpperCase();
    console.log("Looking up student with identifier:", upper);

    // Try finding by roll number first
    const { data: byRoll } = await supabaseAdmin
      .from("students")
      .select("roll_number")
      .eq("roll_number", upper)
      .maybeSingle();

    if (byRoll) {
      return new Response(
        JSON.stringify({ roll_number: byRoll.roll_number }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try finding by register number
    const { data: byReg } = await supabaseAdmin
      .from("students")
      .select("roll_number")
      .eq("register_number", upper)
      .maybeSingle();

    if (byReg) {
      return new Response(
        JSON.stringify({ roll_number: byReg.roll_number }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Student not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
