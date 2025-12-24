import { sendEmail } from '../config/emailConfig.js';
import { db } from '../config/firebaseAdmin.js';

/**
 * POST /api/support
 * body: { name, email, message }
 */
export const sendSupportEmail = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'name, email and message are required' });
    }

    const to = 'slideit2025@gmail.com';
    const subject = `Support request from ${name} <${email}>`;
    const html = `
      <h2>Support request from Slide-IT site</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <hr />
      <div>${message.replace(/\n/g, '<br/>')}</div>
    `;
    try {
      await db.collection('supportMessages').add({
        name,
        email,
        message,
        status: 'new',
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.error('Failed to save support message to Firestore:', dbErr);
    }

    // Send email to admin
    const result = await sendEmail(to, subject, html);

    // Send confirmation to user
    try {
      const confSubject = 'We received your support request';
      const confHtml = `
        <p>Hi ${name},</p>
        <p>Thanks for contacting Slide-IT support. We received your message and will get back to you shortly.</p>
        <hr />
        <p><strong>Your message:</strong></p>
        <div>${message.replace(/\n/g, '<br/>')}</div>
        <p>— The Slide-IT Team</p>
      `;
      await sendEmail(email, confSubject, confHtml);
    } catch (confErr) {
      console.error('Failed to send confirmation email to user:', confErr);
      // not fatal
    }

    return res.json({ success: true, result });
  } catch (err) {
    console.error('Error in sendSupportEmail:', err);
    return res.status(500).json({ success: false, error: 'Failed to send support email' });
  }
};

export default { sendSupportEmail };
