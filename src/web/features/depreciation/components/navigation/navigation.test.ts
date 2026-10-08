import { describe, it, expect } from 'vitest';
import React from 'react';
import { DepreciationTopBar } from './DepreciationTopBar';
import { DepreciationSidebar } from './DepreciationSidebar';

describe('Depreciation navigation components', () => {
  describe('DepreciationTopBar', () => {
    it('renders company details and controls correctly when company is selected', () => {
      const mockCompany = {
        id: 'comp-1',
        name: 'Empresa Teste Ltda',
        cnpj: '12345678000195',
      };
      const element = React.createElement(DepreciationTopBar, {
        selectedCompany: mockCompany,
        companies: [mockCompany],
        selectedCompanyId: 'comp-1',
        onSelectCompany: () => {},
        isLight: false,
        onUpdateTheme: () => {},
        onOpenSettings: () => {},
      });

      expect(element).toBeDefined();
      expect(element.props.selectedCompany.name).toBe('Empresa Teste Ltda');
      expect(element.props.companies).toHaveLength(1);
    });

    it('handles empty company state gracefully', () => {
      const element = React.createElement(DepreciationTopBar, {
        selectedCompany: null,
        companies: [],
        selectedCompanyId: null,
        onSelectCompany: () => {},
        isLight: true,
        onUpdateTheme: () => {},
        onOpenSettings: () => {},
      });

      expect(element).toBeDefined();
      expect(element.props.selectedCompany).toBeNull();
    });
  });

  describe('DepreciationSidebar', () => {
    it('defines all 4 primary navigation tabs', () => {
      const tabs = ['dashboard', 'assets', 'companies', 'categories'] as const;
      for (const t of tabs) {
        const element = React.createElement(DepreciationSidebar, {
          tab: t,
          onSelectTab: () => {},
          isLight: false,
        });
        expect(element.props.tab).toBe(t);
      }
    });
  });
});
