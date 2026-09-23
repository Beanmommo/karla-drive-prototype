import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { getDemoAccountId, supabase } from '../../lib/supabase';
import type { Learner, LearnerDraft } from './model';
import { createLearner, listLearners, readCachedLearners, readSelectedLearnerId, saveSelectedLearnerId } from './repository';
import { resolveSelectedLearnerId } from './selection';

type LearnersContextValue = {
  learners: Learner[];
  selectedLearner: Learner | null;
  selectLearner: (id: string) => void;
  loading: boolean;
  offline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addLearner: (id: string, draft: LearnerDraft) => Promise<void>;
};

type LearnerState = {
  accountId: string | null;
  learners: Learner[];
  selectedId: string | null;
  hydrated: boolean;
};
const emptyState: LearnerState = { accountId: null, learners: [], selectedId: null, hydrated: false };
const LearnersContext = createContext<LearnersContextValue | null>(null);

export function LearnersProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LearnerState>(emptyState);
  const current = useRef(data);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestState = useRef({ version: 0 });

  const updateData = useCallback((next: LearnerState) => {
    current.current = next;
    setData(next);
  }, []);

  const load = useCallback(async () => {
    const version = ++requestState.current.version;
    try {
      const accountId = await getDemoAccountId();
      if (version !== requestState.current.version) return;
      if (current.current.accountId !== accountId) {
        updateData({ ...emptyState, accountId });
        setOffline(false);
        setError(null);
      }
      if (!current.current.hydrated) {
        const [cached, savedId] = await Promise.all([
          readCachedLearners(accountId).catch(() => []),
          readSelectedLearnerId(accountId),
        ]);
        if (version !== requestState.current.version) return;
        updateData({
          accountId, learners: cached,
          // Keep a remembered ID even if an older cache does not contain it yet.
          selectedId: savedId ?? resolveSelectedLearnerId(cached, null),
          hydrated: true,
        });
        if (cached.length) setLoading(false);
      }
      const result = await listLearners(accountId);
      if (version !== requestState.current.version) return;
      // Read the current selection after the fetch so a switch made while refreshing wins.
      const selectedId = resolveSelectedLearnerId(result.learners, current.current.selectedId);
      updateData({ accountId, learners: result.learners, selectedId, hydrated: true });
      setOffline(result.offline);
      setError(null);
      void saveSelectedLearnerId(accountId, selectedId).catch(() => {});
    } catch {
      if (version === requestState.current.version) setError('Could not load your learners. Please try again.');
    } finally {
      if (version === requestState.current.version) setLoading(false);
    }
  }, [updateData]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    const requests = requestState.current;
    let authRefresh: ReturnType<typeof setTimeout> | undefined;
    const authListener = supabase?.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
      if ((session?.user.id ?? null) === current.current.accountId) return;
      requests.version++;
      updateData(emptyState);
      setOffline(false);
      setError(null);
      setLoading(!!session);
      clearTimeout(authRefresh);
      // Run outside the auth callback to avoid taking Supabase's session lock twice.
      if (session) authRefresh = setTimeout(() => { void load(); }, 0);
    });
    const initialLoad = setTimeout(() => { void load(); }, 0);
    if (AppState.currentState === 'active') supabase?.auth.startAutoRefresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        void refresh();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      requests.version++;
      clearTimeout(initialLoad);
      clearTimeout(authRefresh);
      authListener?.data.subscription.unsubscribe();
      listener.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, [load, refresh, updateData]);

  const selectLearner = useCallback((id: string) => {
    const snapshot = current.current;
    if (!snapshot.accountId || !snapshot.learners.some((learner) => learner.id === id)) return;
    updateData({ ...snapshot, selectedId: id });
    void saveSelectedLearnerId(snapshot.accountId, id).catch(() => {});
  }, [updateData]);

  const addLearner = useCallback(async (id: string, draft: LearnerDraft) => {
    const learner = await createLearner(id, draft);
    if (current.current.accountId !== learner.account_id) return;
    requestState.current.version++; // An older fetch must not overwrite a newly created learner.
    updateData({
      ...current.current,
      learners: [learner, ...current.current.learners.filter((item) => item.id !== learner.id)],
      selectedId: learner.id,
      hydrated: true,
    });
    setLoading(false);
    setError(null);
    setOffline(false);
    await saveSelectedLearnerId(learner.account_id, learner.id).catch(() => {});
  }, [updateData]);

  const value = useMemo(() => ({
    learners: data.learners,
    selectedLearner: data.learners.find((learner) => learner.id === data.selectedId) ?? data.learners[0] ?? null,
    selectLearner, loading, offline, error, refresh, addLearner,
  }), [data, selectLearner, loading, offline, error, refresh, addLearner]);

  return <LearnersContext.Provider value={value}>{children}</LearnersContext.Provider>;
}

export function useLearners() {
  const context = useContext(LearnersContext);
  if (!context) throw new Error('useLearners must be used within LearnersProvider');
  return context;
}
