


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'technician',
    'manager',
    'employee',
    'driver',
    'customer',
    'guest'
);


ALTER TYPE "public"."user_role" OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."_trg_recompute_repair_cost_after_del"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.recompute_repair_cost(OLD.repair_id);
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."_trg_recompute_repair_cost_after_del"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.recompute_repair_cost(NEW.repair_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_financials"("p_repair_id" "uuid", "p_cost" numeric, "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set cost = p_cost,
      price = p_price
  where id = p_repair_id
    and exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    );
end;
$$;


ALTER FUNCTION "public"."admin_update_financials"("p_repair_id" "uuid", "p_cost" numeric, "p_price" numeric) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."apply_repair_service_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.repair_service_id is not null then
    select
      coalesce(rsp.cost, rs.default_cost),
      coalesce(rsp.price, rs.default_price)
    into
      new.cost,
      new.price
    from repair_services rs
    left join repair_service_prices rsp
      on rsp.repair_service_id = rs.id
     and rsp.showroom_id = new.showroom_id
    where rs.id = new.repair_service_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."apply_repair_service_defaults"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."block_manual_repair_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (
    new.sent_to_repair_at       is distinct from old.sent_to_repair_at or
    new.in_repair_at            is distinct from old.in_repair_at or
    new.waiting_parts_at        is distinct from old.waiting_parts_at or
    new.repaired_at             is distinct from old.repaired_at or
    new.returned_to_showroom_at is distinct from old.returned_to_showroom_at or
    new.delivered_at            is distinct from old.delivered_at or
    new.cancelled_at            is distinct from old.cancelled_at
  ) then
    raise exception 'Manual modification of repair timestamps is not allowed';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."block_manual_repair_timestamps"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."block_manual_status_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR
       NEW.repair_phase IS DISTINCT FROM OLD.repair_phase THEN
      RAISE EXCEPTION 'Status and phase are system-controlled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_manual_status_update"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."check_driver_showroom"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  driver_showroom uuid;
begin
  -- Validate sent_by_driver_id (sending showroom)
  if NEW.sent_by_driver_id is not null then
    select showroom_id into driver_showroom
    from drivers
    where id = NEW.sent_by_driver_id;

    if driver_showroom is null then
      raise exception 'Driver % does not exist', NEW.sent_by_driver_id;
    end if;

    if driver_showroom != NEW.showroom_id then
      raise exception 'Driver % does not belong to the sending showroom', NEW.sent_by_driver_id;
    end if;
  end if;


  -- Validate returned_by_driver_id (receiving showroom)
  if NEW.returned_by_driver_id is not null then
    select showroom_id into driver_showroom
    from drivers
    where id = NEW.returned_by_driver_id;

    if driver_showroom is null then
      raise exception 'Driver % does not exist', NEW.returned_by_driver_id;
    end if;

    if driver_showroom != NEW.showroom_id then
      raise exception 'Driver % does not belong to the receiving showroom', NEW.returned_by_driver_id;
    end if;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."check_driver_showroom"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."create_user_secure"("p_email" "text", "p_full_name" "text", "p_role" "text", "p_showroom_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  creator_role text;
  creator_showroom uuid;
begin
  select role, showroom_id
  into creator_role, creator_showroom
  from public.profiles
  where id = auth.uid();

  -- Only admin or manager
  if creator_role not in ('admin','manager') then
    raise exception 'Not authorized';
  end if;

  -- Manager restrictions
  if creator_role = 'manager' then
    if p_role = 'admin' then
      raise exception 'Manager cannot create admin';
    end if;

    p_showroom_id := creator_showroom;
  end if;

  -- Non-admin must have showroom
  if p_role != 'admin' and p_showroom_id is null then
    raise exception 'Showroom required';
  end if;

  -- Create auth user
  insert into auth.users (email)
  values (p_email)
  returning id into strict p_showroom_id;

  -- Create profile
  insert into public.profiles (
    id,
    full_name,
    role,
    showroom_id,
    active
  ) values (
    p_showroom_id,
    p_full_name,
    p_role,
    p_showroom_id,
    true
  );
end;
$$;


ALTER FUNCTION "public"."create_user_secure"("p_email" "text", "p_full_name" "text", "p_role" "text", "p_showroom_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."current_profile"() RETURNS TABLE("user_id" "uuid", "role" "text", "showroom_id" "uuid", "is_repair_shop" boolean, "active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select
    p.id,
    p.role,
    p.showroom_id,
    p.is_repair_shop,
    p.active
  from profiles p
  where p.id = auth.uid();
$$;


ALTER FUNCTION "public"."current_profile"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."current_user_showroom"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT showroom_id
  FROM profiles
  WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_showroom"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."driver_update_transport"("p_repair_id" "uuid", "p_sent" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set
    sent_to_repair_at = case when p_sent then now() else sent_to_repair_at end,
    returned_from_repair_at = case when not p_sent then now() else returned_from_repair_at end
  where id = p_repair_id;
end;
$$;


ALTER FUNCTION "public"."driver_update_transport"("p_repair_id" "uuid", "p_sent" boolean) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."employee_update_intake"("p_repair_id" "uuid", "p_reported_problem" "text", "p_intake_condition" "text", "p_accessories_received" "text", "p_password_provided" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set
    reported_problem = p_reported_problem,
    intake_condition = p_intake_condition,
    accessories_received = p_accessories_received,
    password_provided = p_password_provided
  where id = p_repair_id;
end;
$$;


ALTER FUNCTION "public"."employee_update_intake"("p_repair_id" "uuid", "p_reported_problem" "text", "p_intake_condition" "text", "p_accessories_received" "text", "p_password_provided" boolean) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."enforce_repair_approval_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  /* ===============================
     CUSTOMER APPROVAL
     =============================== */
  if old.customer_approved_at is null
     and new.customer_approved_at is not null then

    -- Admin: allowed everywhere
    if exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.active = true
    ) then
      return new;
    end if;

    -- Employee / Manager: own showroom only
    if exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role in ('employee','manager')
        and p.showroom_id = new.showroom_id
        and p.active = true
    ) then
      return new;
    end if;

    raise exception 'Unauthorized customer approval';
  end if;

  /* ===============================
     SHOWROOM APPROVAL
     =============================== */
  if old.showroom_approved_at is null
     and new.showroom_approved_at is not null then

    -- Admin is NEVER allowed
    if exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.active = true
    ) then
      raise exception 'Admin cannot set showroom approval';
    end if;

    -- Customer approval must exist first
    if old.customer_approved_at is null then
      raise exception 'Customer approval required first';
    end if;

    -- Employee / Manager: own showroom only
    if exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role in ('employee','manager')
        and p.showroom_id = new.showroom_id
        and p.active = true
    ) then
      return new;
    end if;

    raise exception 'Unauthorized showroom approval';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_repair_approval_rules"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."enforce_repair_phase_transitions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_role text;
