import React, { createContext, useContext, ReactNode } from 'react';

// Simplified OrganizationContext for Nebula
// Provides the minimal interface needed by useFunnels hook
// Funnels are scoped per-user via user_id, organization is just a static wrapper

interface Organization {
  id: string;
  name: string;
}

interface OrganizationContextValue {
  organization: Organization | null;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  // In Nebula, we use a static org ID — funnels are scoped per-user
  const value: OrganizationContextValue = {
    organization: { id: 'default', name: 'Default' },
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
}
