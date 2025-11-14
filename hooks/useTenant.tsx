"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
  useMemo,
} from "react";

type TenantContextValue = {
  tenantSlug: string | null;
};

const TenantContext = createContext<TenantContextValue>({
  tenantSlug: null,
});

export function TenantProvider({
  tenantSlug,
  children,
}: PropsWithChildren<{ tenantSlug: string | null }>) {
  const value = useMemo(() => ({ tenantSlug }), [tenantSlug]);

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
