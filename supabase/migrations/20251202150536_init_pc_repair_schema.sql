-- ==========================
-- TABLE: showrooms (the tenants)
-- ==========================
create table showrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  logo_url text,
  created_at timestamptz default now()
);

-- ==========================
-- TABLE: showroom_users
-- ==========================
create table showroom_users (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid references showrooms(id) on delete cascade,
  auth_user_id uuid not null,
  full_name text,
  role text check (role in ('manager', 'employee')),
  created_at timestamptz default now()
);

-- ==========================
-- TABLE: customers
-- ==========================
create table customers (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid references showrooms(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz default now()
);

-- ==========================
-- TABLE: repair_orders
-- ==========================
create table repair_orders (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid references showrooms(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  status text check (
    status in ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')
  ) default 'pending',
  device_type text,
  device_brand text,
  device_model text,
  problem_description text,
  technician_notes text,
  price numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==========================
-- TABLE: technicians (Repair shop staff)
-- ==========================
create table technicians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  active boolean default true
);

-- ==========================
-- TABLE: technician_assignments
-- ==========================
create table technician_assignments (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid references repair_orders(id) on delete cascade,
  technician_id uuid references technicians(id) on delete set null,
  assigned_at timestamptz default now()
);

-- ==========================
-- TABLE: showroom_settings
-- ==========================
create table showroom_settings (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid references showrooms(id) on delete cascade unique,
  currency text default 'USD',
  language text default 'en',
  price_markup numeric(5,2) default 0,
  created_at timestamptz default now()
);