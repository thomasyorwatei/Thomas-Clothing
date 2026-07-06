const { supabaseAdmin } = require('../../../_lib/supabase');
const { handleCors } = require('../../../_lib/cors');
const { isPositiveInteger } = require('../../../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    const { itemId } = req.query;

    if (req.method === 'PUT') return updateCartItem(req, res, itemId);
    if (req.method === 'DELETE') return removeCartItem(req, res, itemId);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function updateCartItem(req, res, itemId) {
    const { quantity } = req.body || {};

    if (!quantity || !isPositiveInteger(quantity)) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    try {
        // Fetch item to get product for stock check
        const { data: item, error: itemError } = await supabaseAdmin
            .from('cart_items')
            .select('id, product_id')
            .eq('id', parseInt(itemId))
            .single();

        if (itemError || !item) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        // Check stock
        const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock_qty')
            .eq('id', item.product_id)
            .single();

        if (product && product.stock_qty < parseInt(quantity)) {
            return res.status(400).json({ error: `Only ${product.stock_qty} items in stock` });
        }

        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .update({ quantity: parseInt(quantity) })
            .eq('id', parseInt(itemId))
            .select()
            .single();

        if (error) return res.status(500).json({ error: 'Failed to update item' });

        return res.status(200).json({ message: 'Quantity updated', item: data });

    } catch (err) {
        console.error('Update cart item error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function removeCartItem(req, res, itemId) {
    try {
        const { error } = await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('id', parseInt(itemId));

        if (error) return res.status(500).json({ error: 'Failed to remove item' });

        return res.status(200).json({ message: 'Item removed from cart' });

    } catch (err) {
        console.error('Remove cart item error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
