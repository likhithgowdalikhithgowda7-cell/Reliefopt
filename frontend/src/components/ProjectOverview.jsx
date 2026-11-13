import React from 'react';
import { Target, Scale, BarChart3, AlertOctagon, Truck, Layers } from 'lucide-react';

export default function ProjectOverview() {
  const cards = [
    {
      icon: <Target size={28} />,
      title: 'Targeted Urgency Response',
      description:
        'Supports prioritization of affected villages based on coordinator-assessed urgency levels (Low, Medium, High, and Critical) and reported population needs.',
    },
    {
      icon: <Scale size={28} />,
      title: 'Fair and Cost-Aware Allocation',
      description:
        'Supports fair and urgency-aware relief distribution through explicitly defined optimisation rules.',
    },
    {
      icon: <BarChart3 size={28} />,
      title: 'Data-Driven Decision Support',
      description:
        'Helps coordinators evaluate estimated transportation costs, review recommended allocations, and identify unmet demand before dispatch.',
    },
  ];

  return (
    <section id="overview" className="section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Core Capabilities</span>
          <h2 className="section-title">Why ReliefOpt Matters</h2>
          <p className="section-subtitle">
            During emergency events such as floods, relief teams face resource scarcity
            and difficult allocation decisions. ReliefOpt provides structured decision
            support to help coordinators plan relief distribution using coordinator-reported
            field data and explicit optimisation rules.
          </p>
        </div>

        <div className="overview-grid">
          {cards.map((card, idx) => (
            <div key={idx} className="overview-card">
              <div className="overview-icon-box">{card.icon}</div>
              <h3 className="overview-card-title">{card.title}</h3>
              <p className="overview-card-desc">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
