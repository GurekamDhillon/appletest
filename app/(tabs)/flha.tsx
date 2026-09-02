import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SecondaryButton, StatusPill } from '../../components/ui';
import { FlhaEntry } from '../../lib/models';
import { getAll, newId, upsert, STORAGE_KEYS } from '../../lib/storage';
import { capturePhoto, pickPhoto, sharePhoto } from '../../lib/attachments';
import { currentWeekKey, formatDate } from '../../lib/dates';
import { recomputeReminders } from '../../lib/notifications';
import { autoCloseMatchingRequest } from '../../lib/api';

const WEEKLY_TARGET = 2;

export default function FlhaScreen() {
  const [entries, setEntries] = useState<FlhaEntry[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const all = await getAll<FlhaEntry>(STORAGE_KEYS.flhaEntries);
    all.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const thisWeek = entries.filter((e) => currentWeekKey(new Date(e.date)) === currentWeekKey());
  const doneThisWeek = thisWeek.length;

  async function logFlha(source: 'camera' | 'library') {
    setBusy(true);
    try {
      const uri = source === 'camera' ? await capturePhoto() : await pickPhoto();
      if (!uri) return;

      const entry: FlhaEntry = {
        id: newId(),
        date: new Date().toISOString(),
        siteOrJobLabel: label.trim() || undefined,
        photoUri: uri,
      };
      await upsert(STORAGE_KEYS.flhaEntries, entry);
      setLabel('');
      await sharePhoto(uri, 'Send FLHA to Safety');
      const shared = { ...entry, sharedAt: new Date().toISOString() };
      await upsert(STORAGE_KEYS.flhaEntries, shared);
      await autoCloseMatchingRequest('flha');
      await load();
      await recomputeReminders({
        flhaCountThisWeek: doneThisWeek + 1,
        monthlyInspectionsDone: 0,
        monthlyInspectionsTotal: 3,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Card>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>This week</Text>
                <StatusPill
                  label={`${doneThisWeek} / ${WEEKLY_TARGET}`}
                  tone={doneThisWeek >= WEEKLY_TARGET ? 'ok' : 'warning'}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Site / job (optional)"
                value={label}
                onChangeText={setLabel}
              />
              <PrimaryButton label="Take Photo & Log FLHA" onPress={() => logFlha('camera')} disabled={busy} />
              <SecondaryButton label="Choose from Library Instead" onPress={() => logFlha('library')} />
            </Card>
            <Text style={styles.historyTitle}>History</Text>
          </>
        }
        renderItem={({ item }) => (
          <Card style={styles.entryCard}>
            <Image source={{ uri: item.photoUri }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
              {item.siteOrJobLabel ? <Text style={styles.entryLabel}>{item.siteOrJobLabel}</Text> : null}
              <StatusPill label={item.sharedAt ? 'Sent' : 'Not sent'} tone={item.sharedAt ? 'ok' : 'neutral'} />
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No FLHA entries yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#6B6B70', marginBottom: 8, marginTop: 4 },
  entryCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E5E5EA' },
  entryDate: { fontSize: 15, fontWeight: '600' },
  entryLabel: { fontSize: 14, color: '#6B6B70', marginBottom: 6 },
  empty: { textAlign: 'center', color: '#8A8A8E', marginTop: 24 },
});
