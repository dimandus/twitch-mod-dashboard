// Константы для Sidebar

export const KNOWN_BOTS = new Set([
  'nightbot',
  'moobot',
  'streamelements',
  'fossabot',
  'deepbot',
  'phantombot',
  'streamlabs',
  'stay_hydrated_bot',
  'commanderroot',
  'wizebot'
]);

export type ViewerRole =
  | 'broadcaster'
  | 'moderator'
  | 'vip'
  | 'staff'
  | 'admin'
  | 'global_mod'
  | 'viewer';

export const roleOrder: ViewerRole[] = [
  'broadcaster',
  'moderator',
  'vip',
  'staff',
  'admin',
  'global_mod',
  'viewer'
];
