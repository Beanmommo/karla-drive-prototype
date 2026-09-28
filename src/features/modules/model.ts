export type ModuleStatus = 'not_performed' | 'needs_practice' | 'developing' | 'excellent';

// Preserve stored status keys so existing assessments and offline reviews keep their meaning.
export type ModuleRating = 0 | 1 | 2 | 3;
export const ratingStatuses = ['not_performed', 'needs_practice', 'developing', 'excellent'] as const;
export const moduleStatusLabels: Record<ModuleStatus, string> = {
  not_performed: '0 stars', needs_practice: '1 star', developing: '2 stars', excellent: '3 stars',
};
export const ratingDescriptions: Record<ModuleRating, string> = {
  0: 'Not yet practised', 1: 'Learning', 2: 'Building consistency', 3: 'Consistent',
};
export function getModuleRating(status: ModuleStatus): ModuleRating {
  return ratingStatuses.indexOf(status) as ModuleRating;
}
export const moduleStages = [
  { id: 1, title: 'Car control', description: 'Build the basics in quiet places, with plenty of guidance.',
    supervisor: 'Give clear guidance and plenty of support. Help your learner notice hazards as they build control.' },
  { id: 2, title: 'Basic drives', description: 'Bring skills together on quiet roads and simple journeys.',
    supervisor: 'Plan familiar routes and give frequent support as your learner combines their skills in light traffic.' },
  { id: 3, title: 'Complex drives', description: 'Build experience in busier traffic and different conditions.',
    supervisor: 'Gradually reduce prompts. Revisit turns, intersections, roundabouts, speed, space and hazards in more demanding situations.' },
  { id: 4, title: 'Rehearsing solo', description: 'Let your learner lead everyday drives, with you beside them.',
    supervisor: 'Let your learner plan and make decisions with minimal prompting. Stay ready to support them and reflect together afterwards.' },
] as const;
export type ModuleStageId = (typeof moduleStages)[number]['id'];
export function getModuleStage(id: string | undefined) {
  return moduleStages.find(stage => String(stage.id) === id);
}

// Stable catalogue order. These are learning goals, not prescribed lessons.
export const moduleCatalogue = [
  {
    id: 'car_control', stage: 1, title: 'Starting, steering & stopping',
    description: 'Build confidence with the basic controls and bring each movement together smoothly.',
    focus: ['Moving off with control', 'Steering accurately', 'Bringing the car to a controlled stop'],
  },
  {
    id: 'observation', stage: 1, title: 'Mirrors & awareness',
    description: 'Develop a clear picture of what is happening ahead, behind and beside the car.',
    focus: ['Checking mirrors', 'Checking blind spots', 'Noticing other road users'],
  },
  {
    id: 'signals', stage: 1, title: 'Communicating intentions',
    description: 'Help other road users understand what you intend to do.',
    focus: ['Using indicators', 'Giving clear and timely signals', 'Checking that signals have cancelled'],
  },
  {
    id: 'hill_starts', stage: 1, title: 'Starting on a slope',
    description: 'Practise controlled starts and stops on a suitable slope chosen by your supervisor.',
    focus: ['Holding the car stationary', 'Moving off with control', 'Managing the car on a slope'],
  },
  {
    id: 'reversing', stage: 1, title: 'Basic reversing',
    description: 'Build control reversing in a straight line and around curves before practising parking manoeuvres.',
    focus: ['Checking around the car before and during movement', 'Reversing slowly in a straight line', 'Following a curved path with control'],
  },
  {
    id: 'hazards', stage: 1, title: 'Spotting & responding to hazards',
    description: 'Learn to notice developing risks and discuss them with your supervisor when it is appropriate.',
    focus: ['Scanning for developing risks', 'Anticipating other road users', 'Responding to changing situations'],
  },
  {
    id: 'turns', stage: 2, title: 'Left & right turns',
    description: 'Practise approaching and completing left and right turns on a route agreed with your supervisor.',
    focus: ['Preparing for a turn', 'Observing and signalling', 'Controlling speed and position through the turn'],
  },
  {
    id: 'intersections', stage: 2, title: 'Intersections & stopping',
    description: 'Build confidence reading intersections and responding to signs, lights and other road users.',
    focus: ['Recognising intersection controls', 'Approaching and stopping with control', 'Observing traffic before proceeding'],
  },
  {
    id: 'roundabouts', stage: 2, title: 'Roundabouts',
    description: 'Practise approaching, travelling through and leaving roundabouts with your supervisor.',
    focus: ['Planning the approach', 'Observing traffic and giving way', 'Following the intended exit'],
  },
  {
    id: 'speed', stage: 2, title: 'Speed & lane position',
    description: 'Build awareness of speed, road position and how both need to suit the conditions.',
    focus: ['Recognising posted speed limits', 'Adjusting speed to conditions', 'Maintaining an appropriate lane position'],
  },
  {
    id: 'following', stage: 2, title: 'Space around the car',
    description: 'Develop awareness of the space available around the car and how it changes as you drive.',
    focus: ['Maintaining space ahead', 'Noticing space beside the car', 'Adjusting to changing conditions'],
  },
  {
    id: 'parking', stage: 2, title: 'Reverse parallel parking',
    description: 'Practise the manoeuvre in a suitable space identified by your supervisor.',
    focus: ['Preparing and observing', 'Controlling low-speed movement', 'Positioning the car within the space'],
  },
  {
    id: 'three_point_turn', stage: 2, title: 'Three-point turns',
    description: 'Practise turning the car around in a suitable place selected by your supervisor.',
    focus: ['Observing before each movement', 'Controlling forward and reverse movement', 'Completing the manoeuvre with care'],
  },
  {
    id: 'lane_changes', stage: 3, title: 'Changing lanes',
    description: 'Practise lane changes at suitable opportunities agreed with your supervisor.',
    focus: ['Checking mirrors and blind spots', 'Signalling and judging the opportunity', 'Moving between lanes with control'],
  },
  {
    id: 'merging', stage: 3, title: 'Gaps & merging',
    description: 'Practise observing traffic and judging opportunities to join another stream of vehicles.',
    focus: ['Observing approaching traffic', 'Judging an appropriate gap', 'Joining traffic smoothly'],
  },
  {
    id: 'conditions', stage: 3, title: 'Different roads & conditions',
    description: 'Build experience gradually across different roads, weather and light, with your supervisor’s support.',
    focus: ['Experiencing different road types', 'Driving in varied light and weather', 'Adapting to the surroundings'],
  },
  {
    id: 'independent', stage: 4, title: 'Everyday drives with less prompting',
    description: 'Bring your skills together on an agreed journey with less prompting from your supervisor.',
    focus: ['Planning a familiar journey', 'Following the agreed route', 'Making decisions with less prompting'],
  },
  {
    id: 'attention', stage: 4, title: 'Managing attention & driving decisions',
    description: 'Take responsibility for staying focused and recognising when to pause or postpone a drive.',
    focus: ['Recognising overload and asking for support', 'Managing passenger and navigation distractions', 'Choosing when to take a break or drive another time'],
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
  return { stars: modules.reduce((sum, module) => sum + getModuleRating(module.status), 0), maxStars: modules.length * 3, total: modules.length };
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
