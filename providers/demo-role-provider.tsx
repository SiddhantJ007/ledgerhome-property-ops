import type { PropsWithChildren } from 'react';
import { createContext, useContext, useState } from 'react';

export type DemoRole = 'admin' | 'tenant' | null;

type DemoRoleContextValue = {
  selectedRole: DemoRole;
  setSelectedRole: (role: DemoRole) => void;
  clearSelectedRole: () => void;
};

const DemoRoleContext = createContext<DemoRoleContextValue | undefined>(undefined);

export function DemoRoleProvider({ children }: PropsWithChildren) {
  const [selectedRole, setSelectedRole] = useState<DemoRole>(null);

  return (
    <DemoRoleContext.Provider
      value={{
        selectedRole,
        setSelectedRole,
        clearSelectedRole: () => setSelectedRole(null),
      }}>
      {children}
    </DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);

  if (!context) {
    throw new Error('useDemoRole must be used within a DemoRoleProvider.');
  }

  return context;
}
