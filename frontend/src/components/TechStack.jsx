import React from 'react';
import { Layers } from 'lucide-react';

export default function TechStack() {
  const technologies = [
    {
      name: 'React.js',
      role: 'Frontend Framework',
      status: 'active',
      badgeText: 'Configured (Stage 1)',
      description: 'Single-page client interface built with functional components, hooks, and modern CSS.',
    },
    {
      name: 'FastAPI',
      role: 'Backend REST API',
      status: 'active',
      badgeText: 'Configured (Stage 1)',
      description: 'High-performance asynchronous Python framework providing typed endpoints and automated OpenAPI docs.',
    },
    {
      name: 'Python',
      role: 'Core Language',
      status: 'active',
      badgeText: 'Configured (Stage 1)',
      description: 'Powering backend services, configuration management, and health diagnostics.',
    },
    {
      name: 'PostgreSQL',
      role: 'Relational Database',
      status: 'planned',
      badgeText: 'Planned (Stage 2)',
      description: 'Planned database for storing registered warehouses, affected village demand, and allocation records.',
    },
    {
      name: 'Google OR-Tools',
      role: 'Planned Optimisation Engine',
      status: 'planned',
      badgeText: 'Planned (Stage 3)',
      description: 'Planned solver to recommend allocations considering inventory, demand, transportation costs, urgency, and fairness rules.',
    },
    {
      name: 'Plotly',
      role: 'Planned Interactive Charts',
      status: 'planned',
      badgeText: 'Planned (Stage 4)',
      description: 'Planned charts for reviewing allocated quantities, estimated costs, and unmet demand.',
    },
    {
      name: 'Leaflet & OSM',
      role: 'Planned Geospatial Mapping',
      status: 'planned',
      badgeText: 'Planned (Stage 4)',
      description: 'Planned map interface for visualising registered warehouse and affected village locations.',
    },
  ];

  return (
    <section id="technologies" className="section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Engineering Foundation</span>
          <h2 className="section-title">Technology Stack</h2>
          <p className="section-subtitle">
            The architecture combines a reactive frontend with a lightweight Python API,
            establishing the foundation for planned database, optimisation, and visualization tools.
          </p>
        </div>

        <div className="tech-grid">
          {technologies.map((tech, idx) => (
            <div key={idx} className="tech-card">
              <div className="tech-card-header">
                <span className="tech-name">{tech.name}</span>
                <span className={`tech-badge ${tech.status}`}>{tech.badgeText}</span>
              </div>
              <div className="tech-role">{tech.role}</div>
              <p className="tech-desc">{tech.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