begin
  -- Allow no-op updates
  if new.repair_phase is not distinct from old.repair_phase then
    return new;
  end if;

  -- Get role
  select role
  into v_role
  from profiles
  where id = auth.uid();

  -- Admin can do anything
  if v_role = 'admin' then
    return new;
  end if;

  -- Technician transitions
  if v_role = 'technician' then
    if not (
      (old.repair_phase = 'sent_to_repair' and new.repair_phase = 'in_repair') or
      (old.repair_phase = 'in_repair' and new.repair_phase in ('waiting_parts', 'repaired'))
    ) then
      raise exception 'Invalid phase transition for technician: % → %',
        old.repair_phase, new.repair_phase;
    end if;

    return new;
  end if;

  -- Employee / Manager transitions
  if v_role in ('employee', 'manager') then
    if not (
      (old.repair_phase = 'intake' and new.repair_phase = 'sent_to_repair') or
      (old.repair_phase = 'waiting_parts' and new.repair_phase = 'in_repair') or
      (old.repair_phase = 'repaired' and new.repair_phase = 'returned_to_showroom') or
      (old.repair_phase = 'returned_to_showroom' and new.repair_phase = 'delivered')
    ) then
      raise exception 'Invalid phase transition for %: % → %',
        v_role, old.repair_phase, new.repair_phase;
    end if;

    return new;
  end if;

  -- Default deny
  raise exception 'Repair phase update not permitted for role %', v_role;
end;
$$;


ALTER FUNCTION "public"."enforce_repair_phase_transitions"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."enforce_repairs_update_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  role text := current_user_role();
BEGIN
  -- System / internal updates
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  ----------------------------------------------------------------
  -- EMPLOYEE
  ----------------------------------------------------------------
  IF role = 'employee' THEN

    -- Allowed changes ONLY
    IF
      NEW.reported_problem     IS DISTINCT FROM OLD.reported_problem OR
      NEW.intake_condition     IS DISTINCT FROM OLD.intake_condition OR
      NEW.accessories_received IS DISTINCT FROM OLD.accessories_received OR
      NEW.data_importance      IS DISTINCT FROM OLD.data_importance OR
      NEW.password_provided    IS DISTINCT FROM OLD.password_provided OR
      NEW.repair_summary       IS DISTINCT FROM OLD.repair_summary
    THEN
      -- allowed, but continue validation
      NULL;
    END IF;

    -- 🔴 BLOCK EVERYTHING ELSE
    IF
      NEW.price                IS DISTINCT FROM OLD.price OR
      NEW.status               IS DISTINCT FROM OLD.status OR
      NEW.repair_phase         IS DISTINCT FROM OLD.repair_phase OR
      NEW.showroom_approved    IS DISTINCT FROM OLD.showroom_approved OR
      NEW.customer_approved    IS DISTINCT FROM OLD.customer_approved OR
      NEW.showroom_approved_at IS DISTINCT FROM OLD.showroom_approved_at OR
      NEW.customer_approved_at IS DISTINCT FROM OLD.customer_approved_at OR
      NEW.technician_id        IS DISTINCT FROM OLD.technician_id OR
      NEW.sent_by_driver_id    IS DISTINCT FROM OLD.sent_by_driver_id OR
      NEW.returned_by_driver_id IS DISTINCT FROM OLD.returned_by_driver_id
    THEN
      RAISE EXCEPTION 'Employees may only edit intake and diagnosis fields';
    END IF;

  END IF;

  ----------------------------------------------------------------
  -- ADMIN
  ----------------------------------------------------------------
  IF role = 'admin' THEN
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_repairs_update_rules"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."generate_repair_ref"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  current_year int := extract(year from now());
  next_number int;
begin
  insert into repair_counters (year, last_number)
  values (current_year, 0)
  on conflict (year) do nothing;

  update repair_counters
  set last_number = last_number + 1
  where year = current_year
  returning last_number into next_number;

  return current_year || '/' || lpad(next_number::text, 4, '0');
end;
$$;


ALTER FUNCTION "public"."generate_repair_ref"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."generate_repair_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  new_seq integer;
begin
  -- Lock row per year
  insert into repair_sequences(year, last_seq)
  values (extract(year from now()), 0)
  on conflict (year) do nothing;

  update repair_sequences
  set last_seq = last_seq + 1
  where year = extract(year from now())
  returning last_seq into new_seq;

  new.repair_year := extract(year from now());
  new.repair_seq := new_seq;
  new.repair_ref := new.repair_year || '/' || lpad(new_seq::text, 4, '0');

  return new;
end;
$$;


ALTER FUNCTION "public"."generate_repair_reference"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (
      id,
      username,
      password_hash,
      active
    )
    VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1),
      'AUTH_MANAGED',
      true
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION
        'handle_new_auth_user failed: %',
        SQLERRM;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jwt_custom_claims"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'showroom_id', p.showroom_id,
    'role', p.role
  )
  from profiles p
  where p.id = auth.uid();
$$;


