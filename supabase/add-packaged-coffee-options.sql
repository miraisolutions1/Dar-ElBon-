-- Preview-only: add packaged coffee choices without changing existing catalog or orders.
-- Prices and stock are copied from the owner's existing demonstration package, not real sale data.
BEGIN;
DO $$
DECLARE
  package_type text; roast_name text; blend_kind text; roast_slug text; kind_slug text;
  source_product jsonb; new_product jsonb; new_variants jsonb; product_id uuid; new_slug text;
BEGIN
  PERFORM 1 FROM public.dar_settings WHERE id=1 AND value->>'mode'='preview' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This catalog update is for preview mode only.'; END IF;
  FOREACH package_type IN ARRAY ARRAY['pouch','tin'] LOOP
    SELECT data INTO source_product FROM public.dar_products
    WHERE (data->>'demo')::boolean AND data->>'stockMode'='units'
      AND data->>'kind' IN ('سادة','محوج')
      AND data->>'image' LIKE CASE WHEN package_type='tin' THEN '%coffee-tin-studio.webp' ELSE '%coffee-sada-studio.webp' END
    ORDER BY id LIMIT 1;
    IF source_product IS NULL THEN RAISE EXCEPTION 'Preview package template missing: %',package_type; END IF;
    FOREACH roast_name IN ARRAY ARRAY['فاتح','وسط','غامق'] LOOP
      FOREACH blend_kind IN ARRAY ARRAY['سادة','محوج'] LOOP
        IF EXISTS (SELECT 1 FROM public.dar_products WHERE data->>'image'=source_product->>'image'
          AND data->>'roast'=roast_name AND data->>'kind'=blend_kind) THEN CONTINUE; END IF;
        roast_slug:=CASE roast_name WHEN 'فاتح' THEN 'light' WHEN 'وسط' THEN 'medium' ELSE 'dark' END;
        kind_slug:=CASE blend_kind WHEN 'سادة' THEN 'plain' ELSE 'spiced' END;
        new_slug:='dar-package-'||package_type||'-'||roast_slug||'-'||kind_slug;
        product_id:=gen_random_uuid();
        SELECT jsonb_agg(value || jsonb_build_object('id',gen_random_uuid()::text)) INTO new_variants
        FROM jsonb_array_elements(source_product->'variants');
        new_product:=(source_product-'retiredVariants')||jsonb_build_object(
          'id',product_id,'slug',new_slug,
          'name',CASE WHEN package_type='tin' THEN 'علبة دار البن' ELSE 'عبوة دار البن الصفراء' END || ' — ' || blend_kind || ' — تحميص ' || roast_name,
          'description','اختار عبوتك بالتحميص اللي تحبه، سادة أو محوج، وحدد الوزن والطحنة. الخيارات والأسعار والمخزون مؤقتة للتجربة لحين اعتماد القائمة الفعلية.',
          'kind',blend_kind,'roast',roast_name,'featured',false,'active',true,'demo',true,
          'variants',new_variants,'updatedAt',public.dar_now_ms());
        PERFORM public.dar_validate_product(new_product);
        INSERT INTO public.dar_products(id,data) VALUES(product_id,new_product) ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
COMMIT;
