import { ImageSourcePropType } from 'react-native';

export type BuddyType = 'hype' | 'soft' | 'savage';

export const BUDDY_STORAGE_KEY = 'glowgoal_selected_buddy';

export const buddyConfig: Record<
  BuddyType,
  {
    label: string;
    image: ImageSourcePropType;
    speech: string;
    nudgeTitle: string;
    nudgeBody: string;
    accent: string;
    chipBg: string;
    glow: string;
  }
> = {
  hype: {
    label: 'Hype Buddy',
    image: require('../assets/images/hype.png'),
    speech: 'You + tiny action = dangerous combo 🔥',
    nudgeTitle: 'Let’s gooo',
    nudgeBody: 'One tiny win first. Then we celebrate like it was a headline.',
    accent: '#FFD580',
    chipBg: '#FFE8BF',
    glow: 'rgba(255, 213, 128, 0.40)',
  },
  soft: {
    label: 'Soft Buddy',
    image: require('../assets/images/soft.png'),
    speech: 'We’re taking it one gentle step at a time 💙',
    nudgeTitle: 'Easy does it',
    nudgeBody: 'Pick the least stressful task. Small still counts.',
    accent: '#CFEAFF',
    chipBg: '#EAF6FF',
    glow: 'rgba(173, 223, 255, 0.38)',
  },
  savage: {
    label: 'Savage Buddy',
    image: require('../assets/images/savage.png'),
    speech: 'No vanishing act today. Open the task 😌',
    nudgeTitle: 'Be serious',
    nudgeBody: 'Not tomorrow. Not later. One small task now.',
    accent: '#D8BBFF',
    chipBg: '#F0E2FF',
    glow: 'rgba(199, 154, 255, 0.35)',
  },
};