ALTER FUNCTION "public"."jwt_custom_claims"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."login_user"("in_username" "text", "in_password" "text", "in_mac" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  u record;
  mac_entry record;
begin
  -- 1. Check user exists and password matches
  select *
  into u
  from users
  where username = in_username
    and active = true;

  if not found then
    return json_build_object('success', false, 'error', 'invalid-username-or-password');
  end if;

  if crypt(in_password, u.password_hash) <> u.password_hash then
    return json_build_object('success', false, 'error', 'invalid-username-or-password');
  end if;

  -- 2. Check MAC is allowed for this user's showroom
  select *
  into mac_entry
  from device_auth
  where mac_address = in_mac
    and showroom_id = u.showroom_id
    and active = true;

  if not found then
    return json_build_object('success', false, 'error', 'unauthorized-device');
  end if;

  -- 3. Return user info
  return json_build_object(
    'success', true,
    'user_id', u.id,
    'full_name', u.full_name,
    'role', u.role,
    'showroom_id', u.showroom_id,
    'language', u.language
  );
end;
$$;


ALTER FUNCTION "public"."login_user"("in_username" "text", "in_password" "text", "in_mac" "text") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."manager_set_repair_cost"("p_repair_id" "uuid", "p_cost" numeric, "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set
    cost = p_cost,
    status = p_status
  where id = p_repair_id;
end;
$$;


ALTER FUNCTION "public"."manager_set_repair_cost"("p_repair_id" "uuid", "p_cost" numeric, "p_status" "text") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."recompute_repair_cost"("p_repair_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_sum numeric(18,2);
BEGIN
  SELECT COALESCE(SUM(COALESCE(rvi.price_override, ri.default_price) * COALESCE(rvi.quantity,1)),0)
  INTO v_sum
  FROM public.repair_visit_items rvi
  JOIN public.repair_items ri ON ri.id = rvi.repair_item_id
  WHERE rvi.repair_id = p_repair_id;

  UPDATE public.repairs SET cost = v_sum WHERE id = p_repair_id;
END;
$$;


ALTER FUNCTION "public"."recompute_repair_cost"("p_repair_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_repair_phase_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- No phase change → do nothing
  if new.repair_phase is not distinct from old.repair_phase then
    return new;
  end if;

  -- Set timestamps only once
  case new.repair_phase
    when 'sent_to_repair' then
      if old.sent_to_repair_at is null then
        new.sent_to_repair_at := now();
      end if;

    when 'in_repair' then
      if old.in_repair_at is null then
        new.in_repair_at := now();
      end if;

    when 'waiting_parts' then
      if old.waiting_parts_at is null then
        new.waiting_parts_at := now();
      end if;

    when 'repaired' then
      if old.repaired_at is null then
        new.repaired_at := now();
      end if;

    when 'returned_to_showroom' then
      if old.returned_to_showroom_at is null then
        new.returned_to_showroom_at := now();
      end if;

    when 'delivered' then
      if old.delivered_at is null then
        new.delivered_at := now();
      end if;

    when 'cancelled' then
      if old.cancelled_at is null then
        new.cancelled_at := now();
      end if;
  end case;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_repair_phase_timestamps"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."set_repair_ref"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.repair_ref is null then
    new.repair_ref := generate_repair_ref();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_repair_ref"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."showroom_update_price"("p_repair_id" "uuid", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set price = p_price
  where id = p_repair_id
    and exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role in ('employee', 'manager')
    );
end;
$$;


ALTER FUNCTION "public"."showroom_update_price"("p_repair_id" "uuid", "p_price" numeric) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."sync_repair_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  /* ===============================
     DELIVERY / COMPLETION
     =============================== */
  if new.completed_at is not null then
    new.status := 'completed';
    return new;
  end if;

  if new.repair_phase = 'delivered' then
    new.status := 'delivered';
    return new;
  end if;

  /* ===============================
     IN-PROGRESS
     =============================== */
  if new.started_at is not null then
    new.status := 'in_progress';
    return new;
  end if;

  /* ===============================
     APPROVAL FLOW
     =============================== */
  if new.showroom_approved_at is not null then
    new.status := 'approved';
    return new;
  end if;

  if new.customer_approved_at is not null then
    new.status := 'awaiting_showroom_approval';
    return new;
  end if;

  /* ===============================
     DIAGNOSIS
     =============================== */
  if new.repair_phase in ('in_repair','waiting_parts','repaired') then
    new.status := 'in_diagnosis';
    return new;
  end if;

  /* ===============================
     DEFAULT / INTAKE
     =============================== */
  new.status := 'awaiting_delivery_to_shop';
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_repair_status"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."technician_update_cost"("p_repair_id" "uuid", "p_cost" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set cost = p_cost
  where id = p_repair_id
    and exists (
      select 1
      from profiles p
      where p.id = auth.uid()
        and p.role = 'technician'
    );
end;
$$;


ALTER FUNCTION "public"."technician_update_cost"("p_repair_id" "uuid", "p_cost" numeric) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."technician_update_repair"("p_repair_id" "uuid", "p_status" "text", "p_repair_summary" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update repairs
  set
    status = p_status,
    repair_summary = p_repair_summary,
    completed_at = case
      when p_status = 'completed' then now()
      else completed_at
    end
  where id = p_repair_id;
end;
$$;


ALTER FUNCTION "public"."technician_update_repair"("p_repair_id" "uuid", "p_status" "text", "p_repair_summary" "text") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_showroom_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- CASE 1: New repair is completed (old row does not exist)
  if (tg_op = 'INSERT') then
    if new.status = 'completed' then
      update showrooms
      set balance = balance + new.cost
      where id = new.showroom_id;
    end if;
    return new;
  end if;

  -- CASE 2: Update from non-completed → completed
  if (old.status != 'completed' and new.status = 'completed') then
    update showrooms
    set balance = balance + new.cost
    where id = new.showroom_id;
  end if;

  -- CASE 3: Update cost while completed
  if (old.status = 'completed' and new.status = 'completed' and old.cost != new.cost) then
    update showrooms
    set balance = balance + (new.cost - old.cost)
    where id = new.showroom_id;
  end if;

  -- CASE 4: Update from completed → something else
  if (old.status = 'completed' and new.status != 'completed') then
    update showrooms
    set balance = balance - old.cost
    where id = old.showroom_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."update_showroom_balance"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_showroom_balance_from_payments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    amount numeric := new.amount;
    showroom_id uuid := new.showroom_id;
begin
    -- When a payment is added, reduce balance
    update showrooms
    set balance = balance - amount
    where id = showroom_id;

    return new;
end;
$$;


ALTER FUNCTION "public"."update_showroom_balance_from_payments"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."update_showroom_balance_from_repairs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    old_cost numeric := coalesce(old.cost, 0);
    new_cost numeric := coalesce(new.cost, 0);
    showroom_id uuid := coalesce(new.showroom_id, old.showroom_id);
begin
    -- CASE 1: Repair becomes completed (status change)
    if (old.status is distinct from new.status) then
        -- from ANY → completed
        if new.status = 'completed' then
            update showrooms
            set balance = balance + new_cost
            where id = showroom_id;

        -- from completed → ANY other status
        elsif old.status = 'completed' then
            update showrooms
            set balance = balance - old_cost
            where id = showroom_id;
        end if;
    end if;

    -- CASE 2: Cost changes while status is already completed
    if (old.cost is distinct from new.cost)
       and new.status = 'completed' then

        update showrooms
        set balance = balance - old_cost + new_cost
        where id = showroom_id;
    end if;

    return new;
end;
$$;


ALTER FUNCTION "public"."update_showroom_balance_from_repairs"() OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."whoami"() RETURNS TABLE("uid" "uuid", "role" "text", "showroom" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT
    auth.uid(),
    p.role,
    p.showroom_id
  FROM profiles p
  WHERE p.id = auth.uid();
$$;


ALTER FUNCTION "public"."whoami"() OWNER TO "supabase_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accompanying_item_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."accompanying_item_types" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brands" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "showroom_id" "uuid" NOT NULL,
    "whatsapp_available" boolean DEFAULT true,
    "balance" numeric(10,3) DEFAULT 0.000
);

ALTER TABLE ONLY "public"."customers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."device_auth" (
    "mac_address" "text" NOT NULL,
    "showroom_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true,
    "device_label" "text",
    "manufacturer" "text",
    "model" "text",
    "first_seen_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cpu_id" "text",
    "awaiting_approval" boolean DEFAULT true,
    "approved_at" timestamp with time zone,
    "device_id" "text",
    "replaced_by_device_id" "uuid",
    "requesting_user_id" "uuid",
    "requester_user_id" "uuid"
);


ALTER TABLE "public"."device_auth" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."device_auth" IS 'PC''s access authentication';



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" "uuid",
    "model" "text",
    "serial_number" "text",
    "received_date" timestamp without time zone,
    "showroom_id" "uuid",
    "device_type_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL
);


ALTER TABLE "public"."devices" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."devices" IS 'Devices intake for repairs';



CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "showroom_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."drivers" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "quantity" integer DEFAULT 0,
    "cost_price" numeric,
    "sale_price" numeric,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "unit_price" numeric DEFAULT 0,
    "total" numeric GENERATED ALWAYS AS ((("quantity")::numeric * "unit_price")) STORED
);


ALTER TABLE "public"."invoice_items" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "repair_id" "uuid",
    "invoice_date" timestamp without time zone DEFAULT "now"(),
    "total" numeric DEFAULT 0
);


