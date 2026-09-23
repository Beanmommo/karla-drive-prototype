// Reserved for the practice-session start flow; these are confirmed per drive,
// not when creating a learner profile. No session-start UI exists yet.
export const practiceRequirements = [
  { id: 'plates', title: 'L plates on every drive', description: 'L plates will be clearly visible at the front and rear of the car.' },
  { id: 'supervision', title: 'A licensed supervisor beside them', description: 'A supervisor with a current full licence for the vehicle will sit in the front passenger seat, carry their licence and meet their licence and alcohol conditions.' },
  { id: 'safe_driving', title: 'Zero alcohol and safe driving', description: 'The learner will have zero blood alcohol, be fit to drive, and follow their permit conditions and Victorian road rules.' },
  { id: 'devices', title: 'Device restrictions and no towing', description: 'The learner will follow Victoria’s learner device restrictions, including no portable-device use while driving, and will not tow a trailer or another vehicle.' },
] as const;
