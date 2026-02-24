-- Add goal column to sprints table.
-- Referenced by sprint creation API and sprint detail views.

ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS goal TEXT;
