import React from 'react';
import { ShieldAlert, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-icon-box" style={{ width: '36px', height: '36px' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="footer-brand-title">ReliefOpt</div>
              <div className="footer-tagline">Emergency Relief Supply Distribution</div>
            </div>
          </div>

          <div className="footer-academic-badge">
            Academic Mini Project
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {currentYear} ReliefOpt. Designed for emergency relief planning and decision-support.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>College Mini Project — Decision Support System</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
