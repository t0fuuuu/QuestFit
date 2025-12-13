import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { liveStyles as styles } from '@/src/styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/services/firebase';
import {
  addEmulationDevice,
  EmulationDevice,
  getEmulationDevices,
  removeEmulationDevice,
} from '@/src/services/emulationStorage';

function normalizeDeviceId(input: string) {
  return input.trim();
}

function normalizeUserId(input: string) {
  return input.trim();
}

export default function EmulateScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  const prefillDeviceId = useMemo(() => String(searchParams.device_id ?? ''), [searchParams.device_id]);
  const prefillUserId = useMemo(() => String(searchParams.user_id ?? ''), [searchParams.user_id]);

  const [devices, setDevices] = useState<EmulationDevice[]>([]);
  const [userId, setUserId] = useState(prefillUserId);
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string>('');
  const [resolvedDeviceId, setResolvedDeviceId] = useState<string>('');
  const [isResolvingUser, setIsResolvingUser] = useState(false);

  const refresh = async () => {
    const d = await getEmulationDevices();
    setDevices(d);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
      setResolvedDisplayName('');
      setResolvedDeviceId('');
      setIsResolvingUser(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsResolvingUser(true);
        const userDoc = await getDoc(doc(db, 'users', normalizedUserId));
        const data = userDoc.exists() ? (userDoc.data() as any) : undefined;
        const name = data?.displayName;
        const did = data?.deviceID ?? data?.deviceId;
        if (!cancelled) {
          setResolvedDisplayName(typeof name === 'string' ? name : '');
          setResolvedDeviceId(typeof did === 'string' ? did : '');
        }
      } catch (e) {
        console.error('Failed to fetch user displayName:', e);
        if (!cancelled) {
          setResolvedDisplayName('');
          setResolvedDeviceId('');
        }
      } finally {
        if (!cancelled) setIsResolvingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onAdd = async () => {
    const normalizedUserId = normalizeUserId(userId);

    if (!normalizedUserId) {
      Alert.alert('Missing user_id', 'user_id is required (linked to user)');
      return;
    }

    if (!resolvedDisplayName) {
      Alert.alert('Unknown user', 'Could not resolve displayName for this user_id');
      return;
    }

    if (!resolvedDeviceId) {
      Alert.alert('Missing deviceId', 'Could not resolve deviceId for this user_id');
      return;
    }

    await addEmulationDevice({
      deviceId: resolvedDeviceId,
      userId: normalizedUserId,
      label: resolvedDisplayName,
    });

    setUserId('');
    setResolvedDisplayName('');
    setResolvedDeviceId('');
    await refresh();
  };

  const onRemove = async (id: string) => {
    try {
      await removeEmulationDevice(id);
      await refresh();
    } catch (e) {
      console.error('Failed to remove emulation device:', e);
      Alert.alert('Remove failed', 'Could not remove this emulation device.');
    }
  };

  const onGoWorkout = () => {
    router.push('/(tabs)/workout?emulate=true');
  };

  return (
    <SafeAreaView
      style={[styles.container, { flex: 1, backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Emulation</Text>
          <Text style={styles.subtitle}>Add emulated devices (requires device_id + user_id)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Device</Text>

          <Text style={{ marginBottom: 6 }}>device_id (auto from Firestore)</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#99999966',
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              opacity: 0.9,
            }}
          >
            <Text>{resolvedDeviceId || (isResolvingUser ? 'Loading…' : '--')}</Text>
          </View>

          <Text style={{ marginBottom: 6 }}>user_id</Text>
          <TextInput
            value={userId}
            onChangeText={setUserId}
            placeholder="linked user uid"
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: '#99999966',
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              color: Colors[colorScheme ?? 'light'].text,
            }}
          />

          <Text style={{ marginBottom: 6 }}>displayName (auto)</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#99999966',
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              opacity: 0.9,
            }}
          >
            <Text>{resolvedDisplayName || (isResolvingUser ? 'Loading…' : '--')}</Text>
          </View>

          <Pressable
            onPress={onAdd}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: Colors[colorScheme ?? 'light'].tint,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: '#000', fontWeight: '700', textAlign: 'center' }}>Add Emulation Device</Text>
          </Pressable>

          <Pressable
            onPress={onGoWorkout}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: '#ffffff22',
              borderWidth: 1,
              borderColor: '#ffffff33',
            }}
          >
            <Text style={{ fontWeight: '700', textAlign: 'center' }}>Open Workout (emulate=true)</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Emulation Devices</Text>
          {devices.length === 0 ? (
            <Text style={styles.subtitle}>No emulation devices added yet.</Text>
          ) : (
            devices.map((d) => (
              <View
                key={d.deviceId}
                style={{
                  borderWidth: 1,
                  borderColor: '#99999944',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontWeight: '700' }}>{d.label ?? d.deviceId}</Text>
                <Text>device_id: {d.deviceId}</Text>
                <Text>user_id: {d.userId}</Text>

                <Pressable
                  onPress={() => {
                    Alert.alert('Remove device?', `Remove ${d.deviceId}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          void onRemove(d.deviceId);
                        },
                      },
                    ]);
                  }}
                  style={{
                    marginTop: 10,
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: '#ff000022',
                    borderWidth: 1,
                    borderColor: '#ff000033',
                  }}
                >
                  <Text style={{ textAlign: 'center', fontWeight: '700' }}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
