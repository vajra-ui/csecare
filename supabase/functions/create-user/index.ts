import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  type: "student" | "faculty";
  data: {
    name: string;
    dob: string;
    rollNumber?: string;
    registerNumber?: string;
    section?: string;
    year?: string;
    qualification?: string;
    yearsOfExperience?: number;
    currentSubjects?: string[];
    isTutor?: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is an admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser } } = await anonClient.auth.getUser();
    if (!callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .single();

    if (!roleData || roleData.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateUserRequest = await req.json();
    const { type, data } = body;

    if (type === "student") {
      if (!data.rollNumber || !data.registerNumber || !data.dob || !data.name) {
        return new Response(
          JSON.stringify({ error: "Missing required student fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalize inputs
      const cleanRollNumber = data.rollNumber.trim().toUpperCase();
      const cleanRegisterNumber = data.registerNumber.trim().toUpperCase();
      const cleanDob = data.dob.trim();
      
      // Create email from roll number (lowercase)
      const email = `${cleanRollNumber.toLowerCase()}@student.paavai.edu.in`;
      // Password is DOB without dashes
      const password = cleanDob.replace(/-/g, "");
      console.log("Creating student auth:", { email, passwordLength: password.length });

      // Create or find existing auth user
      let userId: string;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          // Find existing user and update password
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existing = existingUsers?.users?.find(u => u.email === email);
          if (!existing) {
            return new Response(
              JSON.stringify({ error: "User exists but could not be found" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
          userId = existing.id;
        } else {
          console.error("Auth error:", authError);
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        userId = authData.user!.id;
      }

      // Check if student record already exists for this user
      const { data: existingStudent } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let studentData;
      if (existingStudent) {
        // Update existing student
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from("students")
          .update({
            name: data.name,
            roll_number: cleanRollNumber,
            register_number: cleanRegisterNumber,
            dob: cleanDob,
            section: data.section || "CSE A",
            year: data.year || "I",
          })
          .eq("id", existingStudent.id)
          .select()
          .single();
        if (updateErr) {
          return new Response(
            JSON.stringify({ error: updateErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        studentData = updated;
      } else {
        // Create student record
        const { data: created, error: studentError } = await supabaseAdmin
          .from("students")
          .insert({
            user_id: userId,
            name: data.name,
            roll_number: data.rollNumber.toUpperCase(),
            register_number: data.registerNumber.toUpperCase(),
            dob: data.dob,
            section: data.section || "CSE A",
            year: data.year || "I",
          })
          .select()
          .single();

        if (studentError) {
          console.error("Student error:", studentError);
          return new Response(
            JSON.stringify({ error: studentError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        studentData = created;
      }

      // Upsert role
      await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: "STUDENT",
      }, { onConflict: "user_id,role" });

      // Upsert profile
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          user_id: userId,
          name: data.name,
          email,
        });
      }

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: callerUser.id,
        action: "STUDENT_CREATED",
        table_name: "students",
        record_id: studentData.id,
        details: { name: data.name, roll_number: data.rollNumber },
      });

      return new Response(
        JSON.stringify({ success: true, student: studentData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (type === "faculty") {
      if (!data.dob || !data.name) {
        return new Response(
          JSON.stringify({ error: "Missing required faculty fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a unique faculty ID with retry logic for collisions
      const password = data.dob.replace(/-/g, "");
      let facultyId = "";
      let email = "";
      let authData: any = null;
      let lastAuthError: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: facultyIdData } = await supabaseAdmin.rpc("generate_faculty_id");
        const suffix = attempt > 0 ? Date.now().toString().slice(-4) : "";
        facultyId = (facultyIdData || `FAC${new Date().getFullYear().toString().slice(-2)}${Date.now().toString().slice(-4)}`) + suffix;
        email = `${facultyId.toLowerCase()}@paavai.edu.in`;

        const { data: ad, error: ae } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (!ae) {
          authData = ad;
          lastAuthError = null;
          break;
        }

        console.error(`Auth attempt ${attempt + 1} error:`, ae.message);
        lastAuthError = ae;

        // Only retry on email_exists collision
        if (ae.code !== "email_exists") break;
      }

      if (lastAuthError || !authData) {
        return new Response(
          JSON.stringify({ error: `Could not create account: ${lastAuthError?.message || "Unknown error"}. Please try again.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = authData.user!.id;

      // Always INSERT a new faculty record — never update
      const { data: facultyData, error: facultyError } = await supabaseAdmin
        .from("faculty")
        .insert({
          user_id: userId,
          faculty_id: facultyId,
          name: data.name,
          dob: data.dob,
          qualification: data.qualification || null,
          years_of_experience: data.yearsOfExperience || 0,
          current_subjects: data.currentSubjects || [],
          section: data.section || null,
          is_tutor: data.isTutor || false,
        })
        .select()
        .single();

      if (facultyError) {
        // Clean up auth user if faculty insert fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.error("Faculty error:", facultyError);
        return new Response(
          JSON.stringify({ error: facultyError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Set role
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: data.isTutor ? "TUTOR" : "FACULTY",
      });

      // Create profile
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        name: data.name,
        email,
      });

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: callerUser.id,
        action: "FACULTY_CREATED",
        table_name: "faculty",
        record_id: facultyData.id,
        details: { name: data.name, faculty_id: facultyId, is_tutor: data.isTutor },
      });

      return new Response(
        JSON.stringify({ success: true, faculty: facultyData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid user type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
