import { createContext, useContext } from 'react';

interface FunnelEducationalContextType {
  educationalMode: boolean;
}

export const FunnelEducationalContext = createContext<FunnelEducationalContextType>({
  educationalMode: false,
});

export const useFunnelEducationalMode = () => useContext(FunnelEducationalContext);
