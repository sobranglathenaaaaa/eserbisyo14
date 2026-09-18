-- Add 'staff_reviewed' to request_status enum
alter type request_status add value 'staff_reviewed' before 'approved';

-- Add staff_review_note column to document_requests table to track staff review notes
alter table public.document_requests add column if not exists staff_review_note text;

