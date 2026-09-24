import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const COMPLETED_KEY = 'karla:tutorial-completed:v1';

type TutorialContextValue = {
  completed: boolean;
  loading: boolean;
  completing: boolean;
  complete: () => Promise<void>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(COMPLETED_KEY)
      .then(value => { if (active) setCompleted(value === 'true'); })
      .catch(() => { /* Show the introduction if the saved preference cannot be read. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const complete = useCallback(async () => {
    setCompleting(true);
    try {
      await AsyncStorage.setItem(COMPLETED_KEY, 'true');
    } catch {
      // Keep the demo accessible even when device storage is unavailable.
      console.warn('Could not save tutorial completion; it may appear again next launch.');
    } finally {
      setCompleted(true);
      setCompleting(false);
    }
  }, []);

  const value = useMemo(() => ({ completed, loading, completing, complete }), [completed, loading, completing, complete]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within TutorialProvider');
  return context;
}
