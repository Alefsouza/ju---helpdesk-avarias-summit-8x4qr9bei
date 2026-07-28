ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS status_interno TEXT;

CREATE OR REPLACE FUNCTION public.sync_chamado_status_interno()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_departamento TEXT;
BEGIN
  IF NEW.responsavel_id IS NOT NULL THEN
    SELECT departamento INTO v_departamento
    FROM public.perfil_usuario
    WHERE id = NEW.responsavel_id;
    
    NEW.status_interno := v_departamento;
  ELSE
    NEW.status_interno := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_sync_chamado_status_interno ON public.chamados;

CREATE TRIGGER trigger_sync_chamado_status_interno
  BEFORE INSERT OR UPDATE OF responsavel_id
  ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_chamado_status_interno();

DO $DO$
DECLARE
  batch_size INT := 1000;
  affected INT;
BEGIN
  LOOP
    WITH to_update AS (
      SELECT c.id, p.departamento 
      FROM public.chamados c
      JOIN public.perfil_usuario p ON c.responsavel_id = p.id
      WHERE c.responsavel_id IS NOT NULL AND c.status_interno IS NULL
      LIMIT batch_size
    )
    UPDATE public.chamados target
    SET status_interno = tu.departamento
    FROM to_update tu
    WHERE target.id = tu.id;

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $DO$;
