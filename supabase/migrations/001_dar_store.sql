-- Shared Supabase backend. Prices are integer Egyptian-piastre amounts.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.dar_settings (id smallint primary key check (id = 1), value jsonb not null check (jsonb_typeof(value) = 'object'));
create table public.dar_products (id uuid primary key default gen_random_uuid(), data jsonb not null check (jsonb_typeof(data) = 'object'));
create unique index dar_products_slug on public.dar_products ((data->>'slug'));
create table public.dar_orders (id bigint generated always as identity primary key, token text unique not null check (token ~ '^[a-f0-9]{64}$'), idempotency_key uuid unique not null, request_hash text not null, data jsonb not null);
create index dar_orders_created on public.dar_orders (((data->>'createdAt')::bigint));
create table public.dar_admin_profiles (user_id uuid primary key references auth.users(id) on delete cascade, name text not null check (length(name) between 2 and 80), role text not null check (role in ('owner','manager')), active boolean not null default true, created_at timestamptz not null default now());
create table public.dar_audit (id bigint generated always as identity primary key, admin_id uuid, action text not null, entity text not null, details jsonb not null default '{}', created_at timestamptz not null default now());
alter table public.dar_settings enable row level security;
alter table public.dar_products enable row level security;
alter table public.dar_orders enable row level security;
alter table public.dar_admin_profiles enable row level security;
alter table public.dar_audit enable row level security;
revoke all on public.dar_settings, public.dar_products, public.dar_orders, public.dar_admin_profiles, public.dar_audit from anon, authenticated;
revoke all on sequence public.dar_orders_id_seq, public.dar_audit_id_seq from anon, authenticated;

create function public.dar_now_ms() returns bigint language sql volatile set search_path = '' as $$ select floor(extract(epoch from clock_timestamp()) * 1000)::bigint $$;
create function public.dar_is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.dar_admin_profiles where user_id=auth.uid() and active) $$;

