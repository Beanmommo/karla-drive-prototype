export const AGREEMENT_VERSION = 'demo-v1';
export const REQUIREMENTS_VERSION = 'vic-learner-2026-09-23-v2';
export const VICTORIA_RULES_URL =
  'https://transport.vic.gov.au/road-and-active-transport/road-rules-and-safety/learner-and-probationary-driver-road-rules';

// Profile confirmation only. Driving checks belong to individual practice sessions.
export const learnerRequirements = [
  { id: 'permit', title: 'A valid learner permit', description: 'The learner holds a current car learner permit.' },
] as const;

export type RequirementId = (typeof learnerRequirements)[number]['id'];
export type Acknowledgements = Record<RequirementId, boolean>;

export const emptyAcknowledgements = (): Acknowledgements => ({
  permit: false,
});

export type LearnerDraft = {
  name: string;
  dateOfBirth: string;
  country: string;
  state: string;
  acknowledgements: Acknowledgements;
  termsAccepted: boolean;
};

export type Learner = {
  id: string;
  account_id: string;
  name: string;
  date_of_birth: string;
  country: 'AU';
  state: 'VIC';
  acknowledgements: Acknowledgements;
  requirements_version: string;
  agreement_version: string;
  accepted_at: string;
  created_at: string;
};

// Birth dates are calendar dates, never UTC timestamps (which can shift the day).
export function dateToISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return dateToISO(date) === value ? date : null;
}

export function getAge(value: string, today = new Date()): number {
  const date = parseBirthDate(value);
  if (!date) return -1;
  const birthdayPending = today.getMonth() < date.getMonth()
    || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  return today.getFullYear() - date.getFullYear() - Number(birthdayPending);
}

export function formatBirthDate(value: string): string {
  return parseBirthDate(value)?.toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) ?? value;
}

export function validateLearner(draft: LearnerDraft, today = new Date()): string | null {
  if (draft.country !== 'AU' || draft.state !== 'VIC') return 'Select Australia and Victoria to continue.';
  if (!draft.name.trim()) return 'Enter the learner’s name.';
  if (draft.name.trim().length > 100) return 'Use a name with 100 characters or fewer.';
  if (!parseBirthDate(draft.dateOfBirth)) return 'Enter a valid date of birth.';
  if (draft.dateOfBirth > dateToISO(today)) return 'Date of birth cannot be in the future.';
  if (getAge(draft.dateOfBirth, today) < 16) return 'Victorian car learners must be at least 16 years old.';
  if (!learnerRequirements.every(({ id }) => draft.acknowledgements[id] === true)) {
    return 'Confirm the learner holds a valid learner permit.';
  }
  if (!draft.termsAccepted) return 'Agree to the demo terms to create a learner.';
  return null;
}
