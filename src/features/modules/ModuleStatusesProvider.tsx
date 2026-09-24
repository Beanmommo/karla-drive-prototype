import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { supabase } from '../../lib/supabase';
import type { Learner } from '../learners/model';
import { assessmentStatuses, getLearnerModules, getModuleSummary, type ModuleAssessment, type ModuleId, type ModuleStatus } from './model';
import { cacheAssessments, listAssessments, readCachedAssessments, saveAssessment } from './repository';
import { overlayPracticeReviews } from '../practice/sync';

type State = { records: ModuleAssessment[]; loaded: boolean; loading: boolean; saving: boolean; error: string | null };
const initial: State = { records: [], loaded: false, loading: false, saving: false, error: null };
const keyFor = (learner: Pick<Learner, 'id' | 'account_id'>) => `${learner.account_id}:${learner.id}`;
const Context = createContext<{
  states: Record<string, State>;
  load: (learner: Pick<Learner, 'id' | 'account_id'>) => Promise<void>;
  save: (learner: Pick<Learner, 'id' | 'account_id'>, moduleId: ModuleId, status: ModuleStatus) => Promise<void>;
} | null>(null);

export function ModuleStatusesProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, State>>({});
  const current = useRef(states);
  const versions = useRef<Record<string, number>>({});
  const update = useCallback((key: string, patch: Partial<State>) => {
    current.current = { ...current.current, [key]: { ...(current.current[key] ?? initial), ...patch } };
    setStates(current.current);
  }, []);

  const load = useCallback(async (learner: Pick<Learner, 'id' | 'account_id'>) => {
    const key = keyFor(learner);
    if (current.current[key]?.loading || current.current[key]?.saving) return;
    const version = versions.current[key] = (versions.current[key] ?? 0) + 1;
    const isCurrent = () => versions.current[key] === version;
    update(key, { loading: true, error: null });
    if (!current.current[key].loaded) {
      const records = await readCachedAssessments(learner);
      if (records && isCurrent()) update(key, { records, loaded: true });
    }
    try {
      const records = await listAssessments(learner);
      if (isCurrent()) {
        update(key, { records, loaded: true });
        await cacheAssessments(learner, records).catch(() => {});
      }
    } catch (error) {
      const records = await overlayPracticeReviews(learner.account_id, learner.id, current.current[key]?.records ?? []).catch(() => current.current[key]?.records ?? []);
      if (isCurrent()) update(key, { records, error: error instanceof Error ? error.message : 'Could not load module statuses.' });
    } finally {
      if (isCurrent()) update(key, { loading: false });
    }
  }, [update]);

  const save = useCallback(async (learner: Pick<Learner, 'id' | 'account_id'>, moduleId: ModuleId, status: ModuleStatus) => {
    const key = keyFor(learner);
    if (current.current[key]?.saving) throw new Error('A status is already being saved.');
    // Invalidate older reads so a slow refresh cannot overwrite a saved assessment.
    versions.current[key] = (versions.current[key] ?? 0) + 1;
    update(key, { saving: true, loading: false });
    try {
      const record = await saveAssessment(learner, moduleId, status);
      const records = [...current.current[key].records.filter((item) => item.module_id !== moduleId), record];
      const write = cacheAssessments(learner, records);
      if (supabase) await write.catch(() => {});
      else await write;
      update(key, { records, error: null });
    } finally { update(key, { saving: false }); }
  }, [update]);

  return <Context.Provider value={{ states, load, save }}>{children}</Context.Provider>;
}

export function useLearnerModules(learner: Learner | undefined) {
  const context = useContext(Context);
  if (!context) throw new Error('ModuleStatusesProvider is missing.');
  const { load, save } = context;
  const learnerId = learner?.id;
  const accountId = learner?.account_id;
  // Screens may share the same learner; load deduplicates overlapping requests.
  useFocusEffect(useCallback(() => {
    if (!learnerId || !accountId) return;
    const timer = setTimeout(() => void load({ id: learnerId, account_id: accountId }), 0);
    return () => clearTimeout(timer);
  }, [load, learnerId, accountId]));
  const state = learner ? (context.states[keyFor(learner)] ?? initial) : initial;
  const modules = learner ? getLearnerModules(learner.id, assessmentStatuses(state.records)) : [];
  return {
    ...state, modules, summary: getModuleSummary(modules),
    refresh: () => learner ? load(learner) : Promise.resolve(),
    save: (moduleId: ModuleId, status: ModuleStatus) => learner
      ? save(learner, moduleId, status) : Promise.reject(new Error('Learner unavailable.')),
  };
}
