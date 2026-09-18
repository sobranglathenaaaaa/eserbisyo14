alter table public.ocr_issuances
  add column if not exists ocr_progress_percent integer check (ocr_progress_percent is null or (ocr_progress_percent >= 0 and ocr_progress_percent <= 100));
