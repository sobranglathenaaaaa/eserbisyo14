-- Add an explicit document release state before a resident claims the document.
alter type request_status add value if not exists 'ready_for_pickup';
