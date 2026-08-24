-- Ejecutar UNA VEZ en Supabase SQL Editor.
-- Permite dos reservas por fecha: una de día y una nocturna.
-- La fecha representa el día de inicio de la reserva nocturna.

ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS horario text;

ALTER TABLE public.reservas
DROP CONSTRAINT IF EXISTS reservas_horario_check;

ALTER TABLE public.reservas
ADD CONSTRAINT reservas_horario_check
CHECK (horario IS NULL OR horario IN ('10:00-17:00', '22:00-05:00'));

CREATE UNIQUE INDEX IF NOT EXISTS reservas_fecha_horario_unique
ON public.reservas (fecha, horario)
WHERE horario IS NOT NULL;

-- IMPORTANTE:
-- El frontend valida que solo se creen reservas viernes/sábado/domingo.
-- La restricción anterior impide dos reservas del MISMO turno en la misma fecha,
-- pero permite exactamente dos turnos distintos el mismo día.