ALTER TABLE "public"."invoices" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."item_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "label_en" "text" NOT NULL,
    "label_fr" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_types" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "showroom_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "paid_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."payments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "showroom_id" "uuid",
    "role" "text" DEFAULT 'user'::"text",
    "is_repair_shop" boolean DEFAULT false,
    "language" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true NOT NULL,
    "max_discount_percent" numeric(5,2) DEFAULT 0
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_accompanying_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "repair_id" "uuid" NOT NULL,
    "item_type_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."repair_accompanying_items" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "description_en" "text",
    "description_fr" "text",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."repair_categories" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_counters" (
    "year" integer NOT NULL,
    "last_number" integer NOT NULL
);


ALTER TABLE "public"."repair_counters" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "description_en" "text",
    "description_fr" "text",
    "default_price" numeric(10,3) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."repair_items" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_sequences" (
    "year" integer NOT NULL,
    "last_seq" integer NOT NULL
);


ALTER TABLE "public"."repair_sequences" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_service_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repair_service_id" "uuid" NOT NULL,
    "showroom_id" "uuid" NOT NULL,
    "cost" numeric(10,3) NOT NULL,
    "price" numeric(10,3) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."repair_service_prices" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "label_en" "text" NOT NULL,
    "label_fr" "text" NOT NULL,
    "default_cost" numeric(10,3) NOT NULL,
    "default_price" numeric(10,3) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."repair_services" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repair_id" "uuid" NOT NULL,
    "update_text" "text" NOT NULL,
    "status" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."repair_updates" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repair_visit_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "repair_id" "uuid" NOT NULL,
    "repair_item_id" "uuid" NOT NULL,
    "customer_issue" "text" NOT NULL,
    "technician_notes" "text",
    "price_override" numeric(10,2),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."repair_visit_items" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."repairs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "customer_id" "uuid",
    "showroom_id" "uuid" NOT NULL,
    "technician_id" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'received'::"text",
    "repair_summary" "text",
    "cost" numeric(10,2) DEFAULT 0,
    "sent_to_repair_at" timestamp without time zone,
    "sent_by_driver_id" "uuid",
    "returned_from_repair_at" timestamp without time zone,
    "returned_by_driver_id" "uuid",
    "reported_problem" "text",
    "intake_condition" "text",
    "accessories_received" "text",
    "data_importance" "text",
    "password_provided" boolean DEFAULT false,
    "repair_year" integer DEFAULT EXTRACT(year FROM "now"()) NOT NULL,
    "repair_seq" integer NOT NULL,
    "repair_ref" "text",
    "tracking_password_hash" "text",
    "customer_password_hash" "text",
    "deleted_at" timestamp with time zone,
    "price" numeric,
    "repair_service_id" "uuid",
    "repair_phase" "text",
    "showroom_approved" boolean DEFAULT false,
    "customer_approved" boolean DEFAULT false,
    "showroom_approved_at" timestamp with time zone,
    "customer_approved_at" timestamp with time zone,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "prepared_by" "uuid",
    CONSTRAINT "repairs_data_importance_check" CHECK ((("data_importance" IS NULL) OR ("data_importance" = ANY (ARRAY['critical'::"text", 'normal'::"text", 'not_important'::"text"])))),
    CONSTRAINT "repairs_priority_check" CHECK (("priority" = ANY (ARRAY['top'::"text", 'urgent'::"text", 'vip'::"text", 'normal'::"text", 'low'::"text", 'warranty'::"text"]))),
    CONSTRAINT "repairs_repair_phase_check" CHECK (("repair_phase" = ANY (ARRAY['intake'::"text", 'sent_to_repair'::"text", 'in_repair'::"text", 'waiting_parts'::"text", 'repaired'::"text", 'returned_to_showroom'::"text", 'delivered'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "repairs_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'awaiting_delivery_to_shop'::"text", 'in_diagnosis'::"text", 'awaiting_showroom_approval'::"text", 'approved'::"text", 'in_progress'::"text", 'completed'::"text", 'delivered'::"text"])))
);

ALTER TABLE ONLY "public"."repairs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."repairs" OWNER TO "supabase_admin";


COMMENT ON COLUMN "public"."repairs"."priority" IS 'Priority levels: top (highest), urgent, vip, normal, low, warranty (re-repair)';



CREATE OR REPLACE VIEW "public"."repairs_ui_state" AS
 SELECT "id",
    "status",
    ("status" = 'received'::"text") AS "can_edit_intake",
    ("status" = 'in_diagnosis'::"text") AS "can_edit_diagnosis",
    ("status" = 'awaiting_showroom_approval'::"text") AS "can_approve",
    ("status" = ANY (ARRAY['approved'::"text", 'in_progress'::"text"])) AS "can_work",
    ("status" = 'delivered'::"text") AS "is_locked"
   FROM "public"."repairs" "r";


ALTER VIEW "public"."repairs_ui_state" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "language" "text" DEFAULT 'en'::"text",
    "tracking_url" "text" DEFAULT 'https://track.techfix.com'::"text",
    "company_name" "text" DEFAULT 'Touch of Technology'::"text",
    "support_email" "text",
    "logo_url" "text",
    CONSTRAINT "settings_language_check" CHECK (("language" = ANY (ARRAY['en'::"text", 'fr'::"text"])))
);


ALTER TABLE "public"."settings" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."showroom_parameters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "showroom_id" "uuid" NOT NULL,
    "logo_url" "text",
    "language" "text" DEFAULT 'en'::"text",
    "price_markup" numeric(5,2) DEFAULT 1.00,
    "address" "text",
    "phone" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "showroom_parameters_language_check" CHECK (("language" = ANY (ARRAY['en'::"text", 'fr'::"text"])))
);


ALTER TABLE "public"."showroom_parameters" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."showrooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "balance" numeric(10,3) DEFAULT 0,
    "logo_url" "text",
    "phone" "text",
    "active" boolean DEFAULT true NOT NULL,
    "markup_percent" numeric(5,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp without time zone,
    "last_balance_update_at" timestamp without time zone,
    "notes" "text",
    "receipt_footer_text" "text",
    "receipt_terms" "text",
    "default_tax_percent" numeric(5,2) DEFAULT 0 NOT NULL,
    "currency_code" "text" DEFAULT 'USD'::"text" NOT NULL,
    "tax_stamp_amount" numeric(10,3) DEFAULT 0.000,
    "tax_stamp_label_en" "text" DEFAULT 'Tax Stamp'::"text",
    "tax_stamp_label_fr" "text" DEFAULT 'Timbre Fiscal'::"text",
    "legal_line_1" "text",
    "legal_line_2" "text",
    "legal_line_3" "text",
    "current_serial_year" integer DEFAULT EXTRACT(year FROM "now"()),
    "last_serial_number" integer DEFAULT 0,
    "whatsapp_number" "text"
);


ALTER TABLE "public"."showrooms" OWNER TO "supabase_admin";


COMMENT ON COLUMN "public"."showrooms"."tax_stamp_amount" IS 'Fixed amount added to total (e.g., 1.200 TND)';



CREATE TABLE IF NOT EXISTS "public"."technicians" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "notes" "text",
    "showroom_id" "uuid"
);


ALTER TABLE "public"."technicians" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "full_name" "text",
    "role" "text" NOT NULL,
    "showroom_id" "uuid",
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "active" boolean DEFAULT true,
    "max_discount_percent" numeric(5,2),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'manager'::"text", 'employee'::"text", 'customer'::"text", 'driver'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."users" IS 'System Users';



