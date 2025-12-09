import React, { useState } from 'react';
import '../styles/support.css';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

export default function Support() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !email || !message) {
      toast.error('Please fill out name, email and message');
      return;
    }

    try {
      toast.loading('Sending...');
      const resp = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });

      const text = await resp.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        // If server returned HTML or plain text, wrap it into a fallback object
        data = { success: resp.ok, error: text };
      }

      toast.dismiss();
      if (resp.ok && data && data.success) {
        toast.success('Message sent — thank you!');
        setName(''); setEmail(''); setMessage('');
      } else {
        console.error('Support API error', data);
        const errMsg = (data && data.error) ? data.error : (typeof data === 'string' ? data : 'Failed to send message');
        toast.error(errMsg || 'Failed to send message');
      }
    } catch (err) {
      toast.dismiss();
      console.error('Network error sending support', err);
      toast.error('Network error — please try again later');
    }
  }

  return (
    <div className="dashboard">
      <Sidebar activePage="settings" />

      <main className="main">
        <div className="content">
          <section className="support-hero">
            <div className="support-hero-inner">
              <h1>Contact Support</h1>
              <p className="lead">Reach out to our account admin for assistance. We'll do our best to respond quickly.</p>
            </div>
          </section>

          <section className="support-grid">
            <div className="support-card">
              <h2>Send a message</h2>
              <form className="support-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>

                <div className="form-group">
                  <label>Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" />
                </div>

                <button type="submit" className="submit-btn">Email Support</button>
              </form>
            </div>

            <aside className="support-info">
              <div className="info-card">
                <h3>Account admin</h3>
                <p><strong>Email:</strong> <a href="mailto:slideit2025@gmail.com">slideit2025@gmail.com</a></p>
                <p>Typical response time: 1-2 business days.</p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
