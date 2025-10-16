import { useContext } from 'react';
import { TestAuthContext } from './TestAuthContext';

export function useTestAuth() {
  const context = useContext(TestAuthContext);
  if (context === undefined) {
    throw new Error('useTestAuth must be used within a TestAuthProvider');
  }
  return context;
}