CREATE OR REPLACE VIEW "public"."v_customers_scoped" AS
 SELECT "id",
    "created_at",
    "full_name",
    "phone",
    "email",
    "address",
    "showroom_id"
   FROM "public"."customers"
  WHERE ("showroom_id" = ("current_setting"('app.showroom_id'::"text", true))::"uuid");


ALTER VIEW "public"."v_customers_scoped" OWNER TO "supabase_admin";


CREATE OR REPLACE VIEW "public"."v_devices_scoped" AS
 SELECT "d"."id",
    "d"."created_at",
    "d"."customer_id",
    "d"."device_type_id",
    "it"."code" AS "device_type_code",
    "it"."label_en" AS "device_type_en",
    "it"."label_fr" AS "device_type_fr",
    "d"."brand_id",
    "b"."name" AS "brand",
    "d"."model",
    "d"."serial_number",
    "d"."received_date",
    "d"."showroom_id"
   FROM (("public"."devices" "d"
     JOIN "public"."item_types" "it" ON (("it"."id" = "d"."device_type_id")))
     JOIN "public"."brands" "b" ON (("b"."id" = "d"."brand_id")));


ALTER VIEW "public"."v_devices_scoped" OWNER TO "supabase_admin";


CREATE OR REPLACE VIEW "public"."v_payments_scoped" AS
 SELECT "id",
    "showroom_id",
    "amount",
    "paid_at",
    "notes"
   FROM "public"."payments"
  WHERE ("showroom_id" = ("current_setting"('app.showroom_id'::"text", true))::"uuid");


ALTER VIEW "public"."v_payments_scoped" OWNER TO "supabase_admin";


CREATE OR REPLACE VIEW "public"."v_repairs_scoped" AS
 SELECT "id",
    "device_id",
    "customer_id",
    "showroom_id",
    "technician_id",
    "received_at",
    "started_at",
    "completed_at",
    "status",
    "repair_summary",
    "cost",
    "sent_to_repair_at",
    "sent_by_driver_id",
    "returned_from_repair_at",
    "returned_by_driver_id",
    "reported_problem",
    "intake_condition",
    "accessories_received",
    "data_importance",
    "password_provided",
    "repair_year",
    "repair_seq",
    "repair_ref",
    "tracking_password_hash",
    "customer_password_hash",
    "deleted_at",
    "price",
    "repair_service_id",
    "repair_phase",
    "showroom_approved",
    "customer_approved",
    "showroom_approved_at",
    "customer_approved_at",
    "priority",
    "prepared_by"
   FROM "public"."repairs";


ALTER VIEW "public"."v_repairs_scoped" OWNER TO "supabase_admin";


ALTER TABLE ONLY "public"."accompanying_item_types"
    ADD CONSTRAINT "accompanying_item_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_showroom_key" UNIQUE ("phone", "showroom_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_cpu_showroom_user_key" UNIQUE ("cpu_id", "showroom_id", "requesting_user_id");



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_device_id_key" UNIQUE ("device_id");



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_device_user_unique" UNIQUE ("cpu_id", "showroom_id", "requesting_user_id");



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_types"
    ADD CONSTRAINT "item_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."item_types"
    ADD CONSTRAINT "item_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_accompanying_items"
    ADD CONSTRAINT "repair_accompanying_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_categories"
    ADD CONSTRAINT "repair_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_counters"
    ADD CONSTRAINT "repair_counters_pkey" PRIMARY KEY ("year");



ALTER TABLE ONLY "public"."repair_items"
    ADD CONSTRAINT "repair_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_sequences"
    ADD CONSTRAINT "repair_sequences_pkey" PRIMARY KEY ("year");



ALTER TABLE ONLY "public"."repair_service_prices"
    ADD CONSTRAINT "repair_service_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_service_prices"
    ADD CONSTRAINT "repair_service_prices_repair_service_id_showroom_id_key" UNIQUE ("repair_service_id", "showroom_id");



ALTER TABLE ONLY "public"."repair_services"
    ADD CONSTRAINT "repair_services_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."repair_services"
    ADD CONSTRAINT "repair_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_updates"
    ADD CONSTRAINT "repair_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_visit_items"
    ADD CONSTRAINT "repair_visit_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."showroom_parameters"
    ADD CONSTRAINT "showroom_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."showrooms"
    ADD CONSTRAINT "showrooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technicians"
    ADD CONSTRAINT "technicians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "unique_ref_per_showroom" UNIQUE ("repair_ref", "showroom_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE UNIQUE INDEX "customers_phone_showroom_unique" ON "public"."customers" USING "btree" ("phone", "showroom_id");



CREATE INDEX "device_auth_login_lookup_idx" ON "public"."device_auth" USING "btree" ("cpu_id", "showroom_id", "requesting_user_id");



CREATE INDEX "idx_profiles_id_showroom" ON "public"."profiles" USING "btree" ("id", "showroom_id");



CREATE INDEX "idx_repairs_customer_approved" ON "public"."repairs" USING "btree" ("customer_approved_at");



CREATE INDEX "idx_repairs_priority" ON "public"."repairs" USING "btree" ("priority");



CREATE INDEX "idx_repairs_received_at" ON "public"."repairs" USING "btree" ("received_at");



CREATE INDEX "idx_repairs_showroom" ON "public"."repairs" USING "btree" ("showroom_id");



CREATE INDEX "idx_repairs_showroom_approved" ON "public"."repairs" USING "btree" ("showroom_approved_at");



CREATE INDEX "idx_repairs_status" ON "public"."repairs" USING "btree" ("status");



CREATE INDEX "idx_showrooms_active" ON "public"."showrooms" USING "btree" ("active");



CREATE INDEX "idx_showrooms_created_at" ON "public"."showrooms" USING "btree" ("created_at");



CREATE OR REPLACE TRIGGER "trg_apply_repair_service_defaults" BEFORE INSERT ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."apply_repair_service_defaults"();



CREATE OR REPLACE TRIGGER "trg_block_manual_repair_timestamps" BEFORE UPDATE ON "public"."repairs" FOR EACH ROW WHEN (("old"."repair_phase" = "new"."repair_phase")) EXECUTE FUNCTION "public"."block_manual_repair_timestamps"();



CREATE OR REPLACE TRIGGER "trg_block_manual_status" BEFORE UPDATE OF "status" ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."block_manual_status_update"();



CREATE OR REPLACE TRIGGER "trg_block_manual_status_update" BEFORE UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."block_manual_status_update"();



CREATE OR REPLACE TRIGGER "trg_check_driver_showroom" BEFORE INSERT OR UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."check_driver_showroom"();



CREATE OR REPLACE TRIGGER "trg_enforce_repair_approvals" BEFORE UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_repair_approval_rules"();



CREATE OR REPLACE TRIGGER "trg_enforce_repair_phase_transitions" BEFORE UPDATE OF "repair_phase" ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_repair_phase_transitions"();



CREATE OR REPLACE TRIGGER "trg_enforce_repairs_update_rules" BEFORE UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_repairs_update_rules"();



CREATE OR REPLACE TRIGGER "trg_payments_balance" AFTER INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_showroom_balance_from_payments"();



CREATE OR REPLACE TRIGGER "trg_recompute_repair_cost_after_delete" AFTER DELETE ON "public"."repair_visit_items" FOR EACH ROW EXECUTE FUNCTION "public"."_trg_recompute_repair_cost_after_del"();



CREATE OR REPLACE TRIGGER "trg_recompute_repair_cost_after_insert" AFTER INSERT ON "public"."repair_visit_items" FOR EACH ROW EXECUTE FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"();



CREATE OR REPLACE TRIGGER "trg_recompute_repair_cost_after_update" AFTER UPDATE ON "public"."repair_visit_items" FOR EACH ROW EXECUTE FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"();



CREATE OR REPLACE TRIGGER "trg_repairs_balance" AFTER INSERT OR UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."update_showroom_balance"();



CREATE OR REPLACE TRIGGER "trg_repairs_update_guard" BEFORE UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_repairs_update_rules"();



CREATE OR REPLACE TRIGGER "trg_set_repair_phase_timestamps" BEFORE UPDATE OF "repair_phase" ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."set_repair_phase_timestamps"();



CREATE OR REPLACE TRIGGER "trg_sync_repair_status" BEFORE INSERT OR UPDATE ON "public"."repairs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_repair_status"();



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_requester_user_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_requesting_user_id_fkey" FOREIGN KEY ("requesting_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."device_auth"
    ADD CONSTRAINT "device_auth_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_brand_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_device_type_fkey" FOREIGN KEY ("device_type_id") REFERENCES "public"."item_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "fk_customer_showroom" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "fk_device_showroom" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoice_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "fk_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id");



ALTER TABLE ONLY "public"."repair_accompanying_items"
    ADD CONSTRAINT "repair_accompanying_items_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "public"."accompanying_item_types"("id");



ALTER TABLE ONLY "public"."repair_accompanying_items"
    ADD CONSTRAINT "repair_accompanying_items_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_items"
    ADD CONSTRAINT "repair_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."repair_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_service_prices"
    ADD CONSTRAINT "repair_service_prices_repair_service_id_fkey" FOREIGN KEY ("repair_service_id") REFERENCES "public"."repair_services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_service_prices"
    ADD CONSTRAINT "repair_service_prices_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_visit_items"
    ADD CONSTRAINT "repair_visit_items_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_visit_items"
    ADD CONSTRAINT "repair_visit_items_repair_item_id_fkey" FOREIGN KEY ("repair_item_id") REFERENCES "public"."repair_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_repair_service_id_fkey" FOREIGN KEY ("repair_service_id") REFERENCES "public"."repair_services"("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_returned_by_driver_id_fkey" FOREIGN KEY ("returned_by_driver_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_sent_by_driver_id_fkey" FOREIGN KEY ("sent_by_driver_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id");



ALTER TABLE ONLY "public"."repairs"
    ADD CONSTRAINT "repairs_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."showroom_parameters"
    ADD CONSTRAINT "showroom_parameters_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technicians"
    ADD CONSTRAINT "technicians_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_showroom_id_fkey" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id");



CREATE POLICY "Admins can manage all devices" ON "public"."device_auth" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read device auth" ON "public"."device_auth" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read users" ON "public"."users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access" ON "public"."customers" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow authenticated inserts" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated read" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated selects" ON "public"."devices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow system insert users" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Device lookup during login" ON "public"."device_auth" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))) OR ("requesting_user_id" = "auth"."uid"()) OR ("cpu_id" IS NOT NULL)));



