import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, StatusPill, PillTone } from '../../../components/ui';
import { ORDER_STAGE_LABELS, SalesOrder } from '../../../lib/models';
import { ApiNotConfiguredError, getOrders } from '../../../lib/api';
import { daysSince } from '../../../lib/dates';

const STAGE_TONE: Record<string, PillTone> = {
  requested: 'neutral',
  printed: 'neutral',
  collected: 'warning',
  delivered: 'warning',
  pod_submitted: 'ok',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getOrders();
      data.sort((a, b) => b.stageHistory[0]?.at.localeCompare(a.stageHistory[0]?.at ?? '') ?? 0);
      setOrders(data);
    } catch (err) {
      if (err instanceof ApiNotConfiguredError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load orders.');
      }
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

  function isStale(order: SalesOrder): boolean {
    if (order.stage !== 'collected' && order.stage !== 'delivered') return false;
    const lastTransition = order.stageHistory[order.stageHistory.length - 1];
    if (!lastTransition) return false;
    return daysSince(lastTransition.at) >= 3;
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
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/orders/[id]', params: { id: item.id } }} asChild>
            <Pressable>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderRef}>{item.orderRef}</Text>
                  <Text style={styles.client}>{item.client}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusPill label={ORDER_STAGE_LABELS[item.stage]} tone={STAGE_TONE[item.stage]} />
                  {isStale(item) ? <StatusPill label="Stuck" tone="danger" /> : null}
                </View>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet — staff add these from the dashboard.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef: { fontSize: 16, fontWeight: '700' },
  client: { fontSize: 14, color: '#6B6B70' },
  empty: { textAlign: 'center', color: '#8A8A8E', marginTop: 24 },
  errorBox: { padding: 24, gap: 16, alignItems: 'center' },
  errorText: { textAlign: 'center', color: '#6B6B70', fontSize: 15 },
});
