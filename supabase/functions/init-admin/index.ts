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
    // Check if force recreation is requested
    let forceRecreate = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        forceRecreate = body?.force === true;
      } catch {
        // No body or invalid JSON, continue
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail = Deno.env.get("SUPER_ADMIN_EMAIL")!;
    const adminPassword = Deno.env.get("SUPER_ADMIN_PASSWORD")!;

    console.log("Admin email:", adminEmail);
    console.log("Admin password length:", adminPassword?.length);

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

    // If force recreate, delete existing admin first
    if (forceRecreate) {
      console.log("Force recreation requested, deleting existing admin...");
      const { data: existingRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "ADMIN");
      
      if (existingRoles) {
        for (const role of existingRoles) {
          await supabaseAdmin.from("user_roles").delete().eq("user_id", role.user_id);
          await supabaseAdmin.from("profiles").delete().eq("user_id", role.user_id);
          await supabaseAdmin.auth.admin.deleteUser(role.user_id);
        }
      }
    }

    // Check if admin already exists with the correct email
    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id")
      .eq("role", "ADMIN")
      .limit(1);

    if (existingRoles && existingRoles.length > 0) {
      // Check if the existing admin has the same email
      const existingUserId = existingRoles[0].user_id;
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(existingUserId);
      
      if (existingUser?.user?.email === adminEmail) {
        // Update the password to ensure it matches the secret
        await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
          password: adminPassword,
        });
        
        return new Response(
          JSON.stringify({ message: "Admin password updated", exists: true, updated: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Different email - delete old admin and create new one
      console.log("Replacing existing admin with new credentials...");
      
      // Delete old role and profile
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existingUserId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", existingUserId);
      
      // Delete old auth user
      await supabaseAdmin.auth.admin.deleteUser(existingUserId);
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
