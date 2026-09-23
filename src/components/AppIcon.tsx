import CarFront from 'lucide-react-native/icons/car-front';
import House from 'lucide-react-native/icons/house';
import Play from 'lucide-react-native/icons/play';
import UserRound from 'lucide-react-native/icons/user-round';
import type { ColorValue } from 'react-native';

import { colors } from '../theme';

// Import individual icons so Metro only bundles the Lucide icons we use.
const icons = { home: House, car: CarFront, play: Play, user: UserRound };

type AppIconProps = {
  name: keyof typeof icons;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

export function AppIcon({ name, size = 24, color = colors.ink, strokeWidth = 2 }: AppIconProps) {
  const Icon = icons[name];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
