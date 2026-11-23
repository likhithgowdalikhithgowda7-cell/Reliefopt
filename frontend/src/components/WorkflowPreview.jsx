import React from 'react';
import {
  Warehouse,
  MapPin,
  Truck,
  Cpu,
  CheckCircle,
  Map,
  Info,
} from 'lucide-react';

export default function WorkflowPreview() {
  const steps = [
    {
      number: 1,
      icon: <Warehouse size={22} />,
      title: 'Add Warehouses',
      description: 'Register warehouses and available inventory.',
    },
    {
      number: 2,
      icon: <MapPin size={22} />,
      title: 'Add Affected Locations',
      description: 'Enter village details, affected population, demand and urgency.',
    },
    {
      number: 3,
      icon: <Truck size={22} />,
      title: 'Enter Transportation Costs',
      description: 'Record estimated cost per unit for warehouse-to-village shipments.',
    },
    {
      number: 4,
      icon: <Cpu size={22} />,
      title: 'Run Optimisation',
      description: 'Use Google OR-Tools to recommend allocations considering inventory, demand, transportation costs, urgency and explicitly defined fairness rules.',
    },
    {
      number: 5,
      icon: <CheckCircle size={22} />,
      title: 'View Allocation Results',
      description: 'Review allocated quantities, remaining inventory, estimated transportation costs and unmet demand.',
    },
    {
      number: 6,
      icon: <Map size={22} />,
      title: 'Analyse Charts and Map',
      description: 'Visualise results using Plotly charts and Leaflet GIS mapping with English cartography.',
    },
  ];

  return (
    <section id="workflow" className="section section-alt">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">End-to-End Pipeline</span>
          <h2 className="section-title">Operational Supply Distribution Pipeline</h2>
          <p className="section-subtitle">
            ReliefOpt guides coordinators through a structured sequential workflow from
            coordinator-entered field inputs to decision-support recommendations.
          </p>
        </div>

        <div className="workflow-timeline">
          {steps.map((step) => (
            <div key={step.number} className="workflow-step">
              <div className="step-number">{step.number}</div>
              <div className="step-icon-wrap">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