create function public.dar_validate_product(p jsonb) returns void language plpgsql set search_path = '' as $$
declare v jsonb; seen text[] := '{}';
begin
  if octet_length(p::text)>65536 or jsonb_typeof(p) is distinct from 'object' or coalesce(length(btrim(p->>'name')),0) not between 1 and 200 or coalesce(length(p->>'description'),0) not between 1 and 4000
    or coalesce(p->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p->>'slug') > 100
    or coalesce(p->>'roast','') not in ('فاتح','وسط','غامق','غير محدد') or coalesce(p->>'stockMode','') not in ('units','grams')
    or coalesce(length(btrim(p->>'kind')),0) not between 1 and 80 or coalesce(p->>'image','') !~ '^(/(images|uploads)/[a-zA-Z0-9._-]+|https://[^[:space:]]+)$'
    or jsonb_typeof(p->'active') is distinct from 'boolean' or jsonb_typeof(p->'featured') is distinct from 'boolean' or jsonb_typeof(p->'demo') is distinct from 'boolean'
    or coalesce(p->>'stockGrams','') !~ '^[0-9]+$' or (p->>'stockGrams')::numeric > 100000000
    or jsonb_typeof(p->'grinds') is distinct from 'array' or jsonb_array_length(p->'grinds') not between 1 and 8
    or jsonb_typeof(p->'brew') is distinct from 'array' or jsonb_array_length(p->'brew') not between 1 and 3
    or jsonb_typeof(p->'variants') is distinct from 'array' or jsonb_array_length(p->'variants') not between 1 and 12 then raise exception 'راجع بيانات المنتج المطلوبة.'; end if;
  for v in select value from jsonb_array_elements(p->'brew') loop if jsonb_typeof(v)<>'string' or v #>> '{}' not in ('تركي','إسبريسو','فلتر') then raise exception 'طريقة تحضير غير صالحة.'; end if; end loop;
  for v in select value from jsonb_array_elements(p->'grinds') loop if jsonb_typeof(v) <> 'string' or length(btrim(v #>> '{}')) not between 1 and 200 then raise exception 'طحنة غير صالحة.'; end if; end loop;
  for v in select value from jsonb_array_elements(p->'variants') loop
    if coalesce(v->>'weight','') !~ '^[0-9]+$' or (v->>'weight')::numeric not between 1 and 10000 or coalesce(v->>'price','') !~ '^[0-9]+$' or (v->>'price')::numeric not between 100 and 10000000 or coalesce(v->>'stock','') !~ '^[0-9]+$' or (v->>'stock')::numeric > 1000000 or v->>'weight' = any(seen) then raise exception 'راجع أوزان وأسعار ومخزون المنتج.'; end if;
    if v ? 'id' then perform (v->>'id')::uuid; end if;
    seen := array_append(seen,v->>'weight');
  end loop;
end $$;

create function public.dar_validate_settings(s jsonb) returns void language plpgsql set search_path = '' as $$
declare v jsonb; seen text[] := '{}';
begin
  if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'mode','') not in ('preview','live') or coalesce(length(s->>'brand'),0) not between 1 and 200
    or jsonb_typeof(s->'codEnabled') is distinct from 'boolean' or jsonb_typeof(s->'shippingZones') is distinct from 'array' or jsonb_array_length(s->'shippingZones') > 50
    or jsonb_typeof(s->'sections') is distinct from 'array' or jsonb_array_length(s->'sections') > 8 then raise exception 'راجع إعدادات المتجر.'; end if;
  if octet_length(s::text)>65536 or coalesce(length(s->>'heroTitle'),0) not between 1 and 200 or coalesce(length(s->>'heroSubtitle'),0) not between 1 and 200 or coalesce(length(s->>'storyTitle'),0) not between 1 and 200 or coalesce(length(s->>'storyText'),0)>3000 or coalesce(s->>'heroImage','') !~ '^(/(images|uploads)/[a-zA-Z0-9._-]+|https://[^[:space:]]+)$' or coalesce(length(s->>'shippingPolicy'),0)>8000 or coalesce(length(s->>'returnsPolicy'),0)>8000 or coalesce(length(s->>'privacyPolicy'),0)>8000 then raise exception 'راجع نصوص وصورة وسياسات المتجر.'; end if;
  for v in select value from jsonb_array_elements(s->'shippingZones') loop
    if coalesce(length(v->>'id'),0) not between 1 and 60 or coalesce(length(v->>'name'),0) not between 1 and 200 or jsonb_typeof(v->'enabled') is distinct from 'boolean' or coalesce(v->>'fee','') !~ '^[0-9]+$' or (v->>'fee')::numeric > 1000000 or v->>'id' = any(seen) then raise exception 'راجع مناطق ورسوم التوصيل.'; end if;
    seen := array_append(seen,v->>'id');
  end loop;
  seen := '{}';
  for v in select value from jsonb_array_elements(s->'sections') loop
    if jsonb_typeof(v)<>'string' or v #>> '{}' not in ('featured','quiz','recipes','experience','story','branches','guide','brewing') or v #>> '{}' = any(seen) then raise exception 'أقسام الرئيسية غير صالحة.'; end if;
    seen := array_append(seen,v #>> '{}');
  end loop;
  if s ? 'branches' then
    if jsonb_typeof(s->'branches') <> 'array' or jsonb_array_length(s->'branches') > 12 then raise exception 'راجع الفروع.'; end if;
    for v in select value from jsonb_array_elements(s->'branches') loop if coalesce(length(v->>'name'),0) not between 1 and 80 or coalesce(length(v->>'address'),0) not between 1 and 300 or jsonb_typeof(v->'main') is distinct from 'boolean' or (v ? 'enabled' and jsonb_typeof(v->'enabled') <> 'boolean') then raise exception 'اسم وعنوان الفرع مطلوبان.'; end if; end loop;
  end if;
end $$;

create function public.dar_launch_checks(s jsonb) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_array(
 jsonb_build_object('label','منتج نشط واحد على الأقل ببيانات معتمدة','ok',exists(select 1 from public.dar_products where (data->>'active')::boolean) and not exists(select 1 from public.dar_products where (data->>'active')::boolean and (data->>'demo')::boolean)),
 jsonb_build_object('label','منطقة توصيل معتمدة أو فرع استلام متاح','ok',exists(select 1 from jsonb_array_elements(coalesce(s->'shippingZones','[]')) z where (z->>'enabled')::boolean and z->>'id' <> 'demo-zone' and position('تجريب' in z->>'name')=0) or exists(select 1 from jsonb_array_elements(coalesce(s->'branches','[]')) b where coalesce((b->>'enabled')::boolean,true) and length(btrim(coalesce(b->>'name','')))>0 and length(btrim(coalesce(b->>'address','')))>0)),
 jsonb_build_object('label','وسيلة تواصل وسياسات الشحن والاستبدال والخصوصية','ok',length(btrim(coalesce(s->>'contactPhone','')))>0 and length(btrim(coalesce(s->>'shippingPolicy','')))>0 and length(btrim(coalesce(s->>'returnsPolicy','')))>0 and length(btrim(coalesce(s->>'privacyPolicy','')))>0),
 jsonb_build_object('label','طريقة دفع مفعلة','ok',coalesce((s->>'codEnabled')::boolean,false)))
$$;

create function public.dar_public_order(o jsonb) returns jsonb language sql immutable set search_path = '' as $$ select (o - 'id' - 'note') || jsonb_build_object('customer',jsonb_build_object('name',o->'customer'->'name','city',o->'customer'->'city')) $$;
create function public.dar_store() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s jsonb; products jsonb;
begin
 select value into s from public.dar_settings where id=1;
 if s is null then raise exception 'المتجر لم يتم إعداده بعد.'; end if;
 s := jsonb_set(s,'{shippingZones}',coalesce((select jsonb_agg(z) from jsonb_array_elements(s->'shippingZones') z where (z->>'enabled')::boolean and (s->>'mode'='preview' or (z->>'id'<>'demo-zone' and position('تجريب' in z->>'name')=0))),'[]'));
 select coalesce(jsonb_agg(data-'retiredVariants' order by data->>'name'),'[]') into products from public.dar_products where (data->>'active')::boolean and (s->>'mode'='preview' or not (data->>'demo')::boolean);
 return jsonb_build_object('settings',s,'products',products);
end $$;

create function public.dar_place_order(input jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s jsonb; customer jsonb; zone jsonb; branch jsonb := null; pickup boolean; l jsonb; c jsonb; p jsonb; v jsonb; variants jsonb; components jsonb; items jsonb := '[]'; seen uuid[]; pid uuid; vid uuid; grams integer; qty integer; amount integer; weight integer; unit_price bigint; subtotal bigint:=0; fee bigint; total bigint; at_ms bigint; order_id bigint; order_token text; request_key uuid; request_hash text; previous public.dar_orders%rowtype; order_data jsonb; vi integer;
begin
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>131072 then raise exception 'بيانات الطلب غير صالحة.'; end if;
 request_key := (input->>'idempotencyKey')::uuid;
 if request_key is null then raise exception 'مفتاح الطلب مطلوب.'; end if;
 request_hash := encode(extensions.digest(input::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into previous from public.dar_orders where idempotency_key=request_key;
 if found then if previous.request_hash<>request_hash then raise exception 'تم استخدام مفتاح الطلب لبيانات مختلفة.'; end if; return public.dar_public_order(previous.data); end if;
 -- A single store-row lock serializes inventory operations and content snapshots.
 select value into s from public.dar_settings where id=1 for update;
 if s is null or not coalesce((s->>'codEnabled')::boolean,false) then raise exception 'استقبال الطلبات غير متاح حاليًا.'; end if;
 if s->>'mode'='live' and exists(select 1 from jsonb_array_elements(public.dar_launch_checks(s)) t where not (t->>'ok')::boolean) then raise exception 'استقبال الطلبات متوقف حتى اعتماد إعدادات البيع.'; end if;
 customer := input->'customer';
 if jsonb_typeof(customer) is distinct from 'object' or coalesce(length(btrim(customer->>'name')),0) not between 3 and 100 or coalesce(customer->>'phone','') !~ '^\+?[0-9 ()-]{8,25}$' or length(coalesce(customer->>'notes',''))>500 then raise exception 'راجع اسم العميل ورقم الهاتف.'; end if;
 customer := jsonb_build_object('name',btrim(customer->>'name'),'phone',btrim(customer->>'phone'),'city',coalesce(customer->>'city',''),'address',coalesce(customer->>'address',''),'notes',coalesce(customer->>'notes',''));
 if (select count(*) from public.dar_orders where data->'customer'->>'phone'=customer->>'phone' and (data->>'createdAt')::bigint>public.dar_now_ms()-900000)>=20 then raise exception 'طلبات كثيرة على هذا الرقم. حاول لاحقًا.'; end if;
 if coalesce(input->>'fulfillment','delivery') not in ('delivery','pickup') or input->>'paymentMethod' is distinct from 'cod' then raise exception 'طريقة الاستلام أو الدفع غير صالحة.'; end if;
 pickup := input->>'fulfillment'='pickup';
 if pickup then
   if coalesce(input->>'pickupBranchIndex','') !~ '^[0-9]+$' or (input->>'pickupBranchIndex')::numeric>11 then raise exception 'اختر فرع الاستلام.'; end if;
   branch := s->'branches'->((input->>'pickupBranchIndex')::integer);
   if branch is null or branch->>'name' is null or branch->>'address' is null or coalesce((branch->>'enabled')::boolean,true)=false then raise exception 'فرع الاستلام غير متاح.'; end if;
   branch := jsonb_build_object('name',branch->>'name','address',branch->>'address');
   zone := jsonb_build_object('name',branch->>'name','fee',0,'eta','انتظر تأكيد تجهيز طلبك للاستلام من الفرع.');
 else
   if coalesce(length(customer->>'city'),0) not between 1 and 200 or coalesce(length(customer->>'address'),0) not between 8 and 500 then raise exception 'أدخل مدينة وعنوان توصيل كاملين.'; end if;
   select z into zone from jsonb_array_elements(s->'shippingZones') z where z->>'id'=input->>'zoneId' and (z->>'enabled')::boolean;
   if zone is null or (s->>'mode'='live' and (zone->>'id'='demo-zone' or position('تجريب' in zone->>'name')>0)) then raise exception 'اختر منطقة توصيل متاحة.'; end if;
 end if;
 if jsonb_typeof(input->'items') is distinct from 'array' or jsonb_array_length(input->'items') not between 1 and 30 then raise exception 'السلة غير صالحة.'; end if;
 for l in select value from jsonb_array_elements(input->'items') loop
   if coalesce(l->>'quantity','') !~ '^[0-9]+$' or (l->>'quantity')::numeric not between 1 and 30 or coalesce(length(l->>'grind'),0) not between 1 and 200 then raise exception 'راجع الكمية والطحنة.'; end if;
   qty := (l->>'quantity')::integer;
   if l->>'type'='blend' then
     if jsonb_typeof(l->'components') is distinct from 'array' or jsonb_array_length(l->'components') not between 1 and 8 then raise exception 'مكونات التوليفة غير صالحة.'; end if;
     seen:='{}'; components:='[]'; weight:=0; unit_price:=0;
     for c in select value from jsonb_array_elements(l->'components') loop
       pid := (c->>'productId')::uuid;
       if pid is null or pid=any(seen) or coalesce(c->>'grams','') !~ '^[0-9]+$' or (c->>'grams')::numeric not between 50 and 1000 or mod((c->>'grams')::numeric,50)<>0 then raise exception 'أوزان أو مكونات التوليفة غير صالحة.'; end if;
       seen:=array_append(seen,pid); grams:=(c->>'grams')::integer; weight:=weight+grams;
       select data into p from public.dar_products where id=pid for update;
       if p is null or not (p->>'active')::boolean or p->>'kind'<>'حبوب للتوليف' or p->>'stockMode'<>'grams' or (s->>'mode'='live' and (p->>'demo')::boolean) then raise exception 'أحد مكونات التوليفة غير متاح.'; end if;
       if not (p->'grinds' ? (l->>'grind')) then raise exception 'الطحنة غير متاحة لكل مكونات التوليفة.'; end if;
       select value into v from jsonb_array_elements(p->'variants') where (value->>'weight')::integer=50;
       if v is null then raise exception 'سعر المكون غير متاح.'; end if;
       amount:=grams*qty;
       if (p->>'stockGrams')::integer<amount then raise exception 'مخزون أحد المكونات لا يكفي.'; end if;
       p:=jsonb_set(p,'{stockGrams}',to_jsonb((p->>'stockGrams')::integer-amount));
       p:=jsonb_set(p,'{updatedAt}',to_jsonb(greatest(public.dar_now_ms(),(p->>'updatedAt')::bigint+1)));
       update public.dar_products set data=p where id=pid;
       unit_price:=unit_price+(grams/50)*(v->>'price')::bigint;
       components:=components||jsonb_build_array(jsonb_build_object('productId',pid,'name',p->>'name','grams',grams,'pricePer50',(v->>'price')::bigint,'unitPrice',(grams/50)*(v->>'price')::bigint,'stockMode','grams'));
     end loop;
     if weight>3000 then raise exception 'التوليفة لا تزيد عن 3000 جم.'; end if;
     items:=items||jsonb_build_array(jsonb_build_object('type','blend','name','توليفتك الخاصة','image','/images/coffee-story.webp','weight',weight,'price',unit_price,'quantity',qty,'grind',l->>'grind','total',unit_price*qty,'components',components));
   else
     if coalesce(l->>'type','product')<>'product' then raise exception 'نوع بند السلة غير صالح.'; end if;
     pid:=(l->>'productId')::uuid; vid:=(l->>'variantId')::uuid;
     select data into p from public.dar_products where id=pid for update;
     if p is null or not (p->>'active')::boolean or (s->>'mode'='live' and (p->>'demo')::boolean) then raise exception 'المنتج غير متاح.'; end if;
     if not (p->'grinds' ? (l->>'grind')) then raise exception 'اختر طحنة متاحة.'; end if;
     select value,(ordinality-1)::integer into v,vi from jsonb_array_elements(p->'variants') with ordinality where value->>'id'=vid::text;
     if v is null then raise exception 'الوزن غير متاح.'; end if;
     weight:=(v->>'weight')::integer; unit_price:=(v->>'price')::bigint;
     if p->>'stockMode'='grams' then
       amount:=weight*qty;
       if (p->>'stockGrams')::integer<amount then raise exception 'الكمية المطلوبة غير متاحة.'; end if;
       p:=jsonb_set(p,'{stockGrams}',to_jsonb((p->>'stockGrams')::integer-amount));
     else
       if (v->>'stock')::integer<qty then raise exception 'الكمية المطلوبة غير متاحة.'; end if;
       p:=jsonb_set(p,array['variants',vi::text,'stock'],to_jsonb((v->>'stock')::integer-qty));
     end if;
     p:=jsonb_set(p,'{updatedAt}',to_jsonb(greatest(public.dar_now_ms(),(p->>'updatedAt')::bigint+1)));
     update public.dar_products set data=p where id=pid;
     items:=items||jsonb_build_array(jsonb_build_object('productId',pid,'variantId',vid,'name',p->>'name','slug',p->>'slug','image',p->>'image','weight',weight,'price',unit_price,'quantity',qty,'grind',l->>'grind','total',unit_price*qty,'stockMode',p->>'stockMode'));
   end if;
   subtotal:=subtotal+unit_price*qty;
 end loop;
 fee:=(zone->>'fee')::bigint; total:=subtotal+fee;
 if input ? 'expectedTotal' and (coalesce(input->>'expectedTotal','') !~ '^[0-9]+$' or (input->>'expectedTotal')::numeric<>total) then raise exception 'السعر أو تكلفة الشحن اتغيرت. راجع الإجمالي وأكد الطلب مرة أخرى.'; end if;
 at_ms:=public.dar_now_ms(); order_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.dar_orders(token,idempotency_key,request_hash,data) values(order_token,request_key,request_hash,'{}') returning id into order_id;
 order_data:=jsonb_build_object('id',order_id,'token',order_token,'reference','DB-'||to_char(now(),'YYMMDD')||'-'||upper(encode(extensions.gen_random_bytes(4),'hex')),'status','new','paymentStatus','unpaid','paymentMethod','cod','customer',customer,'items',items,'zone',zone->>'name','eta',zone->>'eta','subtotal',subtotal,'shipping',fee,'total',total,'demo',s->>'mode'<>'live','fulfillment',case when pickup then 'pickup' else 'delivery' end,'pickupBranch',branch,'note','','tracking','','createdAt',at_ms,'updatedAt',at_ms);
 update public.dar_orders set data=order_data where id=order_id;
 return public.dar_public_order(order_data);
end $$;

create function public.dar_track_order(token text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o jsonb;
begin
 if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'الطلب غير موجود.'; end if;
 select data into o from public.dar_orders where dar_orders.token=dar_track_order.token;
 if o is null then raise exception 'الطلب غير موجود.'; end if;
 return public.dar_public_order(o);
end $$;

create function public.dar_admin(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path = '' as $$
declare profile public.dar_admin_profiles%rowtype; owner boolean; verb text; path text; ident text; p jsonb; prior jsonb; s jsonb; o jsonb; patch jsonb; v jsonb; old_v jsonb; variants jsonb; retired jsonb; item jsonb; component jsonb; variant_index integer; variant_collection text; qty integer; next_status text; next_payment text; at_ms bigint; rows jsonb; total bigint; page integer; q text; filter_status text; uid uuid;
begin
 if auth.uid() is null then raise exception 'سجل الدخول للمتابعة.' using errcode='28000'; end if;
 -- Serialize every write with checkout before reading settings, permissions or stock.
 if action <> 'me' and action !~ '^GET ' then perform 1 from public.dar_settings where id=1 for update; end if;
 select * into profile from public.dar_admin_profiles where user_id=auth.uid() and active;
 if not found then raise exception 'سجل الدخول بحساب إدارة مصرح له.' using errcode='42501'; end if;
 owner:=profile.role='owner';
 if action in ('me','GET /auth/me') then return jsonb_build_object('id',profile.user_id,'username',(select email from auth.users where id=profile.user_id),'name',profile.name,'role',profile.role); end if;
 verb:=split_part(action,' ',1); path:=split_part(action,' ',2);
 if verb not in ('GET','POST','PUT','PATCH','DELETE') or jsonb_typeof(payload) is distinct from 'object' then raise exception 'عملية إدارة غير صالحة.'; end if;
 if path in ('/admin/settings','/admin/users','/admin/audit') or path ~ '^/admin/users/' then if not owner then raise exception 'هذه العملية لمالك المتجر فقط.' using errcode='42501'; end if; end if;
 select value into s from public.dar_settings where id=1;
 if action='GET /admin/products' then return coalesce((select jsonb_agg(data-'retiredVariants' order by data->>'name') from public.dar_products),'[]'); end if;
 if verb in ('POST','PUT') and (path='/admin/products' or path ~ '^/admin/products/[a-f0-9-]{36}$') then
   perform 1 from public.dar_settings where id=1 for update;
   ident:=case when verb='POST' then gen_random_uuid()::text else split_part(path,'/',4) end;
   select data into prior from public.dar_products where id=ident::uuid for update;
   if verb='PUT' and prior is null then raise exception 'المنتج غير موجود.'; end if;
   p:=payload-'_query'; perform public.dar_validate_product(p);
   if prior is not null and prior->>'stockMode' is distinct from p->>'stockMode' and exists(select 1 from public.dar_orders where data->>'status' not in ('cancelled','delivered') and exists(select 1 from jsonb_array_elements(data->'items') ordered_item where ordered_item->>'productId'=ident or exists(select 1 from jsonb_array_elements(coalesce(ordered_item->'components','[]')) ordered_component where ordered_component->>'productId'=ident))) then raise exception 'لا يمكن تغيير طريقة المخزون مع وجود طلبات لم تكتمل للمنتج.'; end if;
   if prior is not null and p->>'updatedAt' is distinct from prior->>'updatedAt' then raise exception 'المخزون أو المنتج اتغير. حدّث الصفحة قبل الحفظ.'; end if;
   if s->>'mode'='live' and (p->>'active')::boolean and (p->>'demo')::boolean then raise exception 'لا يمكن نشر بيانات تجريبية أثناء البيع الفعلي.'; end if;
   variants:='[]';
   for v in select value from jsonb_array_elements(p->'variants') loop
     old_v:=null;
     if v ? 'id' then select value into old_v from jsonb_array_elements(coalesce(prior->'variants','[]')||coalesce(prior->'retiredVariants','[]')) where value->>'id'=v->>'id'; if old_v is null then raise exception 'الوزن لا يتبع المنتج.'; end if;
     elsif prior is not null then select value into old_v from jsonb_array_elements(prior->'variants'||coalesce(prior->'retiredVariants','[]')) where value->>'weight'=v->>'weight'; end if;
     if old_v is not null and old_v->>'weight'<>v->>'weight' then raise exception 'أضف صف وزن جديد بدل تغيير وزن سابق.'; end if;
     variants:=variants||jsonb_build_array(v||jsonb_build_object('id',coalesce(old_v->>'id',gen_random_uuid()::text)));
   end loop;
   at_ms:=greatest(public.dar_now_ms(),coalesce((prior->>'updatedAt')::bigint,0)+1);
   select coalesce(jsonb_agg(older.value),'[]') into retired from jsonb_array_elements(coalesce(prior->'variants','[]')||coalesce(prior->'retiredVariants','[]')) older where not exists(select 1 from jsonb_array_elements(variants) kept where kept.value->>'id'=older.value->>'id');
   p:=(p-'id'-'retiredVariants')||jsonb_build_object('id',ident,'variants',variants,'retiredVariants',retired,'updatedAt',at_ms);
   insert into public.dar_products(id,data) values(ident::uuid,p) on conflict(id) do update set data=excluded.data;
   insert into public.dar_audit(admin_id,action,entity,details) values(profile.user_id,'product.saved',ident,jsonb_build_object('name',p->>'name'));
   return p-'retiredVariants';
 end if;
 if verb='DELETE' and path ~ '^/admin/products/[a-f0-9-]{36}$' then
   ident:=split_part(path,'/',4); update public.dar_products set data=jsonb_set(jsonb_set(data,'{active}','false'),'{updatedAt}',to_jsonb(greatest(public.dar_now_ms(),(data->>'updatedAt')::bigint+1))) where id=ident::uuid;
   if not found then raise exception 'المنتج غير موجود.'; end if;
   insert into public.dar_audit(admin_id,action,entity) values(profile.user_id,'product.hidden',ident); return jsonb_build_object('ok',true);
 end if;
 if action='GET /admin/settings' then return s; end if;
 if action='PUT /admin/settings' then
   perform 1 from public.dar_settings where id=1 for update;
   p:=payload-'_query'; if not(p ? 'branches') then p:=p||jsonb_build_object('branches',s->'branches'); end if;
   perform public.dar_validate_settings(p);
   if p->>'mode'='live' and (p->>'codEnabled')::boolean and exists(select 1 from jsonb_array_elements(public.dar_launch_checks(p)) c where not (c->>'ok')::boolean) then raise exception 'اعتمد بيانات المنتجات والشحن والسياسات قبل تفعيل البيع.'; end if;
   update public.dar_settings set value=p where id=1;
   insert into public.dar_audit(admin_id,action,entity,details) values(profile.user_id,'settings.updated','store',jsonb_build_object('mode',p->>'mode')); return p;
 end if;
 if action='GET /admin/orders' then
   q:=left(coalesce(payload->'_query'->>'q',''),100); filter_status:=coalesce(payload->'_query'->>'status','');
   page:=greatest(1,least(100000,coalesce((payload->'_query'->>'page')::integer,1)));
   select count(*) into total from public.dar_orders where (q='' or position(lower(q) in lower(data->>'reference'||' '||(data->'customer')::text))>0) and (filter_status='' or data->>'status'=filter_status);
   select coalesce(jsonb_agg(data),'[]') into rows from (select data from public.dar_orders where (q='' or position(lower(q) in lower(data->>'reference'||' '||(data->'customer')::text))>0) and (filter_status='' or data->>'status'=filter_status) order by id desc limit 25 offset (page-1)*25) list;
   return jsonb_build_object('orders',rows,'total',total,'page',page);
 end if;
 if verb='GET' and path ~ '^/admin/orders/[0-9]+$' then select data into o from public.dar_orders where id=split_part(path,'/',4)::bigint; if o is null then raise exception 'الطلب غير موجود.'; end if; return o; end if;
 if verb='PATCH' and path ~ '^/admin/orders/[0-9]+$' then
   perform 1 from public.dar_settings where id=1 for update;
   ident:=split_part(path,'/',4); select data into o from public.dar_orders where id=ident::bigint for update;
   if o is null then raise exception 'الطلب غير موجود.'; end if;
   if payload ? 'updatedAt' and payload->>'updatedAt' is distinct from o->>'updatedAt' then raise exception 'الطلب اتغير. حدّث الصفحة قبل الحفظ.'; end if;
   next_status:=coalesce(payload->>'status',o->>'status'); next_payment:=coalesce(payload->>'paymentStatus',o->>'paymentStatus');
   if next_status<>o->>'status' and not ((o->>'status'='new' and next_status in ('confirmed','cancelled')) or (o->>'status'='confirmed' and next_status in ('preparing','cancelled')) or (o->>'status'='preparing' and next_status in ('shipped','cancelled')) or (o->>'status'='shipped' and next_status='delivered')) then raise exception 'انتقال حالة الطلب غير متاح.'; end if;
   if next_payment<>o->>'paymentStatus' and not ((o->>'paymentStatus'='unpaid' and next_payment='paid') or (o->>'paymentStatus'='paid' and next_payment='refunded')) then raise exception 'انتقال حالة الدفع غير متاح.'; end if;
   if next_status='cancelled' and next_payment='paid' then raise exception 'سجل رد المبلغ قبل الإلغاء.'; end if;
   if next_status='cancelled' and o->>'status'<>'cancelled' then
     for item in select value from jsonb_array_elements(o->'items') loop
       qty:=(item->>'quantity')::integer;
       if item->>'type'='blend' then
         for component in select value from jsonb_array_elements(item->'components') loop update public.dar_products set data=jsonb_set(jsonb_set(data,'{stockGrams}',to_jsonb((data->>'stockGrams')::integer+(component->>'grams')::integer*qty)),'{updatedAt}',to_jsonb(greatest(public.dar_now_ms(),(data->>'updatedAt')::bigint+1))) where id=(component->>'productId')::uuid; end loop;
       else
         select data into p from public.dar_products where id=(item->>'productId')::uuid for update;
         if item->>'stockMode'='grams' then p:=jsonb_set(p,'{stockGrams}',to_jsonb((p->>'stockGrams')::integer+(item->>'weight')::integer*qty));
         else
           variant_collection:='variants';
           select (ordinality-1)::integer into variant_index from jsonb_array_elements(p->'variants') with ordinality where value->>'id'=item->>'variantId';
           if variant_index is null then variant_collection:='retiredVariants'; select (ordinality-1)::integer into variant_index from jsonb_array_elements(coalesce(p->'retiredVariants','[]')) with ordinality where value->>'id'=item->>'variantId'; end if;
           if variant_index is null then raise exception 'وزن الطلب السابق غير موجود؛ راجع المنتج قبل الإلغاء.'; end if;
           p:=jsonb_set(p,array[variant_collection,variant_index::text,'stock'],to_jsonb((p->variant_collection->variant_index->>'stock')::integer+qty));
         end if;
         p:=jsonb_set(p,'{updatedAt}',to_jsonb(greatest(public.dar_now_ms(),(p->>'updatedAt')::bigint+1))); update public.dar_products set data=p where id=(item->>'productId')::uuid;
       end if;
     end loop;
   end if;
   if length(coalesce(payload->>'note',''))>3000 or length(coalesce(payload->>'tracking',''))>300 then raise exception 'ملاحظات الطلب طويلة جدًا.'; end if;
   patch:=jsonb_build_object('status',next_status,'paymentStatus',next_payment,'note',coalesce(payload->>'note',o->>'note'),'tracking',coalesce(payload->>'tracking',o->>'tracking'),'updatedAt',greatest(public.dar_now_ms(),(o->>'updatedAt')::bigint+1)); o:=o||patch;
   update public.dar_orders set data=o where id=ident::bigint;
   insert into public.dar_audit(admin_id,action,entity,details) values(profile.user_id,'order.updated',ident,patch); return o;
 end if;
 if action='GET /admin/dashboard' then
   return jsonb_build_object('mode',s->>'mode','checks',public.dar_launch_checks(s),'stats',(select jsonb_build_object('orders',count(*),'pending',count(*) filter(where data->>'status'='new'),'revenue',coalesce(sum((data->>'total')::bigint) filter(where data->>'status'='delivered' and data->>'paymentStatus'='paid' and not (data->>'demo')::boolean),0),'demoOrders',count(*) filter(where (data->>'demo')::boolean),'products',(select count(*) from public.dar_products where (data->>'active')::boolean)) from public.dar_orders),'recentOrders',coalesce((select jsonb_agg(data) from (select data from public.dar_orders order by id desc limit 6) r),'[]'),'lowStock',coalesce((select jsonb_agg(data) from public.dar_products where (data->>'active')::boolean and ((data->>'stockMode'='grams' and (data->>'stockGrams')::integer<1000) or (data->>'stockMode'='units' and exists(select 1 from jsonb_array_elements(data->'variants') AS stock_variant(value) where (stock_variant.value->>'stock')::integer<5)))),'[]'));
 end if;
 if action='GET /admin/users' then return coalesce((select jsonb_agg(jsonb_build_object('id',admin_profile.user_id,'username',u.email,'name',admin_profile.name,'role',admin_profile.role,'active',admin_profile.active,'createdAt',floor(extract(epoch from admin_profile.created_at)*1000)::bigint)) from public.dar_admin_profiles admin_profile join auth.users u on u.id=admin_profile.user_id),'[]'); end if;
 if verb in ('PUT','POST','DELETE') and (path='/admin/users' or path ~ '^/admin/users/[a-f0-9-]{36}$') then
   uid:=case when verb='POST' then (payload->>'id')::uuid else split_part(path,'/',4)::uuid end;
   if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'أنشئ حسابًا مؤكدًا في Supabase Authentication، ثم انسخ User UID هنا.'; end if;
   if exists(select 1 from public.dar_admin_profiles where user_id=uid and active and role='owner') and (verb='DELETE' or payload->>'role'='manager' or payload->>'active'='false') and (select count(*) from public.dar_admin_profiles where active and role='owner')<=1 then raise exception 'لا يمكن إلغاء صلاحية آخر مالك للمتجر.'; end if;
   if uid=profile.user_id and (verb='DELETE' or payload->>'role'='manager' or payload->>'active'='false') then raise exception 'لا يمكن إلغاء صلاحيات حسابك أثناء استخدامه.'; end if;
   if verb='DELETE' then update public.dar_admin_profiles set active=false where user_id=uid;
   else
     if coalesce(payload->>'role','') not in ('owner','manager') or coalesce(length(payload->>'name'),0) not between 2 and 80 then raise exception 'راجع اسم المستخدم وصلاحياته.'; end if;
     insert into public.dar_admin_profiles(user_id,name,role,active) values(uid,payload->>'name',payload->>'role',coalesce((payload->>'active')::boolean,true)) on conflict(user_id) do update set name=excluded.name,role=excluded.role,active=excluded.active;
   end if;
   insert into public.dar_audit(admin_id,action,entity) values(profile.user_id,'admin.updated',uid::text); return jsonb_build_object('ok',true,'id',uid);
 end if;
 if action='GET /admin/audit' then return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,'entity',a.entity,'details',a.details,'createdAt',floor(extract(epoch from a.created_at)*1000)::bigint,'user',audit_profile.name)) from (select * from public.dar_audit order by id desc limit 100) a left join public.dar_admin_profiles audit_profile on audit_profile.user_id=a.admin_id),'[]'); end if;
 raise exception 'عملية الإدارة غير مدعومة.';
end $$;

revoke all on function public.dar_now_ms(),public.dar_is_admin(),public.dar_validate_product(jsonb),public.dar_validate_settings(jsonb),public.dar_launch_checks(jsonb),public.dar_public_order(jsonb),public.dar_store(),public.dar_place_order(jsonb),public.dar_track_order(text),public.dar_admin(text,jsonb) from public,anon,authenticated;
grant execute on function public.dar_store(),public.dar_place_order(jsonb),public.dar_track_order(text) to anon,authenticated;
grant execute on function public.dar_admin(text,jsonb) to authenticated;
grant execute on function public.dar_is_admin() to authenticated;

-- Public images, with uploads restricted to active administrators.
do $$ begin
 if to_regclass('storage.buckets') is not null then
   insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('coffee-media','coffee-media',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
   execute 'create policy dar_media_read on storage.objects for select to anon,authenticated using (bucket_id = ''coffee-media'')';
   execute 'create policy dar_media_insert on storage.objects for insert to authenticated with check (bucket_id = ''coffee-media'' and name ~* ''\.(png|jpe?g|webp)$'' and public.dar_is_admin())';
   execute 'create policy dar_media_update on storage.objects for update to authenticated using (bucket_id = ''coffee-media'' and public.dar_is_admin()) with check (bucket_id = ''coffee-media'' and name ~* ''\.(png|jpe?g|webp)$'' and public.dar_is_admin())';
   execute 'create policy dar_media_delete on storage.objects for delete to authenticated using (bucket_id = ''coffee-media'' and public.dar_is_admin())';
 end if;
end $$;
