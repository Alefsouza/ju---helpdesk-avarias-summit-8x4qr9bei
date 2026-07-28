-- Optimization for fetching RA (protocolo_ido) alongside documentos data
CREATE INDEX IF NOT EXISTS formularios_ido_protocolo_ido_idx ON public.formularios_ido USING btree (protocolo_ido);
