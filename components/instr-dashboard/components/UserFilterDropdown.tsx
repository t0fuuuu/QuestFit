import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import { Text } from '@/components/Themed';
import { User } from '../types';

interface UserFilterDropdownProps {
  allUsers: User[];
  selectedUserId: string; // "all" means all users, otherwise it's a user ID
  onFilterChange: (userId: string) => void;
}

export const UserFilterDropdown = ({
  allUsers,
  selectedUserId,
  onFilterChange,
}: UserFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const isAllSelected = selectedUserId === 'all';

  const handleAllPress = () => {
    onFilterChange('all');
    setIsOpen(false);
  };

  const handleUserPress = (userId: string) => {
    onFilterChange(userId);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (isAllSelected) {
      return 'All Users';
    }
    const user = allUsers.find(u => u.id === selectedUserId);
    return user?.displayName || selectedUserId;
  };

  return (
    <View style={{ marginBottom: 16, zIndex: 1000 }}>
      
      {/* Dropdown Button */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#E0E0E0',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 14, color: '#333' }}>
          {getDisplayText()}
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable 
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={() => setIsOpen(false)}
        >
          <Pressable 
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              width: '100%',
              maxWidth: 400,
              maxHeight: '70%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E0E0E0',
            }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                Select User
              </Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Text style={{ fontSize: 14, color: '#FF6B35', fontWeight: '600' }}>
                  Close
                </Text>
              </Pressable>
            </View>

            {/* Options List */}
            <ScrollView style={{ maxHeight: 400 }}>
              {/* All Option */}
              <Pressable
                onPress={handleAllPress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0F0',
                  backgroundColor: isAllSelected ? '#FFF5F0' : 'white',
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isAllSelected ? '#FF6B35' : '#CCC',
                    backgroundColor: isAllSelected ? '#FF6B35' : 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  {isAllSelected && (
                    <View style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: 5, 
                      backgroundColor: 'white' 
                    }} />
                  )}
                </View>
                <Text style={{ 
                  fontSize: 15, 
                  color: '#333', 
                  fontWeight: isAllSelected ? 'bold' : 'normal' 
                }}>
                  All Users
                </Text>
              </Pressable>

              {/* Individual Users */}
              {allUsers.map((user) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <Pressable
                    key={user.id}
                    onPress={() => handleUserPress(user.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F0F0F0',
                      backgroundColor: isSelected ? '#FFF5F0' : 'white',
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? '#FF6B35' : '#CCC',
                        backgroundColor: isSelected ? '#FF6B35' : 'white',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      {isSelected && (
                        <View style={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: 5, 
                          backgroundColor: 'white' 
                        }} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 15, 
                        color: '#333',
                        fontWeight: isSelected ? '600' : 'normal'
                      }}>
                        {user.displayName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {user.id}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};