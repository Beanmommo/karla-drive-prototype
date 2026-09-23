import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { supabase } from '../../lib/supabase';
import type { Learner, LearnerDraft } from './model';
import { createLearner, listLearners } from './repository';

type LearnersContextValue = {
  learners: Learner[];
  loading: boolean;
  offline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addLearner: (id: string, draft: LearnerDraft) => Promise<void>;
};

const LearnersContext = createContext<LearnersContextValue | null>(null);

export function LearnersProvider({ children }: { children: ReactNode }) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestState = useRef({ version: 0 });

  const load = useCallback(() => {
    const version = ++requestState.current.version;
    return listLearners().then((result) => {
      if (version !== requestState.current.version) return;
      setLearners(result.learners);
      setOffline(result.offline);
      setError(null);
    }).catch(() => {
      if (version === requestState.current.version) setError('Could not load your learners. Please try again.');
    }).finally(() => {
      if (version === requestState.current.version) setLoading(false);
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    const requests = requestState.current;
    void load();
    if (AppState.currentState === 'active') supabase?.auth.startAutoRefresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        void refresh();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      requests.version++;
      listener.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, [load, refresh]);

  const addLearner = useCallback(async (id: string, draft: LearnerDraft) => {
    const learner = await createLearner(id, draft);
    requestState.current.version++; // An older Home fetch must not overwrite a newly created learner.
    setLoading(false);
    setError(null);
    setOffline(false);
    setLearners((previous) => [learner, ...previous.filter((item) => item.id !== learner.id)]);
  }, []);

  const value = useMemo(() => ({ learners, loading, offline, error, refresh, addLearner }),
    [learners, loading, offline, error, refresh, addLearner]);

  return <LearnersContext.Provider value={value}>{children}</LearnersContext.Provider>;
}

export function useLearners() {
  const context = useContext(LearnersContext);
  if (!context) throw new Error('useLearners must be used within LearnersProvider');
  return context;
}
