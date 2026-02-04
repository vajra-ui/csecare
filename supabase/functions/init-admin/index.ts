import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail = Deno.env.get("SUPER_ADMIN_EMAIL")!;
    const adminPassword = Deno.env.get("SUPER_ADMIN_PASSWORD")!;

    if (!adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "Admin credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin already exists
    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id")
      .eq("role", "ADMIN")
      .limit(1);

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ message: "Admin already exists", exists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      // If user already exists in auth, try to find and link them
      if (authError.message.includes("already been registered")) {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const adminUser = existingUser?.users?.find(u => u.email === adminEmail);
        
        if (adminUser) {
          // Create role for existing user
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: adminUser.id, role: "ADMIN" });

          if (roleError) {
            console.error("Role creation error:", roleError);
            return new Response(
              JSON.stringify({ error: "Failed to assign admin role" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Create profile
          await supabaseAdmin.from("profiles").insert({
            user_id: adminUser.id,
            name: "Administrator",
            email: adminEmail,
          });

          // Log the action
          await supabaseAdmin.from("audit_logs").insert({
            user_id: adminUser.id,
            action: "ADMIN_INITIALIZED",
            details: { email: adminEmail, method: "existing_user" },
          });

          return new Response(
            JSON.stringify({ message: "Admin role assigned to existing user", created: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create admin user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: authData.user.id, role: "ADMIN" });

    if (roleError) {
      console.error("Role error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to create admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin profile
    await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      name: "Administrator",
      email: adminEmail,
    });

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      user_id: authData.user.id,
      action: "ADMIN_CREATED",
      details: { email: adminEmail },
    });

    return new Response(
      JSON.stringify({ message: "Admin created successfully", created: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
