const nodemailer = require('nodemailer');
const { handleCors } = require('../_lib/cors');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, subject, message } = req.body || {};

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!message || message.trim().length < 10) return res.status(400).json({ error: 'Message must be at least 10 characters' });

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    try {
        // Email to store owner
        await transporter.sendMail({
            from: `"Thomas Clothing Contact" <${process.env.GMAIL_USER}>`,
            to: 'juiceyorwatei2030@gmail.com',
            replyTo: email,
            subject: `[Contact Form] ${subject || 'New Message'} — from ${name}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:8px;overflow:hidden">
                    <div style="background:#1a1a1a;padding:25px 30px">
                        <h2 style="color:#5fa387;margin:0;font-size:20px">Thomas Clothing</h2>
                        <p style="color:#999;margin:4px 0 0;font-size:13px">New Contact Form Submission</p>
                    </div>
                    <div style="padding:30px;background:#ffffff">
                        <table style="width:100%;border-collapse:collapse;font-size:14px">
                            <tr><td style="padding:8px 0;color:#666;width:100px">From:</td><td style="padding:8px 0;color:#222;font-weight:600">${name}</td></tr>
                            <tr><td style="padding:8px 0;color:#666">Email:</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#5fa387">${email}</a></td></tr>
                            <tr><td style="padding:8px 0;color:#666">Subject:</td><td style="padding:8px 0;color:#222">${subject || '—'}</td></tr>
                        </table>
                        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
                        <p style="color:#666;font-size:13px;margin-bottom:8px">Message:</p>
                        <div style="background:#f5f5f5;border-left:3px solid #5fa387;padding:15px 20px;border-radius:4px;color:#333;font-size:14px;line-height:1.6;white-space:pre-wrap">${message.trim()}</div>
                    </div>
                    <div style="background:#f0f0f0;padding:15px 30px;text-align:center">
                        <p style="color:#999;font-size:12px;margin:0">Reply directly to this email to respond to ${name}</p>
                    </div>
                </div>
            `
        });

        // Auto-reply to sender
        await transporter.sendMail({
            from: `"Thomas Clothing" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'We received your message — Thomas Clothing',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:8px;overflow:hidden">
                    <div style="background:#1a1a1a;padding:25px 30px">
                        <h2 style="color:#5fa387;margin:0;font-size:20px">Thomas Clothing</h2>
                        <p style="color:#999;margin:4px 0 0;font-size:13px">Premium Collection</p>
                    </div>
                    <div style="padding:30px;background:#ffffff">
                        <h3 style="color:#222;margin-top:0">Hi ${name}, we got your message!</h3>
                        <p style="color:#555;line-height:1.6">Thank you for reaching out. We've received your message and will get back to you within <strong>24–48 hours</strong>.</p>
                        <div style="background:#f5f5f5;border-left:3px solid #5fa387;padding:15px 20px;border-radius:4px;margin:20px 0;color:#555;font-size:14px;line-height:1.6;white-space:pre-wrap">${message.trim()}</div>
                        <p style="color:#555;line-height:1.6">In the meantime, feel free to browse our latest collection.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/products.html" style="display:inline-block;background:#5fa387;color:#fff;padding:10px 25px;border-radius:25px;text-decoration:none;font-size:14px;margin-top:10px">Browse Collection →</a>
                    </div>
                    <div style="background:#f0f0f0;padding:15px 30px;text-align:center">
                        <p style="color:#999;font-size:12px;margin:0">&copy; Thomas Clothing 2024. All rights reserved.</p>
                    </div>
                </div>
            `
        });

        return res.status(200).json({ message: 'Message sent successfully' });

    } catch (err) {
        console.error('Contact email error:', err);
        return res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
};
