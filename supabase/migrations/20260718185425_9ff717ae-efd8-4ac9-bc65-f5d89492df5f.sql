
CREATE TABLE public.grade_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  source_table text NOT NULL,
  source_row_id uuid,
  subject text,
  field text NOT NULL,
  old_value text,
  new_value text,
  action text NOT NULL,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.grade_audit TO authenticated;
GRANT ALL ON public.grade_audit TO service_role;

ALTER TABLE public.grade_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all grade audit"
  ON public.grade_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Faculty can view all grade audit"
  ON public.grade_audit FOR SELECT TO authenticated
  USING (public.is_faculty(auth.uid()));

CREATE POLICY "Students can view their own grade audit"
  ON public.grade_audit FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "System can insert grade audit"
  ON public.grade_audit FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_subject_score_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.grade_audit(student_id, source_table, source_row_id, subject, field, old_value, new_value, action, changed_by)
    VALUES (NEW.student_id,'subject_scores',NEW.id,NEW.subject,'internal_marks',NULL,COALESCE(NEW.internal_marks::text,''),'INSERT',auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.internal_marks,-1) IS DISTINCT FROM COALESCE(OLD.internal_marks,-1) THEN
      INSERT INTO public.grade_audit(student_id, source_table, source_row_id, subject, field, old_value, new_value, action, changed_by)
      VALUES (NEW.student_id,'subject_scores',NEW.id,NEW.subject,'internal_marks',OLD.internal_marks::text,NEW.internal_marks::text,'UPDATE',auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.grade_audit(student_id, source_table, source_row_id, subject, field, old_value, new_value, action, changed_by)
    VALUES (OLD.student_id,'subject_scores',OLD.id,OLD.subject,'internal_marks',OLD.internal_marks::text,NULL,'DELETE',auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

CREATE TRIGGER trg_subject_scores_audit
AFTER INSERT OR UPDATE OR DELETE ON public.subject_scores
FOR EACH ROW EXECUTE FUNCTION public.log_subject_score_change();

CREATE OR REPLACE FUNCTION public.log_academic_record_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.grade_audit(student_id, source_table, source_row_id, subject, field, old_value, new_value, action, changed_by)
    VALUES (NEW.student_id,'academic_records',NEW.id,'Semester '||NEW.semester,'cgpa',NULL,COALESCE(NEW.cgpa::text,''),'INSERT',auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.cgpa,-1) IS DISTINCT FROM COALESCE(OLD.cgpa,-1) THEN
      INSERT INTO public.grade_audit(student_id, source_table, source_row_id, subject, field, old_value, new_value, action, changed_by)
      VALUES (NEW.student_id,'academic_records',NEW.id,'Semester '||NEW.semester,'cgpa',OLD.cgpa::text,NEW.cgpa::text,'UPDATE',auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.grade_audit(student_id, source_table, source_row_id, subject, field, old_value, new_value, action, changed_by)
    VALUES (OLD.student_id,'academic_records',OLD.id,'Semester '||OLD.semester,'cgpa',OLD.cgpa::text,NULL,'DELETE',auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

CREATE TRIGGER trg_academic_records_audit
AFTER INSERT OR UPDATE OR DELETE ON public.academic_records
FOR EACH ROW EXECUTE FUNCTION public.log_academic_record_change();
