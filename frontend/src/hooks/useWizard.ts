import { useContext } from 'react';
import { WizardContext } from '@/lib/wizardContext';

export function useWizard() {
  const value = useContext(WizardContext);
  if (!value) throw new Error('useWizard must be used inside <WizardProvider>');
  return value;
}
