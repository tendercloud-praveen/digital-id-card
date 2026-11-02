import { useContext } from 'react';
import { MyCardContext } from '@/lib/myCardContext';

export function useMyCard() {
  const value = useContext(MyCardContext);
  if (!value) throw new Error('useMyCard must be used inside <MyCardProvider>');
  return value;
}
