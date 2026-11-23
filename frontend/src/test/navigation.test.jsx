import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../components/Header';
import LandingPage from '../pages/LandingPage';

describe('Navigation Components', () => {
  describe('Header Component', () => {
    const mockOnSelectTab = vi.fn();

    it('renders the ReliefOpt brand logo and title', () => {
      render(
        <Header status="connected" currentTab="dashboard" onSelectTab={mockOnSelectTab} />
      );

      expect(screen.getByText('ReliefOpt')).toBeInTheDocument();
      expect(screen.getByText('Smart Emergency Relief Distribution')).toBeInTheDocument();
    });

    it('renders all 9 primary navigation items', () => {
      render(
        <Header status="connected" currentTab="dashboard" onSelectTab={mockOnSelectTab} />
      );

      const expectedLabels = [
        'Home',
        'Dashboard',
        'Warehouses',
        'Supplies',
        'Inventory',
        'Villages',
        'Demand',
        'Optimization',
        'Analytics & Maps',
      ];

      expectedLabels.forEach((label) => {
        expect(screen.getAllByText(label)[0]).toBeInTheDocument();
      });
    });

    it('highlights the active tab with the "active" class', () => {
      render(
        <Header status="connected" currentTab="warehouses" onSelectTab={mockOnSelectTab} />
      );

      const warehouseBtn = screen.getAllByRole('button', { name: /Warehouses/i })[0];
      expect(warehouseBtn).toHaveClass('active');
    });

    it('invokes onSelectTab when a navigation button is clicked', () => {
      render(
        <Header status="connected" currentTab="dashboard" onSelectTab={mockOnSelectTab} />
      );

      const optimizationBtn = screen.getAllByRole('button', { name: /Optimization/i })[0];
      fireEvent.click(optimizationBtn);

      expect(mockOnSelectTab).toHaveBeenCalledWith('optimization');
    });

    it('clicking brand wrapper navigates back to landing page', () => {
      render(
        <Header status="connected" currentTab="optimization" onSelectTab={mockOnSelectTab} />
      );

      const brandLogo = screen.getByText('ReliefOpt');
      fireEvent.click(brandLogo);

      expect(mockOnSelectTab).toHaveBeenCalledWith('landing');
    });
  });

  describe('LandingPage Navigation & Health Status', () => {
    it('renders hero title and triggers dashboard navigation callback', () => {
      const mockExplore = vi.fn();
      render(
        <LandingPage
          status="connected"
          healthData={{ status: 'healthy', database: 'connected' }}
          endpointUrl="http://127.0.0.1:8000/health"
          onExploreDashboard={mockExplore}
        />
      );

      const heroHeading = screen.getByRole('heading', { level: 1 });
      expect(heroHeading).toBeInTheDocument();

      const exploreBtn = screen.getByRole('button', { name: /Explore.*Dashboard/i });
      fireEvent.click(exploreBtn);
      expect(mockExplore).toHaveBeenCalled();
    });
  });
});
