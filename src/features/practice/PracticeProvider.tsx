import * as Notifications from 'expo-notifications';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Platform } from 'react-native';

import { useLearners } from '../learners/LearnersProvider';
import type { PracticeSession, StoredSession } from './model';
import { hasPracticeAccess, requestPracticeAccess } from './permissions';
import { analyzeRecording, recoverPractice, stopPractice } from './runtime';
import { changeSession, getActiveSession, getSession, listSessions, subscribePractice } from './store';
import { syncPractice } from './sync';

const Context = createContext<{
  version: number; active: StoredSession | null; admitted: boolean; entering: boolean; enter: () => Promise<void>;
  saveReview: (id: string, review: PracticeSession['review']) => Promise<void>;
  sync: () => Promise<void>; syncError: string | null;
} | null>(null);

export function PracticeProvider({ children }: { children: ReactNode }) {
  const { learners, selectedLearner } = useLearners();
  const pathname = usePathname();
  const navigation = useRootNavigationState();
  const accountId = selectedLearner?.account_id;
  const [version, setVersion] = useState(0);
  const [active, setActive] = useState<StoredSession | null>(null);
  const [admitted, setAdmitted] = useState(false);
  const [entering, setEntering] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const enteringRef = useRef(false);
  const pendingSettings = useRef(false);
  useEffect(() => subscribePractice(() => setVersion(v => v + 1)), []);
  useEffect(() => {
    let mounted = true;
    void getActiveSession().then(row => {
      if (mounted) setActive(row && row.session.account_id === accountId ? row : null);
      if (row && accountId && row.session.account_id !== accountId) void stopPractice(row.session.id).catch(() => {});
    }).catch(() => { if (mounted) setSyncError('Practice storage could not be opened. Restart the app and try again.'); });
    return () => { mounted = false; };
  }, [version, accountId]);
  useEffect(() => {
    // Restore the dedicated screen after relaunches or links to another page.
    // Setup owns the handoff while startPractice is still starting native tracking.
    if (!navigation?.key || !active || pathname === '/practice/active' || pathname === '/practice/setup') return;
    let current = true;
    void getActiveSession().then(record => {
      // Re-read storage so a just-finished session cannot trap its results on exit.
      if (current && record && record.session.account_id === accountId) router.replace('/practice/active');
    }).catch(() => {});
    return () => { current = false; };
  }, [accountId, active, navigation?.key, pathname]);
  const sync = useCallback(async () => {
    if (!accountId) return;
    try { await syncPractice(accountId); setSyncError(null); }
    catch (error) { setSyncError(error instanceof Error ? error.message : 'Sync pending.'); }
  }, [accountId]);
  const maintenance = useCallback(async () => {
    if (!accountId) return;
    await recoverPractice().catch(() => {});
    const rows = await listSessions(accountId);
    const pending = rows.find(row => (row.session.metrics.lastPoint?.timestamp ?? 0) - row.session.matched_until > 15000);
    if (pending) await analyzeRecording(pending.session.id);
    await sync();
  }, [accountId, sync]);
  useEffect(() => {
    if (!accountId) return;
    const initial = setTimeout(() => { void maintenance().catch(() => {}); }, 0);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void maintenance().catch(() => {}); }, 30000);
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      void maintenance().catch(() => {});
      if (pendingSettings.current) {
        pendingSettings.current = false;
        void hasPracticeAccess().then(granted => {
          if (granted) { setAdmitted(true); router.navigate('/practice/setup'); }
        }).catch(() => {});
      }
    });
    return () => { clearTimeout(initial); clearInterval(timer); listener.remove(); };
  }, [accountId, maintenance]);
  const enter = useCallback(async () => {
    if (!learners.length || !selectedLearner || enteringRef.current) return;
    enteringRef.current = true; setEntering(true);
    try {
      const recording = await getActiveSession();
      if (recording?.session.account_id === selectedLearner.account_id) {
        setAdmitted(true); router.navigate('/practice/active'); return;
      }
      const permission = await requestPracticeAccess();
      pendingSettings.current = permission === 'settings';
      if (permission === 'granted') { setAdmitted(true); router.navigate('/practice/setup'); }
      else setAdmitted(false);
    } catch (error) {
      Alert.alert('Practice unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally { enteringRef.current = false; setEntering(false); }
  }, [learners.length, selectedLearner]);
  useEffect(() => {
    if (Platform.OS === 'web' || !accountId) return;
    const open = async (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.sessionId;
      if (typeof id !== 'string') return;
      const record = await getSession(id, accountId);
      if (!record) return;
      if (record.session.status === 'active') { setAdmitted(true); router.navigate('/practice/active'); }
      else router.push({ pathname: '/learners/[learnerId]/practice/[sessionId]', params: { learnerId: record.session.learner_id, sessionId: id } });
      await Notifications.clearLastNotificationResponseAsync();
    };
    const listener = Notifications.addNotificationResponseReceivedListener(response => { void open(response).catch(() => {}); });
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    return () => listener.remove();
  }, [accountId]);
  const saveReview = useCallback(async (id: string, review: PracticeSession['review']) => {
    if (!accountId) throw new Error('Select a learner first.');
    const record = await getSession(id, accountId);
    if (!record || record.session.status !== 'finished') throw new Error('This session is unavailable.');
    await changeSession(id, session => session.reviewed_at ? session : { ...session, review, reviewed_at: Date.now() });
    void sync();
  }, [accountId, sync]);
  return <Context.Provider value={{ version, active, admitted, entering, enter, saveReview, sync, syncError }}>{children}</Context.Provider>;
}
export function usePractice() {
  const value = useContext(Context);
  if (!value) throw new Error('PracticeProvider is missing.');
  return value;
}
