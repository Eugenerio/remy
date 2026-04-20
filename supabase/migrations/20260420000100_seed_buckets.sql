-- Create the three storage buckets Remy uses and wire conservative policies.
insert into storage.buckets (id, name, public)
values
  ('uploads',    'uploads',    false),
  ('datasets',   'datasets',   false),
  ('generations','generations',false)
on conflict (id) do nothing;

-- Users can upload to their own prefix in `uploads`.
create policy "uploads-own" on storage.objects
  for insert with check (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "uploads-own-read" on storage.objects
  for select using (
    bucket_id = 'uploads'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- datasets + generations are service-only; accessed via signed URLs.
create policy "datasets-none" on storage.objects
  for select using (false);

create policy "generations-none" on storage.objects
  for select using (false);
