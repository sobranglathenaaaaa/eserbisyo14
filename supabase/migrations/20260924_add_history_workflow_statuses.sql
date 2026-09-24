-- Add statuses used by resident history workflows.
alter type report_status add value if not exists 'approved' after 'pending';
alter type report_status add value if not exists 'proceed_to_barangay' after 'under_review';
alter type report_status add value if not exists 'declined' after 'resolved';

alter type reservation_status add value if not exists 'ready_for_pickup' after 'approved';
alter type reservation_status add value if not exists 'returned' after 'ready_for_pickup';
alter type reservation_status add value if not exists 'completed' after 'returned';

alter table public.checkup_appointments
	drop constraint if exists checkup_appointments_status_check;

alter table public.checkup_appointments
	add constraint checkup_appointments_status_check
	check (status in ('pending', 'approved', 'proceed_to_barangay', 'completed', 'declined', 'cancelled'));
