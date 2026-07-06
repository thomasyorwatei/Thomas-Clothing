-- ============================================================
-- RWANDA TRAD SEED DATA
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO categories (name, slug, description) VALUES
    ('Mushanana', 'mushanana', 'Traditional Rwandan womens formal attire, worn for ceremonies and celebrations'),
    ('Kitenge', 'kitenge', 'Vibrant African wax print fabric clothing for men and women'),
    ('Accessories', 'accessories', 'Traditional Rwandan jewellery, belts, sandals and decorative items'),
    ('Ceremonial', 'ceremonial', 'Attire and regalia for traditional ceremonies, dances and cultural events'),
    ('Umutara', 'umutara', 'Classic Rwandan wrap and drape clothing')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PRODUCTS  (16 products matching existing product images)
-- ============================================================
INSERT INTO products (
    category_id, name, slug, description,
    price, stock_qty, image_url, images, sizes,
    rating_avg, rating_count, is_featured, is_active
) VALUES

-- 1. Men's Kitenge Shirt
(
    (SELECT id FROM categories WHERE slug = 'kitenge'),
    'Men''s Kitenge Shirt',
    'mens-kitenge-shirt',
    'A tailored Kitenge shirt crafted from premium wax-print fabric. Perfect for formal and semi-formal occasions. Hand-stitched collar and cuffs with traditional Rwandan pattern.',
    55000, 30,
    '/images/products/product-1.webp',
    '["/images/products/product-1.webp"]',
    '["S","M","L","XL","XXL"]',
    3.00, 14, TRUE, TRUE
),

-- 2. Hand-crafted Sandals
(
    (SELECT id FROM categories WHERE slug = 'accessories'),
    'Hand-crafted Sandals',
    'hand-crafted-sandals',
    'Genuine leather sandals hand-crafted by skilled artisans in Kigali. Durable, comfortable and styled with traditional Rwandan geometric patterns on the straps.',
    180000, 20,
    '/images/products/product-2.webp',
    '["/images/products/product-2.webp"]',
    '["36","37","38","39","40","41","42","43","44","45"]',
    4.50, 22, FALSE, TRUE
),

-- 3. Umutara Wrap
(
    (SELECT id FROM categories WHERE slug = 'umutara'),
    'Umutara Wrap',
    'umutara-wrap',
    'A classic Umutara wrap in rich earth tones. Lightweight and versatile, suitable for everyday wear or cultural events. Made from high-quality imported fabric with a traditional weave.',
    78000, 40,
    '/images/products/product-3.webp',
    '["/images/products/product-3.webp"]',
    '["One Size","S/M","L/XL"]',
    5.00, 18, TRUE, TRUE
),

-- 4. Silk Mushanana
(
    (SELECT id FROM categories WHERE slug = 'mushanana'),
    'Silk Mushanana',
    'silk-mushanana',
    'Elegant silk Mushanana in a two-piece set. The sash is hand-draped and secured with a traditional gold pin. Ideal for weddings, graduations and cultural celebrations.',
    52000, 15,
    '/images/products/product-4.webp',
    '["/images/products/product-4.webp"]',
    '["XS","S","M","L","XL"]',
    2.50, 8, FALSE, TRUE
),

-- 5. Kitenge Jacket
(
    (SELECT id FROM categories WHERE slug = 'kitenge'),
    'Kitenge Jacket',
    'kitenge-jacket',
    'A bold and structured Kitenge jacket with a modern cut. Features two front pockets, a single-button closure and vivid African print lining. Pairs well with plain trousers.',
    83000, 25,
    '/images/products/product-5.webp',
    '["/images/products/product-5.webp"]',
    '["S","M","L","XL","XXL"]',
    5.00, 31, TRUE, TRUE
),

-- 6. Patterned Tunic
(
    (SELECT id FROM categories WHERE slug = 'kitenge'),
    'Patterned Tunic',
    'patterned-tunic',
    'A flowing Kitenge tunic with a bold geometric pattern. Relaxed fit with a round neckline and three-quarter sleeves. Can be worn as a dress or over trousers.',
    75000, 35,
    '/images/products/product-6.webp',
    '["/images/products/product-6.webp"]',
    '["S","M","L","XL"]',
    5.00, 27, FALSE, TRUE
),

-- 7. Kitenge Trousers
(
    (SELECT id FROM categories WHERE slug = 'kitenge'),
    'Kitenge Trousers',
    'kitenge-trousers',
    'Modern slim-fit Kitenge trousers with an elastic waistband and side pockets. Made from authentic wax-print cotton. Comfortable for daily wear or casual events.',
    60000, 50,
    '/images/products/product-7.webp',
    '["/images/products/product-7.webp"]',
    '["S","M","L","XL","XXL"]',
    4.00, 19, FALSE, TRUE
),

