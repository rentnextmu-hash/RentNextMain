-- 0012_storage.sql
-- Supabase Storage buckets and policies for admin image uploads (P9.3b).
--
--   vehicles, locations — PUBLIC buckets: category and location photos,
--     shown on the public site. Public read; only active staff may write.
--   documents — PRIVATE bucket, unused in V1 (created for V2 licence /
--     damage scans): no public read; staff-only.
--
-- Wrapped in a guarded DO block with dynamic SQL because the storage
-- schema only exists on the real Supabase project (storage-api owns it) —
-- the local test stack has no storage schema, and unguarded
-- `create policy on storage.objects` there would fail. On a project
-- without the schema this is a clean no-op.
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present — skipping storage setup (local stack)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('vehicles', 'vehicles', true, 5242880, array['image/webp', 'image/png', 'image/jpeg']),
    ('locations', 'locations', true, 5242880, array['image/webp', 'image/png', 'image/jpeg']),
    ('documents', 'documents', false, 10485760, null)
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  -- Public read on the two public buckets (anon + authenticated).
  execute 'drop policy if exists "rn_public_read" on storage.objects';
  execute $p$
    create policy "rn_public_read" on storage.objects
      for select to anon, authenticated
      using (bucket_id in ('vehicles', 'locations'))
  $p$;

  -- Active staff may write to any bucket. is_staff() is the same helper
  -- used across the app's RLS (0002).
  execute 'drop policy if exists "rn_staff_insert" on storage.objects';
  execute $p$
    create policy "rn_staff_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id in ('vehicles', 'locations', 'documents') and public.is_staff())
  $p$;
  execute 'drop policy if exists "rn_staff_update" on storage.objects';
  execute $p$
    create policy "rn_staff_update" on storage.objects
      for update to authenticated
      using (bucket_id in ('vehicles', 'locations', 'documents') and public.is_staff())
  $p$;
  execute 'drop policy if exists "rn_staff_delete" on storage.objects';
  execute $p$
    create policy "rn_staff_delete" on storage.objects
      for delete to authenticated
      using (bucket_id in ('vehicles', 'locations', 'documents') and public.is_staff())
  $p$;
end $$;
