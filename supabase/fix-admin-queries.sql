-- Existing projects: current safe admin function, preserves stored data.
BEGIN;
create or replace function public.dar_admin(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path = '' as $$
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
   p:=payload-'_query'; if not(p ? 'cms') and s ? 'cms' then p:=p||jsonb_build_object('cms',s->'cms'); end if; if not(p ? 'branches') then p:=p||jsonb_build_object('branches',s->'branches'); end if;
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

COMMIT;
