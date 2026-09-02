import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, SecondaryButton, StatusPill, PillTone } from '../../../components/ui';
import { ORDER_STAGE_LABELS, ORDER_STAGES, OrderStage, SalesOrder } from '../../../lib/models';
import {
  advanceStage,
  cancelOrder,
  getApiSettings,
  getOrders,
  updateOrderNotes,
  uploadPod,
} from '../../../lib/api';
import { capturePhoto } from '../../../lib/attachments';
import { formatDate } from '../../../lib/dates';

const STAGE_TONE: Record<string, PillTone> = {
  requested: 'neutral',
  printed: 'neutral',
  collected: 'warning',
  delivered: 'warning',
  pod_submitted: 'ok',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [notes, setNotes] = useState('');
  const [photoBaseUrl, setPhotoBaseUrl] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [orders, settings] = await Promise.all([getOrders(), getApiSettings()]);
    const found = orders.find((o) => o.id === id) ?? null;
    setOrder(found);
    setNotes(found?.notes ?? '');
    setPhotoBaseUrl(settings?.baseUrl ?? '');
    setAccessCode(settings?.accessCode ?? '');
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAdvance() {
    if (!order) return;
    const currentIndex = ORDER_STAGES.indexOf(order.stage);
    const nextStage = ORDER_STAGES[currentIndex + 1] as OrderStage | undefined;
    if (!nextStage || nextStage === 'pod_submitted') return;
    setBusy(true);
    try {
      const updated = await advanceStage(order.id, nextStage);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Failed to advance', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAttachPod() {
    if (!order) return;
    const uri = await capturePhoto();
    if (!uri) return;
    setBusy(true);
    try {
      const updated = await uploadPod(order.id, uri);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNotes() {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await updateOrderNotes(order.id, notes);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Failed to save notes', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  function handleToggleCancel() {
    if (!order) return;
    const willCancel = !order.cancelled;
    Alert.alert(
      willCancel ? 'Cancel this order?' : 'Restore this order?',
      willCancel
        ? 'Staff will see it marked cancelled. You can restore it later if needed.'
        : 'This order will become active again.',
      [
        { text: 'Never mind', style: 'cancel' },
        {
          text: willCancel ? 'Cancel Order' : 'Restore Order',
          style: willCancel ? 'destructive' : 'default',
          onPress: async () => {
            setBusy(true);
            try {
              const updated = await cancelOrder(order.id, willCancel);
              setOrder(updated);
            } catch (err) {
              Alert.alert('Failed', err instanceof Error ? err.message : 'Unknown error');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Loading order…</Text>
      </SafeAreaView>
    );
  }

  const nextStage = ORDER_STAGES[ORDER_STAGES.indexOf(order.stage) + 1] as OrderStage | undefined;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{order.orderRef}</Text>
            {order.cancelled ? (
              <StatusPill label="Cancelled" tone="neutral" />
            ) : (
              <StatusPill label={ORDER_STAGE_LABELS[order.stage]} tone={STAGE_TONE[order.stage]} />
            )}
          </View>
          <Text style={styles.client}>{order.client}</Text>
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Stage history</Text>
          {order.stageHistory.map((t, i) => (
            <View key={`${t.stage}-${i}`} style={styles.historyRow}>
              <Text style={styles.historyStage}>{ORDER_STAGE_LABELS[t.stage]}</Text>
              <Text style={styles.historyDate}>{formatDate(t.at)}</Text>
            </View>
          ))}
        </Card>

        {order.podPhotoUri ? (
          <Card>
            <Text style={styles.sectionLabel}>Proof of delivery</Text>
            <Image
              source={{
                uri: `${photoBaseUrl}${order.podPhotoUri}`,
                headers: { 'X-Access-Code': accessCode },
              }}
              style={styles.photo}
            />
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything staff should know…"
            multiline
          />
          <SecondaryButton label="Save Notes" onPress={handleSaveNotes} />
        </Card>

        {!order.cancelled &&
          (order.stage === 'delivered' ? (
            <PrimaryButton label="Attach POD & Submit" onPress={handleAttachPod} disabled={busy} />
          ) : nextStage && nextStage !== 'pod_submitted' ? (
            <PrimaryButton label={`Advance to ${ORDER_STAGE_LABELS[nextStage]}`} onPress={handleAdvance} disabled={busy} />
          ) : null)}

        <SecondaryButton
          label={order.cancelled ? 'Restore Order' : 'Cancel Order'}
          onPress={handleToggleCancel}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  client: { fontSize: 15, color: '#3A3A3C', marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B6B70', marginBottom: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  historyStage: { fontSize: 14, fontWeight: '500' },
  historyDate: { fontSize: 14, color: '#8A8A8E' },
  photo: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#E5E5EA' },
  notesInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 10,
  },
  empty: { textAlign: 'center', color: '#8A8A8E', marginTop: 24 },
});
