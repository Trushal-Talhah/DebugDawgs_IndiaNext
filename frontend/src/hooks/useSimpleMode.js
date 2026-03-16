import { useState, useCallback, createContext, useContext, createElement } from 'react';

const SimpleModeContext = createContext(null);

export function SimpleModeProvider({ children }) {
  const [isSimple, setIsSimple] = useState(true);

  const toggle = useCallback(() => setIsSimple((prev) => !prev), []);

  return createElement(
    SimpleModeContext.Provider,
    { value: { isSimple, toggle } },
    children
  );
}

export function useSimpleMode() {
  const ctx = useContext(SimpleModeContext);
  if (!ctx) {
    throw new Error('useSimpleMode must be used within SimpleModeProvider');
  }
  return ctx;
}