CREATE POLICY "Managers can delete showroom customers" ON "public"."customers" FOR DELETE TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'manager'::"text") AND ("showroom_id" = ( SELECT "profiles"."showroom_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "No client deletes on users" ON "public"."users" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can only access their showroom customers" ON "public"."customers" TO "authenticated" USING (("showroom_id" = ( SELECT "profiles"."showroom_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can read own devices" ON "public"."device_auth" FOR SELECT TO "authenticated" USING (("requesting_user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can read pending device they requested" ON "public"."device_auth" FOR SELECT TO "authenticated" USING (("requesting_user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own device requests" ON "public"."device_auth" FOR SELECT TO "authenticated" USING (("requesting_user_id" = "auth"."uid"()));



CREATE POLICY "Users can request a new device" ON "public"."device_auth" FOR INSERT TO "authenticated" WITH CHECK (("requesting_user_id" = "auth"."uid"()));



CREATE POLICY "Users can request device authorization" ON "public"."device_auth" FOR INSERT TO "authenticated" WITH CHECK (("requesting_user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "admin read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete customers in own showroom" ON "public"."customers" FOR DELETE TO "authenticated" USING (("showroom_id" = ( SELECT "users"."showroom_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."device_auth" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert customers in own showroom" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("showroom_id" = ( SELECT "users"."showroom_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'employee'::"text", 'driver'::"text"])));



CREATE POLICY "profiles_read_admin_manager" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "me"
  WHERE (("me"."id" = "auth"."uid"()) AND ("me"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR ("role" = 'admin'::"text") OR (("role" = 'manager'::"text") AND ("showroom_id" = ( SELECT "profiles_1"."showroom_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"()))))));



CREATE POLICY "profiles_select_admin" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "profiles_select_manager" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'manager'::"text") AND ("profiles"."showroom_id" = "p"."showroom_id")))));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING ((("role" = 'admin'::"text") OR (("role" = 'manager'::"text") AND ("showroom_id" = ( SELECT "profiles_1"."showroom_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())))) OR ("auth"."uid"() = "id")));



CREATE POLICY "read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "read showrooms" ON "public"."showrooms" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."repair_service_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repair_service_prices_select" ON "public"."repair_service_prices" FOR SELECT TO "authenticated" USING (("showroom_id" = ( SELECT "profiles"."showroom_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "repair_service_prices_write" ON "public"."repair_service_prices" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



ALTER TABLE "public"."repair_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repair_services_admin_write" ON "public"."repair_services" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "repair_services_select" ON "public"."repair_services" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."repairs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repairs_delete_admin" ON "public"."repairs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "repairs_driver_read" ON "public"."repairs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."current_profile"() "current_profile"("user_id", "role", "showroom_id", "is_repair_shop", "active")
  WHERE (("current_profile"."role" = 'driver'::"text") AND (("current_profile"."user_id" = "repairs"."sent_by_driver_id") OR ("current_profile"."user_id" = "repairs"."returned_by_driver_id"))))));



CREATE POLICY "repairs_insert_admin" ON "public"."repairs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "repairs_insert_employee" ON "public"."repairs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'employee'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_insert_intake" ON "public"."repairs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."current_profile"() "current_profile"("user_id", "role", "showroom_id", "is_repair_shop", "active")
  WHERE (("current_profile"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text", 'manager'::"text"])) AND (("current_profile"."role" = 'admin'::"text") OR ("current_profile"."showroom_id" = "repairs"."showroom_id"))))));



CREATE POLICY "repairs_insert_manager" ON "public"."repairs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'manager'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_select_admin" ON "public"."repairs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "repairs_select_driver" ON "public"."repairs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'driver'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_select_employee" ON "public"."repairs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'employee'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_select_manager" ON "public"."repairs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'manager'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_select_technician" ON "public"."repairs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'technician'::"text") AND ("repairs"."technician_id" = "p"."id")))));



