-- Seed data for local development / first deploy.
-- Catalog only — staff/rider accounts are created via Supabase Auth (signup or the
-- admin "create rider" flow), since profiles reference auth.users.

insert into public.categories (name, sort_order) values
  ('Fruits & Vegetables', 1),
  ('Dairy & Eggs', 2),
  ('Bakery', 3),
  ('Beverages', 4),
  ('Snacks', 5),
  ('Household', 6)
on conflict (name) do nothing;

-- Sample products, assigned to the backfilled Default Store (multi-tenant: products
-- carry store_id). The on_product_created trigger auto-creates an inventory row.
with cat as (
  select id, name from public.categories
),
store as (
  select id from public.stores where slug = 'default-store' limit 1
)
insert into public.products (name, description, category_id, price, store_id)
select v.name, v.description, cat.id, v.price, store.id
from (values
  ('Bananas (1 dozen)', 'Fresh ripe bananas', 'Fruits & Vegetables', 180.00),
  ('Tomatoes (1 kg)', 'Farm tomatoes', 'Fruits & Vegetables', 120.00),
  ('Full Cream Milk (1L)', 'Pasteurized milk', 'Dairy & Eggs', 220.00),
  ('Eggs (dozen)', 'Grade A eggs', 'Dairy & Eggs', 330.00),
  ('White Bread', 'Soft sandwich loaf', 'Bakery', 150.00),
  ('Orange Juice (1L)', 'No added sugar', 'Beverages', 410.00),
  ('Potato Chips', 'Salted, 100g', 'Snacks', 90.00),
  ('Dishwashing Liquid', '500ml', 'Household', 260.00)
) as v(name, description, category_name, price)
join cat on cat.name = v.category_name
cross join store
on conflict do nothing;

-- Give seeded products some starting stock.
update public.inventory set quantity = 50 where quantity = 0;
