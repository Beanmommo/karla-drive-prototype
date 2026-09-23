import CarFront from 'lucide-react-native/icons/car-front';
import House from 'lucide-react-native/icons/house';
import Play from 'lucide-react-native/icons/play';
import UserRound from 'lucide-react-native/icons/user-round';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import MapPin from 'lucide-react-native/icons/map-pin';
import Plus from 'lucide-react-native/icons/plus';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import type { ColorValue } from 'react-native';

import { colors } from '../theme';

// Import individual icons so Metro only bundles the Lucide icons we use.
const icons = {
  home: House, car: CarFront, play: Play, user: UserRound, back: ArrowLeft,
  chevronDown: ChevronDown, calendar: CalendarDays, location: MapPin,
  plus: Plus, shield: ShieldCheck, close: X, check: Check,
};

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
