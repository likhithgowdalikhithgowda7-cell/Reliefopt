import React, { useState } from 'react';
import Hero from '../components/Hero';
import ConnectionStatus from '../components/ConnectionStatus';
import ProjectOverview from '../components/ProjectOverview';
import WorkflowPreview from '../components/WorkflowPreview';
import TechStack from '../components/TechStack';
import DashboardModal from '../components/DashboardModal';

export default function LandingPage({
  status,
  healthData,
  error,
  endpointUrl,
  performHealthCheck,
  isChecking,
  onExploreDashboard,
}) {
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  return (
    <div className="landing-page">
      <main>
        {/* Hero section */}
        <Hero
          onExploreDashboard={() => {
            if (onExploreDashboard) {
              onExploreDashboard();
            } else {
              setIsRoadmapOpen(true);
            }
          }}
        />

        {/* Diagnostic health connection banner */}
        <div className="container connection-status-wrapper">
          <ConnectionStatus
            status={status}
            healthData={healthData}
            error={error}
            endpointUrl={endpointUrl || 'http://127.0.0.1:8000/health'}
            onRetry={performHealthCheck}
            isChecking={isChecking}
          />
        </div>

        {/* Core Capabilities */}
        <ProjectOverview />

        {/* Planned Workflow */}
        <WorkflowPreview />

        {/* Technology Foundation */}
        <TechStack />
      </main>

      {/* Development Roadmap Modal */}
      <DashboardModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
      />
    </div>
  );
}
