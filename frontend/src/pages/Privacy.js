import React from 'react';
import '../styles/privacy.css';
import Sidebar from '../components/Sidebar';

export default function Privacy() {
  return (
    <div className="dashboard">
      <Sidebar activePage="settings" />

      <main className="main">
        <div className="content">
          <section className="privacy-hero">
            <div className="privacy-hero-inner">
              <h1>Privacy Policy</h1>
              <p className="lead">This policy explains what data we collect, how we use it, and the choices you have.</p>
            </div>
          </section>

          <section className="privacy-section">
            <h2>Information We Collect</h2>
            <ul>
              <li>Account information (name, email) when you sign up.</li>
              <li>Files you upload (PPT, PDF, DOCX, images) to provide conversion services.</li>
              <li>Usage data and analytics to improve the service.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>How We Use Your Data</h2>
            <p>We use your data to provide and improve Slide-IT features, process your conversions, and send transactional emails (e.g., password resets).</p>
          </section>

          <section className="privacy-section">
            <h2>Third Parties</h2>
            <p>We may share data with trusted third-party services (storage, analytics) under contractual obligations to protect your privacy.</p>
          </section>

          <section className="privacy-section">
            <h2>Your Choices</h2>
            <p>You can delete your account at any time or contact support to request data removal. You may also control notification preferences in your settings.</p>
          </section>

          <section className="privacy-section small">
            <p>Last updated: December 9, 2025</p>
          </section>
        </div>
      </main>
    </div>
  );
}
