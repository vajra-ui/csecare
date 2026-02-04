-- Create enums for roles and status types
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'FACULTY', 'TUTOR', 'STUDENT');
CREATE TYPE public.section_type AS ENUM ('CSE A', 'CSE B', 'CSE C', 'CSE D');
CREATE TYPE public.year_type AS ENUM ('I', 'II', 'III', 'IV');
CREATE TYPE public.announcement_priority AS ENUM ('info', 'important', 'urgent');
CREATE TYPE public.announcement_target AS ENUM ('all', 'faculty', 'students');
CREATE TYPE public.od_status AS ENUM ('submitted', 'tutor_verified', 'admin_approved', 'completed', 'rejected');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table for basic user info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create faculty table first (referenced by students)
CREATE TABLE public.faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    faculty_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    qualification TEXT,
    years_of_experience INTEGER DEFAULT 0,
    current_subjects TEXT[],
    section section_type,
    is_tutor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL UNIQUE,
    register_number TEXT NOT NULL UNIQUE,
    dob DATE NOT NULL,
    section section_type NOT NULL,
    year year_type NOT NULL,
    tutor_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority announcement_priority NOT NULL DEFAULT 'info',
    target_audience announcement_target NOT NULL DEFAULT 'all',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timetable table
CREATE TABLE public.timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID REFERENCES public.faculty(id) ON DELETE CASCADE NOT NULL,
    section section_type NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 6),
    hour_number INTEGER NOT NULL CHECK (hour_number >= 1 AND hour_number <= 8),
    subject TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hour_number INTEGER NOT NULL CHECK (hour_number >= 1 AND hour_number <= 8),
    subject TEXT NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, date, hour_number)
);

-- Create academic_records table for CGPA and scores
CREATE TABLE public.academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    cgpa DECIMAL(3,2) CHECK (cgpa >= 0 AND cgpa <= 10),
    guidance_notes TEXT,
    uploaded_by UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, semester)
);

-- Create subject_scores table
CREATE TABLE public.subject_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    internal_marks DECIMAL(5,2),
    external_marks DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    grade TEXT,
    uploaded_by UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create od_requests table (On Duty requests)
CREATE TABLE public.od_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    letter_url TEXT,
    status od_status NOT NULL DEFAULT 'submitted',
    tutor_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    tutor_verified_at TIMESTAMP WITH TIME ZONE,
    tutor_remarks TEXT,
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    admin_remarks TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignments table
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID REFERENCES public.faculty(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    section section_type NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    grade TEXT,
    feedback TEXT,
    UNIQUE(assignment_id, student_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.od_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (using text comparison to avoid type issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::TEXT = _role
  )
$$;

-- Function to check if user is faculty
CREATE OR REPLACE FUNCTION public.is_faculty(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.faculty WHERE user_id = _user_id
  )
$$;

-- Function to check if user is tutor
CREATE OR REPLACE FUNCTION public.is_tutor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.faculty WHERE user_id = _user_id AND is_tutor = true
  )
$$;

-- RLS Policies

-- User roles policies
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Students policies
CREATE POLICY "Students can view their own record" ON public.students
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Faculty can view all students" ON public.students
FOR SELECT USING (public.is_faculty(auth.uid()));

CREATE POLICY "Admins can manage all students" ON public.students
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Faculty policies
CREATE POLICY "Faculty can view their own record" ON public.faculty
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "All authenticated users can view faculty" ON public.faculty
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all faculty" ON public.faculty
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Announcements policies (public read for active)
CREATE POLICY "Anyone can view active announcements" ON public.announcements
FOR SELECT USING (
  is_active = true 
  AND start_date <= now() 
  AND expiry_date > now()
);

CREATE POLICY "Admins can manage announcements" ON public.announcements
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Timetable policies
CREATE POLICY "Faculty can view timetables" ON public.timetable
FOR SELECT USING (public.is_faculty(auth.uid()));

CREATE POLICY "Admins can manage timetables" ON public.timetable
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Attendance policies
CREATE POLICY "Students can view their own attendance" ON public.attendance
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);

CREATE POLICY "Faculty can manage attendance" ON public.attendance
FOR ALL USING (public.is_faculty(auth.uid()));

CREATE POLICY "Admins can manage attendance" ON public.attendance
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Academic records policies
CREATE POLICY "Students can view their own records" ON public.academic_records
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);

CREATE POLICY "Tutors can manage academic records" ON public.academic_records
FOR ALL USING (public.is_tutor(auth.uid()));

CREATE POLICY "Admins can manage academic records" ON public.academic_records
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Subject scores policies
CREATE POLICY "Students can view their own scores" ON public.subject_scores
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);

CREATE POLICY "Tutors can manage subject scores" ON public.subject_scores
FOR ALL USING (public.is_tutor(auth.uid()));

CREATE POLICY "Admins can view all scores" ON public.subject_scores
FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

-- OD requests policies
CREATE POLICY "Students can manage their own OD requests" ON public.od_requests
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);

CREATE POLICY "Tutors can manage OD requests" ON public.od_requests
FOR ALL USING (public.is_tutor(auth.uid()));

CREATE POLICY "Admins can manage all OD requests" ON public.od_requests
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Assignments policies
CREATE POLICY "Faculty can manage their assignments" ON public.assignments
FOR ALL USING (public.is_faculty(auth.uid()));

CREATE POLICY "Students can view assignments" ON public.assignments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all assignments" ON public.assignments
FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Assignment submissions policies
CREATE POLICY "Students can manage their submissions" ON public.assignment_submissions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);

CREATE POLICY "Faculty can view submissions" ON public.assignment_submissions
FOR SELECT USING (public.is_faculty(auth.uid()));

CREATE POLICY "Admins can view all submissions" ON public.assignment_submissions
FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

-- Audit logs policies
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- Helper functions
CREATE OR REPLACE FUNCTION public.generate_faculty_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _count INTEGER;
  _new_id TEXT;
BEGIN
  _year := TO_CHAR(CURRENT_DATE, 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.faculty;
  _new_id := 'FAC' || _year || LPAD(_count::TEXT, 4, '0');
  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attendance_percentage(_student_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE is_present = true)::DECIMAL / COUNT(*)) * 100, 2)
    END
  FROM public.attendance
  WHERE student_id = _student_id
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON public.faculty
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_records_updated_at BEFORE UPDATE ON public.academic_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_od_requests_updated_at BEFORE UPDATE ON public.od_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();