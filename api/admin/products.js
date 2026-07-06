const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        const { page = 1, limit = 20, search, category } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabaseAdmin
            .from('products')
            .select(`
                id, name, slug, price, stock_qty, image_url,
                is_active, is_featured, rating_avg, rating_count, created_at,
                categories ( id, name, slug )
            `, { count: 'exact' });

        if (search) query = query.ilike('name', `%${search}%`);
        if (category) {
            const { data: cat } = await supabaseAdmin
                .from('categories').select('id').eq('slug', category).single();
            if (cat) query = query.eq('category_id', cat.id);
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: products, error, count } = await query;
        if (error) return res.status(500).json({ error: 'Failed to fetch products' });

        return res.status(200).json({
            products,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            }
        });

    } catch (err) {
        console.error('Admin products error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
