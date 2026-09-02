import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PillTone, PrimaryButton, SecondaryButton, StatusPill } from '../../components/ui';
import { PaperworkRequest, REQUEST_TYPE_LABELS } from '../../lib/models';
import { ApiNotConfiguredError, cancelRequest, fulfillRequest, getRequests } from '../../lib/api';
import { formatDate } from '../../lib/dates';

const STATUS_TONE: Record<PaperworkRequest['status'], PillTone> = {
  open: 'warning',
  fulfilled: 'ok',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<PaperworkRequest['status'], string> = {
  open: 'Open',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export default function RequestsScreen() {
  const [requests, setRequests] = useState<PaperworkRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getRequests();
      data.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      setRequests(data);
    } catch (err) {
      setError(
        err instanceof ApiNotConfiguredError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load requests.'
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markFulfilled(id: string) {
    setBusyId(id);
    try {
      await fulfillRequest(id);
      await load();
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      await cancelRequest(id);
      await load();
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Link href="/settings" asChild>
            <PrimaryButton label="Open Settings" onPress={() => {}} />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.hint}>Paperwork staff have asked for. Completing the matching work closes these automatically.</Text>
        }
        renderItem={({ item }) => {
          const label = item.vehicleLabel
            ? `${REQUEST_TYPE_LABELS[item.type]} (${item.vehicleLabel})`
            : REQUEST_TYPE_LABELS[item.type];
          return (
            <Card>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{label}</Text>
                <StatusPill label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
              </View>
              {item.dueDate ? <Text style={styles.meta}>Due {formatDate(item.dueDate)}</Text> : null}
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              {item.status === 'open' ? (
                <View style={{ marginTop: 8, gap: 4 }}>
                  <PrimaryButton
                    label="Mark Fulfilled"
                    onPress={() => markFulfilled(item.id)}
                    disabled={busyId === item.id}
                  />
                  <SecondaryButton label="Dismiss" onPress={() => dismiss(item.id)} />
                </View>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No paperwork requests.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  hint: { color: '#6B6B70', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#6B6B70', marginTop: 4 },
  note: { fontSize: 14, marginTop: 4 },
  empty: { textAlign: 'center', color: '#8A8A8E', marginTop: 24 },
  errorBox: { padding: 24, gap: 16, alignItems: 'center' },
  errorText: { textAlign: 'center', color: '#6B6B70', fontSize: 15 },
});
