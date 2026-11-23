import React from 'react';
import { Layers } from 'lucide-react';

export default function TechStack() {
  const technologies = [
    {
      name: 'React.js',
      role: 'Frontend Client Architecture',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Single-page client interface built with functional components, hooks, and modern CSS.',
    },
    {
      name: 'FastAPI',
      role: 'High-Performance REST Backend',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Asynchronous Python framework providing typed RESTful endpoints, Pydantic validations, and automated OpenAPI documentation.',
    },
    {
      name: 'Python 3',
      role: 'Core Backend Runtime',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Powering backend services, data validation models, solver integration, and real-time health diagnostics.',
    },
    {
      name: 'PostgreSQL',
      role: 'Relational Database',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Enterprise relational database storing registered warehouses, affected village demand, supply catalogue, inventory levels, and historical solver plans.',
    },
    {
      name: 'Google OR-Tools',
      role: 'Mathematical Optimization Engine',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Mixed-Integer Linear Programming (MILP) solver optimizing multi-commodity emergency allocations under inventory, demand, urgency, and cost constraints.',
    },
    {
      name: 'Plotly.js',
      role: 'Operational Visual Analytics',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Interactive analytics charting allocated relief, critical fulfillment rates, unmet demands, and scenario cost comparisons.',
    },
    {
      name: 'Leaflet & GIS',
      role: 'Geospatial Mapping & Routing',
      status: 'active',
      badgeText: 'Active & Integrated',
      description: 'Geospatial visualization mapping supply depots, flood-affected villages, and optimal dispatch transit corridors with English cartography.',
    },
  ];

  return (
    <section id="technologies" className="section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Engineering Foundation</span>
          <h2 className="section-title">Technology Stack</h2>
          <p className="section-subtitle">
            A production-ready architecture combining a responsive React frontend, robust FastAPI services,
            PostgreSQL relational persistence, and Google OR-Tools mathematical optimization.
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
