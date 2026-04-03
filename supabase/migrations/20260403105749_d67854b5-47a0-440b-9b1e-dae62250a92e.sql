
CREATE OR REPLACE FUNCTION public.generate_faculty_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year TEXT;
  _max_num INTEGER;
  _new_id TEXT;
BEGIN
  _year := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Extract the max numeric suffix from existing faculty IDs for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN faculty_id LIKE 'FAC' || _year || '%' 
      THEN CAST(SUBSTRING(faculty_id FROM 6) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO _max_num
  FROM public.faculty;
  
  _new_id := 'FAC' || _year || LPAD(_max_num::TEXT, 4, '0');
  RETURN _new_id;
END;
$function$;
