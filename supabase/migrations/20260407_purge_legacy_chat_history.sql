-- Permanently purge legacy persisted chatbot history.
-- The app now uses ephemeral chat state and no longer reads/writes these rows.

begin;

-- Child table first for explicitness (chat_sessions has ON DELETE CASCADE).
delete from public.chat_messages;
delete from public.chat_sessions;

commit;
