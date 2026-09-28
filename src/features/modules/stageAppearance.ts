import type { ComponentProps } from 'react';

import type { AppIcon } from '../../components/AppIcon';
import type { ModuleStageId } from './model';

export const stageAppearance = {
  1: { icon: 'car', color: '#E4F4FE' },
  2: { icon: 'route', color: '#E5F5EB' },
  3: { icon: 'location', color: '#F0E9FC' },
  4: { icon: 'shield', color: '#FFF0DC' },
} as const satisfies Record<ModuleStageId, { icon: ComponentProps<typeof AppIcon>['name']; color: string }>;
