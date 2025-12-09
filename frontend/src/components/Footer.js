import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-left">
          <div className="footer-copy">© {year} Slide-IT</div>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          <Link to="/dashboard">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/support">Support</Link>
        </nav>
      </div>
    </footer>
  );
}
