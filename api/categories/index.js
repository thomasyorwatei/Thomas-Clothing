const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');
const { sanitizeString } = require('../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (req.method === 'GET') return getCategories(req, res);
    if (req.method === 'POST') return createCategory(req, res);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function getCategories(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .select(`
                id, name, slug, description, created_at,
                products ( id )
            `)
            .order('name', { ascending: true });

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch categories' });
        }

        // Add product count to each category
        const categories = data.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            product_count: cat.products ? cat.products.length : 0
        }));

        return res.status(200).json({ categories });

    } catch (err) {
        console.error('Categories error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function createCategory(req, res) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    const body = req.body || {};
    if (!body.name || body.name.trim().length < 2) {
        return res.status(400).json({ error: 'Category name is required (minimum 2 characters)' });
    }

    try {
        const slug = sanitizeString(body.name, 100)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const { data, error } = await supabaseAdmin
            .from('categories')
            .insert({
                name: sanitizeString(body.name, 100),
                slug,
                description: sanitizeString(body.description || '', 500)
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Category already exists' });
            }
            return res.status(500).json({ error: 'Failed to create category' });
        }

        return res.status(201).json({ category: data });

    } catch (err) {
        console.error('Create category error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
