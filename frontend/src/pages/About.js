import React from 'react';
import '../styles/about.css';
import Sidebar from '../components/Sidebar';

export default function About() {
  return (
    <div className="dashboard">
      <Sidebar activePage="dashboard" />

      <main className="main">
        <div className="content about-page">
          <section className="about-hero">
            <div className="about-hero-inner">
              <h1>About SLIDE-IT</h1>
              <p className="lead">SLIDE-IT is a capstone project of students from PUP Biñan. Our goal is to help students, educators, and professionals to create presentations faster — convert files, edit slides, and generate content with AI-assisted tools.</p>
            </div>
          </section>

          <section className="about-features">
            <h2>What We Offer</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Convert Effortlessly</h3>
                <p>Turn PDFs, Word documents and Excel charts into editable slides with one click.</p>
              </div>
              <div className="feature-card">
                <h3>AI-Assisted Content</h3>
                <p>Generate slide copy, AI images, and layouts using built-in AI tools.</p>
              </div>
              <div className="feature-card">
                <h3>Templates & Collaboration</h3>
                <p>Use prebuilt templates or upload your own — share and collaborate with teammates.</p>
              </div>
            </div>
          </section>

          <section className="about-team">
            <h2>Our Mission</h2>
            <p>We want to make slide creation joyful and productive. By combining smart automation with familiar editing workflows, SLIDE-IT saves time and improves presentation quality.</p>
            <div className="team-section">
              <h3>Researchers & Developers</h3>
              <div className="team-media">
                <img
                  className="team-photo"
                  src={process.env.PUBLIC_URL + '/images/team.jpg'}
                  alt="Slide-IT researchers and developers"
                />
              </div>
            </div>
          </section>

        
        </div>
      </main>
    </div>
  );
}
