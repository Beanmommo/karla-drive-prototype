// Confirmed by the supervisor for each drive. Keep IDs stable for saved sessions.
export const practiceRequirements = [
  { id: 'plates', title: 'I’ve checked the car is safe and L plates are displayed front and rear.' },
  { id: 'supervision', title: 'I have my full licence with me and am sober and fit to supervise beside the learner.' },
  { id: 'safe_driving', title: 'I’ve checked the learner has their permit, has had no alcohol and is fit to drive.' },
  { id: 'devices', title: 'I’ve checked seatbelts, device restrictions and that we’re not towing.' },
] as const;
