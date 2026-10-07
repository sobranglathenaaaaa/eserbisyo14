-- Keep requests already in the retired processing state moving through the new workflow.
update public.document_requests
set status = 'approved',
    updated_at = now()
where status::text = 'processing';
