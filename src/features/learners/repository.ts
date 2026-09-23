import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDemoAccountId, supabase } from '../../lib/supabase';
import { AGREEMENT_VERSION, REQUIREMENTS_VERSION, validateLearner, type Learner, type LearnerDraft } from './model';

const cacheKey = (accountId: string) => `karla:learners:v1:${accountId}`;
const selectionKey = (accountId: string) => `karla:selected-learner:v1:${accountId}`;
let selectionWrite = Promise.resolve();

export async function readCachedLearners(accountId: string): Promise<Learner[]> {
  const value = await AsyncStorage.getItem(cacheKey(accountId));
  if (!value) return [];
  const records: unknown = JSON.parse(value);
  if (!Array.isArray(records) || records.some((item) =>
    !item || item.account_id !== accountId || typeof item.id !== 'string'
    || typeof item.name !== 'string' || typeof item.date_of_birth !== 'string')) {
    throw new Error('Saved learner data could not be read.');
  }
  return records as Learner[];
}

export function readSelectedLearnerId(accountId: string): Promise<string | null> {
  return AsyncStorage.getItem(selectionKey(accountId)).catch(() => null);
}

export function saveSelectedLearnerId(accountId: string, learnerId: string | null): Promise<void> {
  // Keep rapid switches in order, even if an earlier storage write is slow or fails.
  const write = selectionWrite.then(() => learnerId
    ? AsyncStorage.setItem(selectionKey(accountId), learnerId)
    : AsyncStorage.removeItem(selectionKey(accountId)));
  selectionWrite = write.catch(() => {});
  return write;
}

export async function listLearners(accountId: string): Promise<{ learners: Learner[]; offline: boolean }> {
  if (!supabase) return { learners: await readCachedLearners(accountId), offline: false };
  const { data, error } = await supabase.from('learners').select('*')
    .eq('account_id', accountId).order('created_at', { ascending: false });
  if (error) {
    const cached = await readCachedLearners(accountId);
    if (cached.length) return { learners: cached, offline: true };
    throw new Error('Could not load your learners. Check your connection and try again.');
  }
  const learners = data as Learner[];
  // A cache failure must not turn a successful server read into an error.
  await AsyncStorage.setItem(cacheKey(accountId), JSON.stringify(learners)).catch(() => {});
  return { learners, offline: false };
}

export async function createLearner(id: string, draft: LearnerDraft): Promise<Learner> {
  const validation = validateLearner(draft);
  if (validation) throw new Error(validation);
  const accountId = await getDemoAccountId();
  const payload = {
    id, account_id: accountId, name: draft.name.trim(), date_of_birth: draft.dateOfBirth,
    country: 'AU' as const, state: 'VIC' as const, acknowledgements: { permit: draft.acknowledgements.permit },
    requirements_version: REQUIREMENTS_VERSION, agreement_version: AGREEMENT_VERSION,
  };
  let learner: Learner;
  if (supabase) {
    const { data, error } = await supabase.from('learners').insert(payload).select().single();
    if (error) {
      // The first request may have committed even if the response was lost.
      if (error.code !== '23505') throw new Error('Could not save your learner. Check your connection and try again.');
      const existing = await supabase.from('learners').select('*').eq('id', id).single();
      if (existing.error) throw new Error('Could not confirm the saved learner. Please try again.');
      learner = existing.data as Learner;
    } else {
      learner = data as Learner;
    }
  } else {
    const now = new Date().toISOString();
    learner = { ...payload, accepted_at: now, created_at: now };
  }
  const saveCache = async () => {
    const previous = await readCachedLearners(accountId);
    await AsyncStorage.setItem(cacheKey(accountId), JSON.stringify([
      learner, ...previous.filter((item) => item.id !== learner.id),
    ]));
  };
  if (supabase) await saveCache().catch(() => {});
  else await saveCache(); // In local mode, persistence must succeed before showing success.
  return learner;
}
