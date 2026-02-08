import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'ADMIN' | 'FACULTY' | 'TUTOR' | 'STUDENT';

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  name: string;
  facultyId?: string;
  studentId?: string;
  isTutor?: boolean;
}

// Admin login with email/password
export async function adminLogin(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Login failed');

  // Check if user has ADMIN role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'ADMIN') {
    await supabase.auth.signOut();
    throw new Error('Unauthorized: Admin access required');
  }

  return {
    id: data.user.id,
    email: data.user.email,
    role: 'ADMIN',
    name: 'Administrator',
  };
}

// Faculty login with Faculty ID + DOB
// Sign in FIRST (bypasses RLS), then fetch faculty record
export async function facultyLogin(facultyId: string, dob: string): Promise<AuthUser> {
  const email = `${facultyId.toLowerCase()}@paavai.edu.in`;
  const password = dob.replace(/-/g, '');

  // Sign in first - this works regardless of RLS
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    throw new Error('Invalid Faculty ID or Date of Birth');
  }

  // Now authenticated - fetch faculty record
  const { data: faculty, error: facultyError } = await supabase
    .from('faculty')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (facultyError || !faculty) {
    await supabase.auth.signOut();
    throw new Error('Faculty record not found. Please contact admin.');
  }

  return {
    id: faculty.id,
    email: authData.user.email,
    role: faculty.is_tutor ? 'TUTOR' : 'FACULTY',
    name: faculty.name,
    facultyId: faculty.faculty_id,
    isTutor: faculty.is_tutor,
  };
}

// Student login with Roll Number + DOB
// Sign in FIRST (bypasses RLS), then fetch student record
export async function studentLogin(rollNumber: string, dob: string): Promise<AuthUser> {
  const email = `${rollNumber.toLowerCase()}@student.paavai.edu.in`;
  const password = dob.replace(/-/g, '');

  // Sign in first
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    throw new Error('Invalid Roll Number or Date of Birth');
  }

  // Now authenticated - fetch student record
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (studentError || !student) {
    await supabase.auth.signOut();
    throw new Error('Student record not found. Please contact admin.');
  }

  return {
    id: student.id,
    email: authData.user.email,
    role: 'STUDENT',
    name: student.name,
    studentId: student.id,
  };
}

// Get current user info
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Check role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!roleData) return null;

  const role = roleData.role as UserRole;

  if (role === 'ADMIN') {
    return {
      id: user.id,
      email: user.email,
      role: 'ADMIN',
      name: 'Administrator',
    };
  }

  if (role === 'FACULTY' || role === 'TUTOR') {
    const { data: faculty } = await supabase
      .from('faculty')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (faculty) {
      return {
        id: faculty.id,
        email: user.email,
        role: faculty.is_tutor ? 'TUTOR' : 'FACULTY',
        name: faculty.name,
        facultyId: faculty.faculty_id,
        isTutor: faculty.is_tutor,
      };
    }
  }

  if (role === 'STUDENT') {
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (student) {
      return {
        id: student.id,
        email: user.email,
        role: 'STUDENT',
        name: student.name,
        studentId: student.id,
      };
    }
  }

  return null;
}

// Logout
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// Check if today is user's birthday
export function isBirthday(dob: string): boolean {
  const today = new Date();
  const birthDate = new Date(dob);
  return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
}
