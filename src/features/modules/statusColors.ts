import { colors } from '../../theme';
import type { ModuleStatus } from './model';

export const moduleStatusColors = {
  not_performed: { backgroundColor: colors.neutralSoft, color: colors.muted },
  needs_practice: { backgroundColor: '#FFF0D9', color: '#81511A' },
  excellent: { backgroundColor: '#E5F5EB', color: '#286344' },
} satisfies Record<ModuleStatus, { backgroundColor: string; color: string }>;
