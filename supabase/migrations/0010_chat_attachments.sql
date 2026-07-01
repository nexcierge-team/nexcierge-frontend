-- Chat attachments: a private Storage bucket so account managers can send
-- documents and media to buyers inside the post-handoff chat. Files never
-- go through our server (the browser uploads straight to Storage, dodging
-- the platform's serverless request-body limit); only short-lived signed
-- URLs minted client-side ever expose them. Attachment metadata
-- (path / name / size / type) rides in chat_messages.metadata.attachments —
-- see lib/attachments.ts. These are sensitive B2B docs, so the bucket is
-- private and read access is gated to session members via RLS.
--
-- Path convention (enforced by the API route + the policies below):
--   "<chat_session_id>/<uuid>-<filename>"
-- so the first folder segment is always the owning session's id.

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', false, 26214400) -- 25 MiB
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- storage.objects already has RLS enabled by Supabase. Scope this bucket:

-- Upload: only an account manager assigned to the session may write into
-- that session's folder. The composer only renders once the AM has claimed
-- the brief, so legitimate uploads always satisfy assigned_am_user_id.
drop policy if exists "chat_attach_insert_am" on storage.objects;
create policy "chat_attach_insert_am" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_account_manager()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = ((storage.foldername(name))[1])::uuid
        and s.assigned_am_user_id = auth.uid()
    )
  );

-- Read: session members — the buyer who owns the session, or any account
-- manager — may read (and therefore sign URLs for) objects in that session's
-- folder. Mirrors the chat_messages SELECT policy so whoever can see the
-- message can see its attachments.
drop policy if exists "chat_attach_select_member" on storage.objects;
create policy "chat_attach_select_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = ((storage.foldername(name))[1])::uuid
        and (s.user_id = auth.uid() or public.is_account_manager())
    )
  );
