import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDemoAccountId, supabase } from '../../lib/supabase';
import type { Learner } from '../learners/model';
import { parseAssessments, type ModuleAssessment, type ModuleId, type ModuleStatus } from './model';
import { overlayPracticeReviews } from '../practice/sync';

const cacheKey = (learner: Pick<Learner, 'id' | 'account_id'>) => `karla:module-statuses:v1:${learner.account_id}:${learner.id}`;
let cacheWrite = Promise.resolve();

export async function readCachedAssessments(learner: Pick<Learner, 'id' | 'account_id'>): Promise<ModuleAssessment[] | null> {
  try {
    const value = await AsyncStorage.getItem(cacheKey(learner));
    return value === null ? null : await overlayPracticeReviews(learner.account_id, learner.id, parseAssessments(JSON.parse(value), learner.account_id, learner.id));
  } catch { return null; }
}

export function cacheAssessments(learner: Pick<Learner, 'id' | 'account_id'>, records: ModuleAssessment[]): Promise<void> {
  const write = cacheWrite.then(() => AsyncStorage.setItem(cacheKey(learner), JSON.stringify(records)));
  cacheWrite = write.catch(() => {});
  return write;
}

export async function listAssessments(learner: Pick<Learner, 'id' | 'account_id'>): Promise<ModuleAssessment[]> {
  if (!supabase) return overlayPracticeReviews(learner.account_id, learner.id, (await readCachedAssessments(learner)) ?? []);
  const { data, error } = await supabase.from('learner_module_statuses')
    .select('account_id,learner_id,module_id,status,updated_at')
    .eq('account_id', learner.account_id).eq('learner_id', learner.id);
  if (error) throw new Error('Could not refresh module statuses. Check your connection and try again.');
  return overlayPracticeReviews(learner.account_id, learner.id, parseAssessments(data, learner.account_id, learner.id));
}

export async function saveAssessment(learner: Pick<Learner, 'id' | 'account_id'>, moduleId: ModuleId, status: ModuleStatus): Promise<ModuleAssessment> {
  if (await getDemoAccountId() !== learner.account_id) throw new Error('Your account changed. Return to Home and try again.');
  if (!supabase) return {
    account_id: learner.account_id, learner_id: learner.id, module_id: moduleId, status, updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.rpc('set_learner_module_status', {
    p_learner_id: learner.id, p_module_id: moduleId, p_status: status,
  }).single();
  if (error) throw new Error('Could not save this status. Check your connection and try again.');
  return parseAssessments([data], learner.account_id, learner.id)[0];
}
