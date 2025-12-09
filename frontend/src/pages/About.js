import React from 'react';
import '../styles/about.css';
import Sidebar from '../components/Sidebar';

export default function About() {
  return (
    <div className="dashboard">
      <Sidebar activePage="dashboard" />

      <main className="main">
        <div className="content">
          <section className="about-hero">
            <div className="about-hero-inner">
              <h1>About Slide-IT</h1>
              <p className="lead">Slide-IT helps teams and individuals create professional presentations faster — convert files, edit slides, and generate content with AI-assisted tools.</p>
            </div>
          </section>

          <section className="about-features">
            <h2>What we offer</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Convert Effortlessly</h3>
                <p>Turn PDFs, Word documents and Excel charts into editable slides with one click.</p>
              </div>
              <div className="feature-card">
                <h3>AI-Assisted Content</h3>
                <p>Generate slide copy, speaker notes, and layouts using built-in AI tools.</p>
              </div>
              <div className="feature-card">
                <h3>Templates & Collaboration</h3>
                <p>Use prebuilt templates or upload your own — share and collaborate with teammates.</p>
              </div>
            </div>
          </section>

          <section className="about-team">
            <h2>Our Mission</h2>
            <p>We want to make slide creation joyful and productive. By combining smart automation with familiar editing workflows, Slide-IT saves time and improves presentation quality.</p>
          </section>

          <section className="about-cta">
            <p>If you'd like to collaborate, suggest features, or report issues, reach out at <a href="mailto:support@slideit.example">support@slideit.example</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
