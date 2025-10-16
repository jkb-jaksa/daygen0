import { useContext } from 'react';
import { SupabaseAuthContext } from './SupabaseAuthContext';

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
