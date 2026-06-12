-- Storage buckets and their access policies.
-- Bucket names mirror packages/shared STORAGE_BUCKETS.

-- Public-read product images (write restricted to ops staff).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Private avatars (owner-managed).
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

-- -------- product-images policies --------

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_ops_write" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and public.auth_role() in ('admin', 'stock_keeper')
  );

create policy "product_images_ops_update" on storage.objects
  for update using (
    bucket_id = 'product-images' and public.auth_role() in ('admin', 'stock_keeper')
  );

create policy "product_images_ops_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images' and public.auth_role() in ('admin', 'stock_keeper')
  );

-- -------- profile-avatars policies (owner = first path segment) --------

create policy "avatars_owner_read" on storage.objects
  for select using (
    bucket_id = 'profile-avatars' and owner = auth.uid()
  );

create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'profile-avatars' and owner = auth.uid()
  );

create policy "avatars_owner_modify" on storage.objects
  for update using (bucket_id = 'profile-avatars' and owner = auth.uid());

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'profile-avatars' and owner = auth.uid());