CREATE POLICY "repairs_showroom_read" ON "public"."repairs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."current_profile"() "current_profile"("user_id", "role", "showroom_id", "is_repair_shop", "active")
  WHERE (("current_profile"."role" = ANY (ARRAY['employee'::"text", 'manager'::"text"])) AND ("current_profile"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_technician_read" ON "public"."repairs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."current_profile"() "current_profile"("user_id", "role", "showroom_id", "is_repair_shop", "active")
  WHERE (("current_profile"."role" = 'technician'::"text") AND ("current_profile"."user_id" = "repairs"."technician_id")))));



CREATE POLICY "repairs_update_admin" ON "public"."repairs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "repairs_update_driver" ON "public"."repairs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'driver'::"text") AND (("repairs"."sent_by_driver_id" = "p"."id") OR ("repairs"."returned_by_driver_id" = "p"."id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'driver'::"text") AND (("repairs"."sent_by_driver_id" = "p"."id") OR ("repairs"."returned_by_driver_id" = "p"."id"))))));



CREATE POLICY "repairs_update_employee" ON "public"."repairs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'employee'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_update_manager" ON "public"."repairs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'manager'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'manager'::"text") AND ("p"."showroom_id" = "repairs"."showroom_id")))));



CREATE POLICY "repairs_update_technician" ON "public"."repairs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'technician'::"text") AND ("repairs"."technician_id" = "p"."id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'technician'::"text") AND ("repairs"."technician_id" = "p"."id")))));



