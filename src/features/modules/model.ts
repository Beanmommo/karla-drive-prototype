export type ModuleStatus = 'not_performed' | 'needs_practice' | 'excellent';

export const moduleStatusLabels: Record<ModuleStatus, string> = {
  not_performed: 'Not performed',
  needs_practice: 'Need practice',
  excellent: 'Excellent',
};

// Stable catalogue order. These are learning goals, not prescribed lessons.
export const moduleCatalogue = [
  {
    id: 'car_control', title: 'Starting, steering & stopping',
    description: 'Build confidence with the basic controls and bring each movement together smoothly.',
    focus: ['Moving off with control', 'Steering accurately', 'Bringing the car to a controlled stop'],
  },
  {
    id: 'observation', title: 'Mirrors & awareness',
    description: 'Develop a clear picture of what is happening ahead, behind and beside the car.',
    focus: ['Checking mirrors', 'Checking blind spots', 'Noticing other road users'],
  },
  {
    id: 'signals', title: 'Communicating intentions',
    description: 'Help other road users understand what you intend to do.',
    focus: ['Using indicators', 'Giving clear and timely signals', 'Checking that signals have cancelled'],
  },
  {
    id: 'turns', title: 'Left & right turns',
    description: 'Practise approaching and completing left and right turns on a route agreed with your supervisor.',
    focus: ['Preparing for a turn', 'Observing and signalling', 'Controlling speed and position through the turn'],
  },
  {
    id: 'intersections', title: 'Intersections & stopping',
    description: 'Build confidence reading intersections and responding to signs, lights and other road users.',
    focus: ['Recognising intersection controls', 'Approaching and stopping with control', 'Observing traffic before proceeding'],
  },
  {
    id: 'roundabouts', title: 'Roundabouts',
    description: 'Practise approaching, travelling through and leaving roundabouts with your supervisor.',
    focus: ['Planning the approach', 'Observing traffic and giving way', 'Following the intended exit'],
  },
  {
    id: 'hill_starts', title: 'Starting on a slope',
    description: 'Practise controlled starts and stops on a suitable slope chosen by your supervisor.',
    focus: ['Holding the car stationary', 'Moving off with control', 'Managing the car on a slope'],
  },
  {
    id: 'parking', title: 'Reverse parallel parking',
    description: 'Practise the manoeuvre in a suitable space identified by your supervisor.',
    focus: ['Preparing and observing', 'Controlling low-speed movement', 'Positioning the car within the space'],
  },
  {
    id: 'three_point_turn', title: 'Three-point turns',
    description: 'Practise turning the car around in a suitable place selected by your supervisor.',
    focus: ['Observing before each movement', 'Controlling forward and reverse movement', 'Completing the manoeuvre with care'],
  },
  {
    id: 'speed', title: 'Speed & lane position',
    description: 'Build awareness of speed, road position and how both need to suit the conditions.',
    focus: ['Recognising posted speed limits', 'Adjusting speed to conditions', 'Maintaining an appropriate lane position'],
  },
  {
    id: 'following', title: 'Space around the car',
    description: 'Develop awareness of the space available around the car and how it changes as you drive.',
    focus: ['Maintaining space ahead', 'Noticing space beside the car', 'Adjusting to changing conditions'],
  },
  {
    id: 'lane_changes', title: 'Changing lanes',
    description: 'Practise lane changes at suitable opportunities agreed with your supervisor.',
    focus: ['Checking mirrors and blind spots', 'Signalling and judging the opportunity', 'Moving between lanes with control'],
  },
  {
    id: 'merging', title: 'Gaps & merging',
    description: 'Practise observing traffic and judging opportunities to join another stream of vehicles.',
    focus: ['Observing approaching traffic', 'Judging an appropriate gap', 'Joining traffic smoothly'],
  },
  {
    id: 'hazards', title: 'Spotting hazards',
    description: 'Learn to notice developing risks and discuss them with your supervisor when it is appropriate.',
    focus: ['Scanning for developing risks', 'Anticipating other road users', 'Responding to changing situations'],
  },
  {
    id: 'conditions', title: 'Different roads & conditions',
    description: 'Build experience gradually across different roads, weather and light, with your supervisor’s support.',
    focus: ['Experiencing different road types', 'Driving in varied light and weather', 'Adapting to the surroundings'],
  },
  {
    id: 'independent', title: 'Planning an everyday drive',
    description: 'Bring your skills together on an agreed journey with less prompting from your supervisor.',
    focus: ['Planning a familiar journey', 'Following the agreed route', 'Making decisions with less prompting'],
  },
] as const;

export type ModuleId = (typeof moduleCatalogue)[number]['id'];
export type LearningModule = (typeof moduleCatalogue)[number] & { coachingTip?: string };
export type LearnerModule = LearningModule & { learnerId: string; status: ModuleStatus };

export function getModuleCoachingTip(module: LearningModule) {
  return module.coachingTip?.trim() || null;
}

// Assessments are independent of practice records and GPS evidence.
export function getLearnerModules(
  learnerId: string,
  assessments: Readonly<Partial<Record<ModuleId, ModuleStatus>>> = {},
): LearnerModule[] {
  return moduleCatalogue.map((module) => ({
    ...module, learnerId, status: assessments[module.id] ?? 'not_performed',
  }));
}

export function getModuleSummary(modules: readonly LearnerModule[]) {
  return { excellent: modules.filter((module) => module.status === 'excellent').length, total: modules.length };
}

export type ModuleAssessment = {
  account_id: string;
  learner_id: string;
  module_id: ModuleId;
  status: ModuleStatus;
  updated_at: string;
};

export function parseAssessments(value: unknown, accountId: string, learnerId: string): ModuleAssessment[] {
  const seen = new Set<string>();
  if (!Array.isArray(value) || value.some((row) => {
    if (!row || row.account_id !== accountId || row.learner_id !== learnerId
      || !moduleCatalogue.some((module) => module.id === row.module_id)
      || !Object.hasOwn(moduleStatusLabels, row.status)
      || typeof row.updated_at !== 'string' || !Number.isFinite(Date.parse(row.updated_at))
      || seen.has(row.module_id)) return true;
    seen.add(row.module_id);
    return false;
  })) throw new Error('Saved module statuses could not be read.');
  return value as ModuleAssessment[];
}

export function assessmentStatuses(records: readonly ModuleAssessment[]): Partial<Record<ModuleId, ModuleStatus>> {
  return Object.fromEntries(records.map((record) => [record.module_id, record.status]));
}
