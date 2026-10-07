begin;

-- Drop the 30-minute interval window constraint so sessions can have flexible durations (e.g., Morning 8:00 AM - 11:30 AM, Afternoon 1:00 PM - 5:00 PM)
alter table public.doctor_availability_slots
  drop constraint if exists doctor_availability_slots_30_min_window;

-- Ensure end_at is strictly after start_at
alter table public.doctor_availability_slots
  drop constraint if exists doctor_availability_slots_time_order_check;

alter table public.doctor_availability_slots
  add constraint doctor_availability_slots_time_order_check
  check (end_at > start_at);

commit;
