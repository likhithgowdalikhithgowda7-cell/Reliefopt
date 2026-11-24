import React from 'react';
import Hero from '../components/Hero';
import ProjectOverview from '../components/ProjectOverview';
import WorkflowPreview from '../components/WorkflowPreview';
import TechStack from '../components/TechStack';

export default function LandingPage({ onExploreDashboard }) {
  return (
    <div className="landing-page">
      <main>
        {/* Hero section */}
        <Hero onExploreDashboard={onExploreDashboard} />

        {/* Core Capabilities */}
        <ProjectOverview />

        {/* Planned Workflow */}
        <WorkflowPreview />

        {/* Technology Foundation */}
        <TechStack />
      </main>
    </div>
  );
}
