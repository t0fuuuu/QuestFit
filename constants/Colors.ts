import { Creature } from '@/src/types/polar';

export const black = '#1F2937';
export const white = '#FFFFFF';

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};

export const getRarityColor = (type: Creature['rarity']) => {
  switch (type) {
  case 'rare': return '#43C073';
  case 'epic': return '#8B5CF6';
  case 'legendary': return '#F59E0B';
  default: return '#3BA8F6';
  }
};

export const getSportColor = (type: Creature['sport']) => {
  switch (type) {
    case 'RUNNING': return ['#AE0000', '#FFFFFF'];
    case 'SWIMMING': return ['#53E8f6', '#1F2937'];
    case 'HIKING': return ['#13780E', '#FFFFFF'];
    case 'FITNESS': return ['#FB008A', '#FFFFFF'];
    case 'CYCLING': return ['#FFF42A', '#1F2937'];
    case 'CIRCUIT': return ['#BB00FF', '#FFFFFF'];
    default: return ['#676767', '#FFFFFF'];
  }
};
