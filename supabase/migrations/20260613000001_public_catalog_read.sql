-- Allow unauthenticated (anon) users to browse the catalog.
-- Previously restricted to authenticated only, which blocked the shop's public browsing.

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories
  for select using (true);

drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products
  for select using (true);

drop policy if exists "inventory_select_all" on public.inventory;
create policy "inventory_select_all" on public.inventory
  for select using (true);
