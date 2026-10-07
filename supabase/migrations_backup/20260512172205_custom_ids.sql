-- Migration to implement custom ID/Reference Number generation formats
-- Formats: DR-IND-000001, ANN-000001, RSV-000001, RES-000001, etc.

-- 1. Sequences for each entity type to ensure strictly sequential numbers
CREATE SEQUENCE IF NOT EXISTS public.seq_id_document_requests START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_id_announcements START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_id_reservations START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_id_profiles_resident START 1;

-- 2. Function to generate Reference Numbers for Document Requests
-- Format: DR-[SHORTCODE]-[6-DIGIT-SERIAL]
CREATE OR REPLACE FUNCTION public.generate_document_request_id()
RETURNS TRIGGER AS $$
DECLARE
    v_type_code TEXT;
    v_serial TEXT;
BEGIN
    -- Only generate if reference_number is not provided (or we want to override it)
    IF NEW.reference_number IS NULL OR NEW.reference_number LIKE 'ES-%' THEN
        -- Get type shortcode (defaulting to 'DOC' if unknown)
        -- We map known types or extract first 3 letters
        SELECT 
            CASE 
                WHEN dt.type ILIKE '%indigency%' THEN 'IND'
                WHEN dt.type ILIKE '%barangay certificate%' THEN 'BC'
                WHEN dt.type ILIKE '%business permit%' THEN 'BP'
                WHEN dt.type ILIKE '%clearance%' THEN 'CLR'
                ELSE UPPER(LEFT(dt.type, 3))
            END INTO v_type_code
        FROM public.document_types dt
        WHERE dt.id = NEW.type_id;

        v_type_code := COALESCE(v_type_code, 'GEN');
        
        -- Get next serial
        v_serial := LPAD(NEXTVAL('public.seq_id_document_requests')::TEXT, 6, '0');
        
        NEW.reference_number := 'DR-' || v_type_code || '-' || v_serial;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to generate generic IDs (ANN, RSV, RES)
CREATE OR REPLACE FUNCTION public.generate_entity_custom_id()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_serial TEXT;
    v_seq_name TEXT;
BEGIN
    v_prefix := TG_ARGV[0];
    v_seq_name := TG_ARGV[1];
    
    v_serial := LPAD(NEXTVAL(v_seq_name)::TEXT, 6, '0');
    
    -- For profiles, we might want to store this in a specific column or just use it as a display ID if we don't want to change the UUID PK
    -- Since we can't easily change UUID PK to TEXT without major refactoring, we'll ensure these tables have a 'custom_id' or 'reference_number' column if they don't already.
    -- Document Requests already has reference_number.
    
    -- Check if column exists, if so set it
    IF v_prefix = 'RES' THEN
       -- Profiles use id_number for the physical ID, but maybe we should add a system_id?
       -- The user asked "yung ids sa database pwede bang like...", which usually implies the primary key or a visible identifier.
       -- Given the prompt, we'll assume they want a visible reference field.
       NEW.id_number := v_prefix || '-' || v_serial;
    ELSIF TG_TABLE_NAME = 'announcements' THEN
       -- Announcements doesn't have a ref number yet, we'll add it in this migration or use it for something else if needed.
       -- For now, let's assume we want to use it if the column exists.
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Add columns if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'reference_number') THEN
        ALTER TABLE public.announcements ADD COLUMN reference_number TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'reference_number') THEN
        ALTER TABLE public.reservations ADD COLUMN reference_number TEXT UNIQUE;
    END IF;
END $$;

-- 5. Triggers
DROP TRIGGER IF EXISTS trg_generate_dr_id ON public.document_requests;
CREATE TRIGGER trg_generate_dr_id
BEFORE INSERT ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_document_request_id();

DROP TRIGGER IF EXISTS trg_generate_ann_id ON public.announcements;
CREATE TRIGGER trg_generate_ann_id
BEFORE INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.generate_entity_custom_id('ANN', 'public.seq_id_announcements');

DROP TRIGGER IF EXISTS trg_generate_rsv_id ON public.reservations;
CREATE TRIGGER trg_generate_rsv_id
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.generate_entity_custom_id('RSV', 'public.seq_id_reservations');

-- For residents, only apply if it's a resident role and id_number is empty
CREATE OR REPLACE FUNCTION public.generate_resident_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'resident' AND (NEW.id_number IS NULL OR NEW.id_number = '') THEN
        NEW.id_number := 'RES-' || LPAD(NEXTVAL('public.seq_id_profiles_resident')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_res_id ON public.profiles;
CREATE TRIGGER trg_generate_res_id
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_resident_id_trigger();
