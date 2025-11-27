import { StyleSheet } from 'react-native';
import { Creature } from '@/src/types/polar';

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


export const creatureCardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  rarity: {
    fontSize: 12,
    fontWeight: '600',
  },
  sportBadge: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  capturedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  capturedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  border: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  desc: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    margin: 8,
    borderWidth: 2,
    shadowColor: '#1F2937',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
