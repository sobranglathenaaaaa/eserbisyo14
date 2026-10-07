alter type public.reservation_status
  add value if not exists 'received' after 'ready_for_pickup';
