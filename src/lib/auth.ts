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

export async function adminLogin(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Login failed');

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'ADMIN') {
    await supabase.auth.signOut();
    throw new Error('Unauthorized: Admin access required');
  }

  return { id: data.user.id, email: data.user.email, role: 'ADMIN', name: 'Administrator' };
}

export async function facultyLogin(facultyId: string, dob: string): Promise<AuthUser> {
  const email = `${facultyId.toLowerCase()}@paavai.edu.in`;
  const password = dob.replace(/-/g, '');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error('Invalid Faculty ID or Date of Birth');

  const { data: faculty, error: facultyError } = await supabase
    .from('faculty')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (facultyError || !faculty) {
    await supabase.auth.signOut();
    throw new Error('Faculty record not found. Please contact admin.');
  }

  const role: UserRole = faculty.is_tutor ? 'TUTOR' : 'FACULTY';

  // ✅ FIX 1: Upsert role into user_roles so getCurrentUser() can find it
  await supabase
    .from('user_roles')
    .upsert({ user_id: authData.user.id, role }, { onConflict: 'user_id' });

  return {
    id: faculty.id,
    email: authData.user.email,
    role,
    name: faculty.name,
    facultyId: faculty.faculty_id,
    isTutor: faculty.is_tutor,
  };
}

export async function studentLogin(identifier: string, dob: string): Promise<AuthUser> {
  const cleanDob = dob.trim();
  const password = cleanDob.replace(/-/g, '');
  const upperIdentifier = identifier.toUpperCase().trim();

  const { data: lookupData, error: lookupError } = await supabase.functions.invoke('student-lookup', {
    body: { identifier: upperIdentifier },
  });

  const rollNumber = lookupData?.roll_number;
  if (lookupError || !rollNumber) {
    throw new Error('Student not found. Please check your Roll Number or Register Number.');
  }

  const email = `${rollNumber.toLowerCase()}@student.paavai.edu.in`;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error('Invalid credentials. Please check your Date of Birth.');

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (studentError || !student) {
    await supabase.auth.signOut();
    throw new Error('Student record not found. Please contact admin.');
  }

  // ✅ FIX 1 (same): Upsert role for students too
  await supabase
    .from('user_roles')
    .upsert({ user_id: authData.user.id, role: 'STUDENT' }, { onConflict: 'user_id' });

  return {
    id: student.id,
    email: authData.user.email,
    role: 'STUDENT',
    name: student.name,
    studentId: student.id,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  // ✅ FIX 2: If no role row yet (race condition right after login),
  // fall back to checking faculty/student tables directly
  if (!roleData) {
    const { data: faculty } = await supabase
      .from('faculty')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

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

    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (student) {
      return {
        id: student.id,
        email: user.email,
        role: 'STUDENT',
        name: student.name,
        studentId: student.id,
      };
    }

    return null;
  }

  const role = roleData.role as UserRole;

  if (role === 'ADMIN') {
    return { id: user.id, email: user.email, role: 'ADMIN', name: 'Administrator' };
  }

  if (role === 'FACULTY' || role === 'TUTOR') {
    const { data: faculty } = await supabase
      .from('faculty').select('*').eq('user_id', user.id).single();

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
      .from('students').select('*').eq('user_id', user.id).single();

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

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export function isBirthday(dob: string): boolean {
  const today = new Date();
  const birthDate = new Date(dob);
  return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
}
