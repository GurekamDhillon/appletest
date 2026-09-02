import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SecondaryButton, StatusPill } from '../../components/ui';
import { PackingSlip } from '../../lib/models';
import { getAll, newId, upsert, STORAGE_KEYS } from '../../lib/storage';
import { capturePhoto, pickPhoto, sharePhoto } from '../../lib/attachments';
import { formatDate } from '../../lib/dates';
import { autoCloseMatchingRequest } from '../../lib/api';

export default function ReceivingScreen() {
  const [slips, setSlips] = useState<PackingSlip[]>([]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const all = await getAll<PackingSlip>(STORAGE_KEYS.packingSlips);
    all.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    setSlips(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unsentCount = slips.filter((s) => !s.submittedAt).length;

  async function logSlip(source: 'camera' | 'library') {
    setBusy(true);
    try {
      const uri = source === 'camera' ? await capturePhoto() : await pickPhoto();
      if (!uri) return;

      const slip: PackingSlip = {
        id: newId(),
        receivedAt: new Date().toISOString(),
        description: description.trim() || undefined,
        photoUri: uri,
      };
      await upsert(STORAGE_KEYS.packingSlips, slip);
      setDescription('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function submitSlip(slip: PackingSlip) {
    await sharePhoto(slip.photoUri, 'Send packing slip');
    await upsert(STORAGE_KEYS.packingSlips, { ...slip, submittedAt: new Date().toISOString() });
    await autoCloseMatchingRequest('receiving');
    await load();
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={slips}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Card>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Received shipments</Text>
                <StatusPill
                  label={unsentCount === 0 ? 'All sent' : `${unsentCount} not sent`}
                  tone={unsentCount === 0 ? 'ok' : 'warning'}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Vendor / PO reference (optional)"
                value={description}
                onChangeText={setDescription}
              />
              <PrimaryButton label="Photograph Packing Slip" onPress={() => logSlip('camera')} disabled={busy} />
              <SecondaryButton label="Choose from Library Instead" onPress={() => logSlip('library')} />
            </Card>
            <Text style={styles.historyTitle}>History</Text>
          </>
        }
        renderItem={({ item }) => (
          <Card style={styles.entryCard}>
            <Image source={{ uri: item.photoUri }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.entryDate}>{formatDate(item.receivedAt)}</Text>
              {item.description ? <Text style={styles.entryLabel}>{item.description}</Text> : null}
              {item.submittedAt ? (
                <StatusPill label="Sent" tone="ok" />
              ) : (
                <SecondaryButton label="Send Now" onPress={() => submitSlip(item)} />
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shipments logged yet.</Text>}
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
