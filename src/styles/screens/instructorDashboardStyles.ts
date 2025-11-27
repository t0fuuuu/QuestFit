import { StyleSheet } from 'react-native';

export const instructorDashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  selectButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    margin: 20,
    marginTop: 0,
    color: '#000000',
    fontSize: 16,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userItem: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userItemSelected: {
    backgroundColor: '#FFE8E0',
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  userNameText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  userIdSubText: {
    color: '#666',
    fontSize: 12,
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
  },
  overviewsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userCardName: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userCardId: {
    color: '#666',
    fontSize: 12,
  },
  lastSync: {
    color: '#666',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  statSubValue: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  noData: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  viewDetails: {
    color: '#FF6B35',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
  },
});
