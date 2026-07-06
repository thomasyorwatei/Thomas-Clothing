const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');
const { validateProduct, sanitizeString } = require('../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (req.method === 'GET') {
        return getProducts(req, res);
    }
    if (req.method === 'POST') {
        return createProduct(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
};

async function getProducts(req, res) {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            search,
            sort = 'created_at',
            order = 'desc',
            minPrice,
            maxPrice,
            featured
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabaseAdmin
            .from('products')
            .select(`
                id, name, slug, description, price, stock_qty,
                image_url, images, sizes, rating_avg, rating_count,
                is_featured, created_at,
                categories ( id, name, slug )
            `, { count: 'exact' })
            .eq('is_active', true);

        // Category filter
        if (category) {
            const { data: cat } = await supabaseAdmin
                .from('categories')
                .select('id')
                .eq('slug', category)
                .single();
            if (cat) {
                query = query.eq('category_id', cat.id);
            }
        }

        // Search filter — case-insensitive name or description match
        if (search && search.trim()) {
            query = query.or(
                `name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
            );
        }

        // Price range filters
        if (minPrice) query = query.gte('price', parseFloat(minPrice));
        if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

        // Featured filter
        if (featured === 'true') query = query.eq('is_featured', true);

        // Sorting
        const allowedSorts = ['price', 'name', 'created_at', 'rating_avg'];
        const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order === 'asc' ? { ascending: true } : { ascending: false };
        query = query.order(sortField, sortOrder);

        // Pagination
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Products fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        return res.status(200).json({
            products: data,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            }
        });

    } catch (err) {
        console.error('Products error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function createProduct(req, res) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    const body = req.body || {};
    const errors = validateProduct(body);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    try {
        const slug = sanitizeString(body.name, 255)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert({
                category_id: body.category_id,
                name: sanitizeString(body.name, 255),
                slug,
                description: sanitizeString(body.description || '', 2000),
                price: parseFloat(body.price),
                stock_qty: parseInt(body.stock_qty) || 0,
                image_url: sanitizeString(body.image_url || '', 500),
                images: body.images || [],
                sizes: body.sizes || [],
                is_featured: body.is_featured === true,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'A product with this name already exists' });
            }
            return res.status(500).json({ error: 'Failed to create product' });
        }

        return res.status(201).json({ product: data });

    } catch (err) {
        console.error('Create product error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
