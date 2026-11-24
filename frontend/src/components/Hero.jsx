import React from 'react';
import { ArrowRight, LayoutDashboard, Compass } from 'lucide-react';

export default function Hero({ onExploreDashboard }) {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          {/* Badge */}
          <div className="hero-badge">
            <Compass size={16} />
            <span>Crisis Decision-Support Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="hero-title">
            Smarter Relief Distribution.{' '}
            <span className="hero-title-accent">Better Emergency Response.</span>
          </h1>

          {/* Description */}
          <p className="hero-description">
            ReliefOpt helps relief coordinators plan and optimise emergency supply
            distribution by considering affected-location demand, urgency, available
            warehouse inventory and transportation costs.
          </p>

          {/* Call to Actions */}
          <div className="hero-cta-group">
            <button
              onClick={onExploreDashboard}
              className="btn btn-primary"
              aria-label="Explore ReliefOpt Dashboard"
            >
              <LayoutDashboard size={18} />
              <span>Explore Dashboard</span>
              <ArrowRight size={16} />
            </button>

            <a href="#workflow" className="btn btn-secondary">
              <span>View Distribution Pipeline</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
