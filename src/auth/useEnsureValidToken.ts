import { useContext } from 'react';
import { AuthContext } from './context';

/**
 * Hook to access the ensureValidToken function from the auth context
 * This is used in api.ts to validate tokens before making authenticated requests
 */
export const useEnsureValidToken = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useEnsureValidToken must be used within an AuthProvider');
  }
  return context.ensureValidToken;
};

