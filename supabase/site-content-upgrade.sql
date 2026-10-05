-- Repeatable upgrade for existing projects. Validates CMS; changes no content, catalog, accounts or orders.
BEGIN;
-- CMS is plain text and structured data. It never accepts HTML templates or executable URLs.
create or replace function public.dar_validate_cms(cms jsonb) returns void language plpgsql set search_path = '' as $$
declare specification jsonb := '{"siteCopy":{"brand":{"name":"string","tagline":"string","headerNote":"string","footerText":"string"},"navigation":{"home":"string","shop":"string","about":"string","guide":"string","branches":"string","searchPlaceholder":"string","cart":"string"},"hero":{"eyebrow":"string","title":"string","subtitle":"string","primaryCta":"string","primaryHref":"string","secondaryCta":"string","secondaryHref":"string","detail":"string"},"ritual":[{"lead":"string","emphasis":"string"},{"lead":"string","emphasis":"string"},{"lead":"string","emphasis":"string"}],"brewing":{"eyebrow":"string","title":"string","intro":"string","cta":"string","items":[{"name":"string","description":"string","guideText":"string"},{"name":"string","description":"string","guideText":"string"},{"name":"string","description":"string","guideText":"string"}]},"featured":{"eyebrow":"string","title":"string","intro":"string","allCta":"string","emptyTitle":"string","emptyText":"string"},"product":{"slug":"literal:dar-blend-mahawag","name":"string","shortDescription":"string","description":"string","demoNotice":"string","weightLabel":"string","grindLabel":"string","selectCta":"string","addCta":"string","careTitle":"string","careText":"string"},"story":{"eyebrow":"string","title":"string","shortText":"string","longParagraphs":["string","string","string"],"cta":"string"},"journey":{"eyebrow":"string","title":"string","intro":"string","items":[{"title":"string","text":"string"},{"title":"string","text":"string"},{"title":"string","text":"string"}]},"guide":{"eyebrow":"string","title":"string","intro":"string","bannerTitle":"string","bannerText":"string","cta":"string","brewStep":"string","brewHelp":"string","roastStep":"string","roastHelp":"string","emptyTitle":"string","emptyText":"string","resetCta":"string","tipsTitle":"string","tips":[{"title":"string","text":"string"},{"title":"string","text":"string"},{"title":"string","text":"string"}]},"faq":{"eyebrow":"string","title":"string","intro":"string","items":[{"question":"string","answer":"string"},{"question":"string","answer":"string"},{"question":"string","answer":"string"},{"question":"string","answer":"string"},{"question":"string","answer":"string"}]},"branches":{"eyebrow":"string","title":"string","intro":"string","mapCta":"string","mainLabel":"string","items":[{"name":"string","address":"string","main":"boolean"},{"name":"string","address":"string","main":"boolean"},{"name":"string","address":"string","main":"boolean"},{"name":"string","address":"string","main":"boolean"}]},"social":{"eyebrow":"string","title":"string","text":"string","facebookLabel":"string","instagramLabel":"string"},"shop":{"eyebrow":"string","title":"string","intro":"string","emptyTitle":"string","emptyText":"string","resetCta":"string"},"imageAlt":{"hero":"string","product":"string","story":"string","harvest":"string","roasting":"string"}},"experience":{"header":{"note":"string","quizCta":"string"},"quiz":{"eyebrow":"string","title":"string","description":"string","startCta":"string","nextCta":"string","backCta":"string","resultCta":"string","restartCta":"string","progressLabel":"string","questions":[{"id":"literal:brew","title":"string","help":"string","options":[{"value":"literal:تركي","label":"string","description":"string"},{"value":"literal:إسبريسو","label":"string","description":"string"},{"value":"literal:فلتر","label":"string","description":"string"}]},{"id":"literal:kind","title":"string","help":"string","options":[{"value":"literal:سادة","label":"string","description":"string"},{"value":"literal:محوج","label":"string","description":"string"},{"value":"literal:any","label":"string","description":"string"}]},{"id":"literal:usage","title":"string","help":"string","options":[{"value":"literal:try","label":"string","description":"string"},{"value":"literal:daily","label":"string","description":"string"},{"value":"literal:share","label":"string","description":"string"}]}],"result":{"eyebrow":"string","title":"string","multipleTitle":"string","matchedExplanation":"string","openKindExplanation":"string","tryWeightExplanation":"string","dailyWeightExplanation":"string","shareWeightExplanation":"string","weightLabel":"string","cta":"string","note":"string"},"empty":{"title":"string","description":"string","editCta":"string","guideCta":"string","alternativeLabel":"string","alternativeCtaTemplate":"string","alternativeExplanation":"string"}},"recipes":{"eyebrow":"string","title":"string","intro":"string","openCta":"string","closeCta":"string","ingredientsLabel":"string","stepsLabel":"string","tipLabel":"string","items":[{"id":"literal:turkish","brew":"string","title":"string","description":"string","imageAlt":"string","yield":"string","grind":"string","ingredients":["string","string","string"],"steps":["string","string","string","string"],"tip":"string"},{"id":"literal:espresso","brew":"string","title":"string","description":"string","imageAlt":"string","yield":"string","grind":"string","ingredients":["string","string"],"steps":["string","string","string","string"],"tip":"string"},{"id":"literal:filter","brew":"string","title":"string","description":"string","imageAlt":"string","yield":"string","grind":"string","ingredients":["string","string","string"],"steps":["string","string","string","string"],"tip":"string"}]},"branchExperience":{"eyebrow":"string","title":"string","description":"string","cta":"string","imageCaption":"string","generatedImageCaption":"string","items":[{"id":"literal:green-cold-drink","title":"string","description":"string","imageAlt":"string"},{"id":"literal:light-creamy-drink","title":"string","description":"string","imageAlt":"string"},{"id":"literal:iced-coffee","title":"string","description":"string","imageAlt":"string"}]},"plainProduct":{"name":"string","description":"string","unavailableCta":"string","imageAlt":"string"}},"drinks":[{"id":"string","name":"string","category":"string","description":"string","image":"string","price":"price","active":"boolean"}],"appearance":{"accent":"string","background":"string","text":"string","logo":"string"},"social":{"facebook":"string","instagram":"string","whatsapp":"string"},"home":{"storeTitle":"string","storeDescription":"string","storeCta":"string","quizTitle":"string","quizDescription":"string","quizCta":"string","learnTitle":"string","learnDescription":"string","learnCta":"string","storyImage":"string","quizImage":"string","recipesImage":"string","journeyImage":"string","brewingImage":"string"},"ritual":[{"title":"string","text":"string","href":"string"}]}'::jsonb; queue jsonb; current_node jsonb; current_value jsonb; expected jsonb; depth integer; visited integer:=0; partial boolean; node_path text; field record; text_value text; child_shape jsonb; identifiers text[]; identifier text; seen text[]:='{}';
begin
 if jsonb_typeof(cms) is distinct from 'object' or octet_length(cms::text)>131072 then raise exception 'راجع محتوى الموقع وحجمه.'; end if;
 queue:=jsonb_build_array(jsonb_build_object('value',cms,'shape',specification,'depth',0,'partial',true,'path','cms'));
 while jsonb_array_length(queue)>0 loop
  current_node:=queue->0; queue:=queue-0; current_value:=current_node->'value'; expected:=current_node->'shape'; depth:=(current_node->>'depth')::integer; partial:=(current_node->>'partial')::boolean; node_path:=current_node->>'path'; visited:=visited+1;
  if visited>1200 or depth>8 then raise exception 'تركيب محتوى الموقع أكبر من الحد المدعوم.'; end if;
  if jsonb_typeof(expected)='object' then
   if jsonb_typeof(current_value) is distinct from 'object' then raise exception 'تركيب محتوى غير صالح: %',node_path; end if;
   if not partial and exists(select 1 from jsonb_object_keys(expected) k where not (current_value ? k)) then raise exception 'بيانات عنصر المحتوى ناقصة: %',node_path; end if;
   for field in select key,value from jsonb_each(current_value) loop
    if field.key in ('__proto__','prototype','constructor') or not (expected ? field.key) then raise exception 'مفتاح محتوى غير صالح: %',field.key; end if;
    queue:=queue||jsonb_build_array(jsonb_build_object('value',field.value,'shape',expected->field.key,'depth',depth+1,'partial',partial,'path',node_path||'.'||field.key));
   end loop;
  elsif jsonb_typeof(expected)='array' then
   if jsonb_typeof(current_value) is distinct from 'array' or jsonb_array_length(current_value)>40 then raise exception 'قائمة محتوى غير صالحة: %',node_path; end if;
   if node_path='cms.ritual' and jsonb_array_length(current_value)>6 then raise exception 'خطوات الاختيار لا تزيد عن ٦.'; end if;
   if node_path='cms.experience.quiz.questions' and jsonb_array_length(current_value)<>3 then raise exception 'الاختبار يحتاج ٣ أسئلة.'; end if;
   if node_path ~ '^cms.experience.quiz.questions.[0-9]+.options$' and jsonb_array_length(current_value) not between 1 and 3 then raise exception 'راجع اختيارات السؤال.'; end if;
   if node_path not in ('cms.drinks','cms.ritual') and jsonb_array_length(current_value)=0 then raise exception 'قائمة المحتوى لا تكون فارغة: %',node_path; end if;
   identifiers:='{}';
   for field in select value,ordinality from jsonb_array_elements(current_value) with ordinality loop
    identifier:=coalesce(field.value->>'id',field.value->>'value');
    if identifier is not null then if identifier=any(identifiers) then raise exception 'معرّفات المحتوى لا تتكرر.'; end if; identifiers:=array_append(identifiers,identifier); end if;
    child_shape:=null;
    if jsonb_typeof(field.value)='object' then select candidate into child_shape from jsonb_array_elements(expected) candidate where (candidate->>'id'='literal:'||(field.value->>'id')) or (candidate->>'value'='literal:'||(field.value->>'value')) limit 1; end if;
    child_shape:=coalesce(child_shape,expected->0);
    queue:=queue||jsonb_build_array(jsonb_build_object('value',field.value,'shape',child_shape,'depth',depth+1,'partial',false,'path',node_path||'.'||field.ordinality));
   end loop;
  elsif expected #>> '{}' = 'price' then
   if current_value <> 'null'::jsonb and (jsonb_typeof(current_value) is distinct from 'number' or current_value::text !~ '^[0-9]+$' or current_value::numeric>10000000) then raise exception 'سعر المشروب غير صالح.'; end if;
  elsif left(expected #>> '{}',8)='literal:' then
   if jsonb_typeof(current_value) is distinct from 'string' or current_value #>> '{}' <> substring(expected #>> '{}' from 9) then raise exception 'لا تغيّر المعرّفات التقنية لخيارات الموقع: %',node_path; end if;
  else
   if jsonb_typeof(current_value) is distinct from (expected #>> '{}') then raise exception 'نوع محتوى غير صالح: %',node_path; end if;
   if jsonb_typeof(current_value)='string' then
    text_value:=current_value #>> '{}';
    if (node_path ~* '(href|url|image|logo|storyImage|quizImage|recipesImage|journeyImage|brewingImage)$' or node_path ~ '^cms.social.') and position(chr(92) in text_value)>0 then raise exception 'رابط المحتوى غير صالح.'; end if;
    if length(text_value)>8000 then raise exception 'نص المحتوى طويل جدًا.'; end if;
    if node_path ~ '^cms.appearance.(accent|background|text)$' and text_value !~ '^#[0-9a-fA-F]{6}$' then raise exception 'استخدم لونًا بصيغة #RRGGBB.'; end if;
    if node_path ~ '^cms.social.' and (length(text_value)>2000 or (text_value<>'' and text_value !~ '^https://[^[:space:]<>"]+$')) then raise exception 'رابط التواصل يحتاج HTTPS.'; end if;
    if node_path ~* '\.(image|logo|storyImage|quizImage|recipesImage|journeyImage|brewingImage)$' and (length(text_value)>2000 or (text_value<>'' and text_value !~ '^(/(images|uploads)/[a-zA-Z0-9._-]+|https://[^[:space:]<>"]+)$')) then raise exception 'مسار الصورة غير صالح.'; end if;
    if node_path ~* '(href|url)$' and (length(text_value)>2000 or (text_value<>'' and (left(text_value,2)='//' or text_value !~ '^(https://[^[:space:]<>"]+|/[a-zA-Z0-9_./?#=%&+~-]*)$'))) then raise exception 'رابط المحتوى غير صالح.'; end if;
    if node_path ~ '^cms.drinks.[0-9]+.id$' then
     if length(text_value)>100 or text_value !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or text_value=any(seen) then raise exception 'معرّف مشروب غير صالح أو مكرر.'; end if;
     seen:=array_append(seen,text_value);
    end if;
    if node_path ~ '^cms.drinks.[0-9]+.name$' and length(btrim(text_value)) not between 1 and 200 then raise exception 'راجع اسم المشروب.'; end if;
    if node_path ~ '^cms.drinks.[0-9]+.category$' and text_value not in ('hot','cold') then raise exception 'تصنيف المشروب غير صالح.'; end if;
    if node_path ~ '^cms.drinks.[0-9]+.description$' and length(text_value)>2000 then raise exception 'وصف المشروب طويل جدًا.'; end if;
    if node_path ~ '^cms.home.' and length(text_value)>2000 then raise exception 'نص القسم طويل جدًا.'; end if;
    if node_path ~ '^cms.ritual.[0-9]+.title$' and length(text_value)>200 then raise exception 'عنوان الخطوة طويل جدًا.'; end if;
    if node_path ~ '^cms.ritual.[0-9]+.text$' and length(text_value)>1000 then raise exception 'وصف الخطوة طويل جدًا.'; end if;
   end if;
  end if;
 end loop;
end $$;

create or replace function public.dar_validate_settings(s jsonb) returns void language plpgsql set search_path = '' as $$
declare v jsonb; seen text[] := '{}';
begin
  if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'mode','') not in ('preview','live') or coalesce(length(s->>'brand'),0) not between 1 and 200
    or jsonb_typeof(s->'codEnabled') is distinct from 'boolean' or jsonb_typeof(s->'shippingZones') is distinct from 'array' or jsonb_array_length(s->'shippingZones') > 50
    or jsonb_typeof(s->'sections') is distinct from 'array' or jsonb_array_length(s->'sections') > 8 then raise exception 'راجع إعدادات المتجر.'; end if;
  if octet_length(s::text)>196608 or coalesce(length(s->>'heroTitle'),0) not between 1 and 200 or coalesce(length(s->>'heroSubtitle'),0) not between 1 and 200 or coalesce(length(s->>'storyTitle'),0) not between 1 and 200 or coalesce(length(s->>'storyText'),0)>3000 or coalesce(s->>'heroImage','') !~ '^(/(images|uploads)/[a-zA-Z0-9._-]+|https://[^[:space:]]+)$' or coalesce(length(s->>'shippingPolicy'),0)>8000 or coalesce(length(s->>'returnsPolicy'),0)>8000 or coalesce(length(s->>'privacyPolicy'),0)>8000 then raise exception 'راجع نصوص وصورة وسياسات المتجر.'; end if;
  for v in select value from jsonb_array_elements(s->'shippingZones') loop
    if coalesce(length(v->>'id'),0) not between 1 and 60 or coalesce(length(v->>'name'),0) not between 1 and 200 or jsonb_typeof(v->'enabled') is distinct from 'boolean' or coalesce(v->>'fee','') !~ '^[0-9]+$' or (v->>'fee')::numeric > 1000000 or v->>'id' = any(seen) then raise exception 'راجع مناطق ورسوم التوصيل.'; end if;
    seen := array_append(seen,v->>'id');
  end loop;
  seen := '{}';
  for v in select value from jsonb_array_elements(s->'sections') loop
    if jsonb_typeof(v)<>'string' or v #>> '{}' not in ('featured','quiz','recipes','experience','story','branches','guide','brewing') or v #>> '{}' = any(seen) then raise exception 'أقسام الرئيسية غير صالحة.'; end if;
    seen := array_append(seen,v #>> '{}');
  end loop;
  if s ? 'cms' then perform public.dar_validate_cms(s->'cms'); end if;
  if s ? 'branches' then
    if jsonb_typeof(s->'branches') <> 'array' or jsonb_array_length(s->'branches') > 12 then raise exception 'راجع الفروع.'; end if;
    for v in select value from jsonb_array_elements(s->'branches') loop if coalesce(length(v->>'name'),0) not between 1 and 80 or coalesce(length(v->>'address'),0) not between 1 and 300 or jsonb_typeof(v->'main') is distinct from 'boolean' or (v ? 'enabled' and jsonb_typeof(v->'enabled') <> 'boolean') then raise exception 'اسم وعنوان الفرع مطلوبان.'; end if; end loop;
  end if;
end $$;


revoke all on function public.dar_validate_cms(jsonb),public.dar_validate_settings(jsonb) from public,anon,authenticated;
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