CREATE POLICY "select customers in own showroom" ON "public"."customers" FOR SELECT TO "authenticated" USING (("showroom_id" = ( SELECT "users"."showroom_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "showrooms_select_internal_users" ON "public"."showrooms" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "update customers in own showroom" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("showroom_id" = ( SELECT "users"."showroom_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))) WITH CHECK (("showroom_id" = ( SELECT "users"."showroom_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."_trg_recompute_repair_cost_after_del"() TO "anon";
GRANT ALL ON FUNCTION "public"."_trg_recompute_repair_cost_after_del"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_trg_recompute_repair_cost_after_del"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"() TO "anon";
GRANT ALL ON FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_trg_recompute_repair_cost_after_ins_upd"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_financials"("p_repair_id" "uuid", "p_cost" numeric, "p_price" numeric) TO "postgres";
GRANT ALL ON FUNCTION "public"."admin_update_financials"("p_repair_id" "uuid", "p_cost" numeric, "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_financials"("p_repair_id" "uuid", "p_cost" numeric, "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_financials"("p_repair_id" "uuid", "p_cost" numeric, "p_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_repair_service_defaults"() TO "postgres";
GRANT ALL ON FUNCTION "public"."apply_repair_service_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_repair_service_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_repair_service_defaults"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_manual_repair_timestamps"() TO "postgres";
GRANT ALL ON FUNCTION "public"."block_manual_repair_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_manual_repair_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_manual_repair_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_manual_status_update"() TO "postgres";
GRANT ALL ON FUNCTION "public"."block_manual_status_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_manual_status_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_manual_status_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_driver_showroom"() TO "postgres";
GRANT ALL ON FUNCTION "public"."check_driver_showroom"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_driver_showroom"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_driver_showroom"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_secure"("p_email" "text", "p_full_name" "text", "p_role" "text", "p_showroom_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."create_user_secure"("p_email" "text", "p_full_name" "text", "p_role" "text", "p_showroom_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_secure"("p_email" "text", "p_full_name" "text", "p_role" "text", "p_showroom_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_secure"("p_email" "text", "p_full_name" "text", "p_role" "text", "p_showroom_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile"() TO "postgres";
GRANT ALL ON FUNCTION "public"."current_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "postgres";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_showroom"() TO "postgres";
GRANT ALL ON FUNCTION "public"."current_user_showroom"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_showroom"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_showroom"() TO "service_role";



GRANT ALL ON FUNCTION "public"."driver_update_transport"("p_repair_id" "uuid", "p_sent" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."driver_update_transport"("p_repair_id" "uuid", "p_sent" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."driver_update_transport"("p_repair_id" "uuid", "p_sent" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."driver_update_transport"("p_repair_id" "uuid", "p_sent" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."employee_update_intake"("p_repair_id" "uuid", "p_reported_problem" "text", "p_intake_condition" "text", "p_accessories_received" "text", "p_password_provided" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."employee_update_intake"("p_repair_id" "uuid", "p_reported_problem" "text", "p_intake_condition" "text", "p_accessories_received" "text", "p_password_provided" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."employee_update_intake"("p_repair_id" "uuid", "p_reported_problem" "text", "p_intake_condition" "text", "p_accessories_received" "text", "p_password_provided" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."employee_update_intake"("p_repair_id" "uuid", "p_reported_problem" "text", "p_intake_condition" "text", "p_accessories_received" "text", "p_password_provided" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_repair_approval_rules"() TO "postgres";
GRANT ALL ON FUNCTION "public"."enforce_repair_approval_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_repair_approval_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_repair_approval_rules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_repair_phase_transitions"() TO "postgres";
GRANT ALL ON FUNCTION "public"."enforce_repair_phase_transitions"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_repair_phase_transitions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_repair_phase_transitions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_repairs_update_rules"() TO "postgres";
GRANT ALL ON FUNCTION "public"."enforce_repairs_update_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_repairs_update_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_repairs_update_rules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_repair_ref"() TO "postgres";
GRANT ALL ON FUNCTION "public"."generate_repair_ref"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_repair_ref"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_repair_ref"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_repair_reference"() TO "postgres";
GRANT ALL ON FUNCTION "public"."generate_repair_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_repair_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_repair_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jwt_custom_claims"() TO "postgres";
GRANT ALL ON FUNCTION "public"."jwt_custom_claims"() TO "anon";
GRANT ALL ON FUNCTION "public"."jwt_custom_claims"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jwt_custom_claims"() TO "service_role";



GRANT ALL ON FUNCTION "public"."login_user"("in_username" "text", "in_password" "text", "in_mac" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."login_user"("in_username" "text", "in_password" "text", "in_mac" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."login_user"("in_username" "text", "in_password" "text", "in_mac" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."login_user"("in_username" "text", "in_password" "text", "in_mac" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."manager_set_repair_cost"("p_repair_id" "uuid", "p_cost" numeric, "p_status" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."manager_set_repair_cost"("p_repair_id" "uuid", "p_cost" numeric, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."manager_set_repair_cost"("p_repair_id" "uuid", "p_cost" numeric, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manager_set_repair_cost"("p_repair_id" "uuid", "p_cost" numeric, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_repair_cost"("p_repair_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_repair_cost"("p_repair_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_repair_cost"("p_repair_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_repair_phase_timestamps"() TO "postgres";
GRANT ALL ON FUNCTION "public"."set_repair_phase_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_repair_phase_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_repair_phase_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_repair_ref"() TO "postgres";
GRANT ALL ON FUNCTION "public"."set_repair_ref"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_repair_ref"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_repair_ref"() TO "service_role";



GRANT ALL ON FUNCTION "public"."showroom_update_price"("p_repair_id" "uuid", "p_price" numeric) TO "postgres";
GRANT ALL ON FUNCTION "public"."showroom_update_price"("p_repair_id" "uuid", "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."showroom_update_price"("p_repair_id" "uuid", "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."showroom_update_price"("p_repair_id" "uuid", "p_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_repair_status"() TO "postgres";
GRANT ALL ON FUNCTION "public"."sync_repair_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_repair_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_repair_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."technician_update_cost"("p_repair_id" "uuid", "p_cost" numeric) TO "postgres";
GRANT ALL ON FUNCTION "public"."technician_update_cost"("p_repair_id" "uuid", "p_cost" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."technician_update_cost"("p_repair_id" "uuid", "p_cost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."technician_update_cost"("p_repair_id" "uuid", "p_cost" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."technician_update_repair"("p_repair_id" "uuid", "p_status" "text", "p_repair_summary" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."technician_update_repair"("p_repair_id" "uuid", "p_status" "text", "p_repair_summary" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."technician_update_repair"("p_repair_id" "uuid", "p_status" "text", "p_repair_summary" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."technician_update_repair"("p_repair_id" "uuid", "p_status" "text", "p_repair_summary" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_showroom_balance"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_showroom_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_showroom_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_showroom_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_payments"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_payments"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_payments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_payments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_repairs"() TO "postgres";
GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_repairs"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_repairs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_showroom_balance_from_repairs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."whoami"() TO "postgres";
GRANT ALL ON FUNCTION "public"."whoami"() TO "anon";
GRANT ALL ON FUNCTION "public"."whoami"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."whoami"() TO "service_role";


















GRANT ALL ON TABLE "public"."accompanying_item_types" TO "postgres";
GRANT ALL ON TABLE "public"."accompanying_item_types" TO "anon";
GRANT ALL ON TABLE "public"."accompanying_item_types" TO "authenticated";
GRANT ALL ON TABLE "public"."accompanying_item_types" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "postgres";
GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "postgres";
GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."device_auth" TO "postgres";
GRANT ALL ON TABLE "public"."device_auth" TO "anon";
GRANT ALL ON TABLE "public"."device_auth" TO "authenticated";
GRANT ALL ON TABLE "public"."device_auth" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "postgres";
GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "postgres";
GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "postgres";
GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "postgres";
GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "postgres";
GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."item_types" TO "postgres";
GRANT ALL ON TABLE "public"."item_types" TO "anon";
GRANT ALL ON TABLE "public"."item_types" TO "authenticated";
GRANT ALL ON TABLE "public"."item_types" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "postgres";
GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."repair_accompanying_items" TO "postgres";
GRANT ALL ON TABLE "public"."repair_accompanying_items" TO "anon";
GRANT ALL ON TABLE "public"."repair_accompanying_items" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_accompanying_items" TO "service_role";



GRANT ALL ON TABLE "public"."repair_categories" TO "postgres";
GRANT ALL ON TABLE "public"."repair_categories" TO "anon";
GRANT ALL ON TABLE "public"."repair_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_categories" TO "service_role";



GRANT ALL ON TABLE "public"."repair_counters" TO "postgres";
GRANT ALL ON TABLE "public"."repair_counters" TO "anon";
GRANT ALL ON TABLE "public"."repair_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_counters" TO "service_role";



GRANT ALL ON TABLE "public"."repair_items" TO "postgres";
GRANT ALL ON TABLE "public"."repair_items" TO "anon";
GRANT ALL ON TABLE "public"."repair_items" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_items" TO "service_role";



GRANT ALL ON TABLE "public"."repair_sequences" TO "postgres";
GRANT ALL ON TABLE "public"."repair_sequences" TO "anon";
GRANT ALL ON TABLE "public"."repair_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."repair_service_prices" TO "postgres";
GRANT ALL ON TABLE "public"."repair_service_prices" TO "anon";
GRANT ALL ON TABLE "public"."repair_service_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_service_prices" TO "service_role";



GRANT ALL ON TABLE "public"."repair_services" TO "postgres";
GRANT ALL ON TABLE "public"."repair_services" TO "anon";
GRANT ALL ON TABLE "public"."repair_services" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_services" TO "service_role";



GRANT ALL ON TABLE "public"."repair_updates" TO "postgres";
GRANT ALL ON TABLE "public"."repair_updates" TO "anon";
GRANT ALL ON TABLE "public"."repair_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_updates" TO "service_role";



GRANT ALL ON TABLE "public"."repair_visit_items" TO "postgres";
GRANT ALL ON TABLE "public"."repair_visit_items" TO "anon";
GRANT ALL ON TABLE "public"."repair_visit_items" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_visit_items" TO "service_role";



GRANT ALL ON TABLE "public"."repairs" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."repairs" TO "anon";
GRANT ALL ON TABLE "public"."repairs" TO "authenticated";
GRANT ALL ON TABLE "public"."repairs" TO "service_role";



GRANT ALL ON TABLE "public"."repairs_ui_state" TO "postgres";
GRANT ALL ON TABLE "public"."repairs_ui_state" TO "anon";
GRANT ALL ON TABLE "public"."repairs_ui_state" TO "authenticated";
GRANT ALL ON TABLE "public"."repairs_ui_state" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "postgres";
GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."showroom_parameters" TO "postgres";
GRANT ALL ON TABLE "public"."showroom_parameters" TO "anon";
GRANT ALL ON TABLE "public"."showroom_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."showroom_parameters" TO "service_role";



GRANT ALL ON TABLE "public"."showrooms" TO "postgres";
GRANT ALL ON TABLE "public"."showrooms" TO "anon";
GRANT ALL ON TABLE "public"."showrooms" TO "authenticated";
GRANT ALL ON TABLE "public"."showrooms" TO "service_role";



GRANT ALL ON TABLE "public"."technicians" TO "postgres";
GRANT ALL ON TABLE "public"."technicians" TO "anon";
GRANT ALL ON TABLE "public"."technicians" TO "authenticated";
GRANT ALL ON TABLE "public"."technicians" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "postgres";
GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_customers_scoped" TO "postgres";
GRANT ALL ON TABLE "public"."v_customers_scoped" TO "anon";
GRANT ALL ON TABLE "public"."v_customers_scoped" TO "authenticated";
GRANT ALL ON TABLE "public"."v_customers_scoped" TO "service_role";



GRANT ALL ON TABLE "public"."v_devices_scoped" TO "postgres";
GRANT ALL ON TABLE "public"."v_devices_scoped" TO "anon";
GRANT ALL ON TABLE "public"."v_devices_scoped" TO "authenticated";
GRANT ALL ON TABLE "public"."v_devices_scoped" TO "service_role";



GRANT ALL ON TABLE "public"."v_payments_scoped" TO "postgres";
GRANT ALL ON TABLE "public"."v_payments_scoped" TO "anon";
GRANT ALL ON TABLE "public"."v_payments_scoped" TO "authenticated";
GRANT ALL ON TABLE "public"."v_payments_scoped" TO "service_role";



GRANT ALL ON TABLE "public"."v_repairs_scoped" TO "postgres";
GRANT ALL ON TABLE "public"."v_repairs_scoped" TO "anon";
GRANT ALL ON TABLE "public"."v_repairs_scoped" TO "authenticated";
GRANT ALL ON TABLE "public"."v_repairs_scoped" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































