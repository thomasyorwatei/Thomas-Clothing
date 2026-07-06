const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');
const { validateProduct, sanitizeString } = require('../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    const { id } = req.query;

    if (req.method === 'GET') return getProduct(req, res, id);
    if (req.method === 'PUT') return updateProduct(req, res, id);
    if (req.method === 'DELETE') return deleteProduct(req, res, id);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function getProduct(req, res, id) {
    try {
        // Support lookup by numeric ID or slug
        let query = supabaseAdmin
            .from('products')
            .select(`
                id, name, slug, description, price, stock_qty,
                image_url, images, sizes, rating_avg, rating_count,
                is_featured, created_at,
                categories ( id, name, slug )
            `)
            .eq('is_active', true);

        if (isNaN(id)) {
            query = query.eq('slug', id);
        } else {
            query = query.eq('id', parseInt(id));
        }

        const { data, error } = await query.single();

        if (error || !data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({ product: data });

    } catch (err) {
        console.error('Get product error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateProduct(req, res, id) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    const body = req.body || {};

    try {
        const updates = {};
        if (body.name) updates.name = sanitizeString(body.name, 255);
        if (body.description !== undefined) updates.description = sanitizeString(body.description, 2000);
        if (body.price !== undefined) updates.price = parseFloat(body.price);
        if (body.stock_qty !== undefined) updates.stock_qty = parseInt(body.stock_qty);
        if (body.category_id) updates.category_id = parseInt(body.category_id);
        if (body.image_url !== undefined) updates.image_url = sanitizeString(body.image_url, 500);
        if (body.images !== undefined) updates.images = body.images;
        if (body.sizes !== undefined) updates.sizes = body.sizes;
        if (body.is_featured !== undefined) updates.is_featured = Boolean(body.is_featured);
        if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

        const { data, error } = await supabaseAdmin
            .from('products')
            .update(updates)
            .eq('id', parseInt(id))
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Product not found or update failed' });
        }

        return res.status(200).json({ product: data });

    } catch (err) {
        console.error('Update product error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteProduct(req, res, id) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        // Soft delete — set is_active to false
        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ is_active: false })
            .eq('id', parseInt(id))
            .select('id, name')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({ message: `Product "${data.name}" deactivated successfully` });

    } catch (err) {
        console.error('Delete product error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