-- 8. Wedding Mushanana Set
(
    (SELECT id FROM categories WHERE slug = 'mushanana'),
    'Wedding Mushanana Set',
    'wedding-mushanana-set',
    'A premium wedding Mushanana set including the main dress, sash and matching headpiece. Hand-embroidered floral patterns along the hem. Available in ivory and deep burgundy.',
    78000, 10,
    '/images/products/product-8.webp',
    '["/images/products/product-8.webp"]',
    '["XS","S","M","L","XL","XXL"]',
    4.00, 12, TRUE, TRUE
),

-- 9. Beaded Necklaces
(
    (SELECT id FROM categories WHERE slug = 'accessories'),
    'Beaded Necklaces',
    'beaded-necklaces',
    'Handmade beaded necklaces using traditional Rwandan colour patterns. Each piece is unique and crafted by women cooperatives in the Eastern Province. Set of two necklaces.',
    21000, 60,
    '/images/products/product-9.webp',
    '["/images/products/product-9.webp"]',
    '["One Size"]',
    3.50, 9, FALSE, TRUE
),

-- 10. Ceremonial Robe
(
    (SELECT id FROM categories WHERE slug = 'ceremonial'),
    'Ceremonial Robe',
    'ceremonial-robe',
    'A full-length ceremonial robe worn for formal cultural events and royal ceremonies. Made from heavyweight brocade fabric with hand-embroidered gold trimming on the collar and sleeves.',
    105000, 8,
    '/images/products/product-10.webp',
    '["/images/products/product-10.webp"]',
    '["M","L","XL","XXL"]',
    3.50, 6, FALSE, TRUE
),

-- 11. Kitenge Shorts
(
    (SELECT id FROM categories WHERE slug = 'kitenge'),
    'Kitenge Shorts',
    'kitenge-shorts',
    'Casual Kitenge shorts with a relaxed fit and elasticated waist. Bold print pattern. Perfect for warm weather and casual outings. Features two side pockets.',
    79000, 45,
    '/images/products/product-11.webp',
    '["/images/products/product-11.webp"]',
    '["S","M","L","XL","XXL"]',
    4.50, 16, FALSE, TRUE
),

-- 12. Woven Belts
(
    (SELECT id FROM categories WHERE slug = 'accessories'),
    'Woven Belts',
    'woven-belts',
    'Hand-woven leather and sisal belts in traditional Rwandan geometric patterns. Available in brown and black. Adjustable with a brass buckle. One size fits most.',
    26000, 55,
    '/images/products/product-12.webp',
    '["/images/products/product-12.webp"]',
    '["One Size"]',
    3.00, 7, FALSE, TRUE
),

-- 13. Dance Attire
(
    (SELECT id FROM categories WHERE slug = 'ceremonial'),
    'Intore Dance Attire',
    'intore-dance-attire',
    'Complete traditional Intore dance costume including the feathered headdress, beaded chest piece and white loin cloth. Worn for the UNESCO-recognised Intore dance performances.',
    195000, 5,
    '/images/products/product-13.webp',
    '["/images/products/product-13.webp"]',
    '["S","M","L","XL"]',
    4.50, 4, TRUE, TRUE
),

-- 14. Intore Regalia
(
    (SELECT id FROM categories WHERE slug = 'ceremonial'),
    'Intore Warrior Regalia',
    'intore-warrior-regalia',
    'Authentic Intore warrior regalia including shield replica, spear prop and full ceremonial costume. Hand-crafted by master artisans in Huye. Ideal for cultural exhibitions.',
    95000, 7,
    '/images/products/product-14.webp',
    '["/images/products/product-14.webp"]',
    '["One Size"]',
    4.50, 11, FALSE, TRUE
),

-- 15. Embroidered Mushanana
(
    (SELECT id FROM categories WHERE slug = 'mushanana'),
    'Embroidered Mushanana',
    'embroidered-mushanana',
    'A beautifully embroidered Mushanana with floral and geometric motifs along the sash. Lightweight chiffon fabric in a rich royal blue. Perfect for formal events.',
    39000, 20,
    '/images/products/product-15.webp',
    '["/images/products/product-15.webp"]',
    '["XS","S","M","L","XL"]',
    4.50, 24, FALSE, TRUE
),

-- 16. Modern Kitenge Top
(
    (SELECT id FROM categories WHERE slug = 'kitenge'),
    'Modern Kitenge Top',
    'modern-kitenge-top',
    'A contemporary Kitenge crop top with off-shoulder design. Fitted at the waist with a flared hem. Available in multiple Kitenge print options. Pairs well with jeans or Kitenge trousers.',
    26000, 60,
    '/images/products/product-16.webp',
    '["/images/products/product-16.webp"]',
    '["XS","S","M","L","XL"]',
    3.00, 5, FALSE, TRUE
)

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- VERIFY SEED
-- ============================================================
-- After running this file, run these to verify:
-- SELECT COUNT(*) FROM categories;   -- should return 5
-- SELECT COUNT(*) FROM products;     -- should return 16
