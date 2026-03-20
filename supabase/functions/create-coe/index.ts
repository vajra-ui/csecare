import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = "coe@gmail.com";
    const password = "coe@2026";
    const name = "Controller of Examinations";

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);

    if (existing) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });

      const { data: roleExists } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", existing.id)
        .eq("role", "ADMIN")
        .maybeSingle();

      if (!roleExists) {
        await supabaseAdmin.from("user_roles").insert({ user_id: existing.id, role: "ADMIN" });
      }

      const { data: profileExists } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", existing.id)
        .maybeSingle();

      if (!profileExists) {
        await supabaseAdmin.from("profiles").insert({ user_id: existing.id, name, email });
      }

      return new Response(
        JSON.stringify({ message: "COE user updated", user_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: "ADMIN",
    });

    await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      name,
      email,
    });

    return new Response(
      JSON.stringify({ message: "COE user created", user_id: authData.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
