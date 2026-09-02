import * as Notifications from 'expo-notifications';
import { daysUntilThe20th } from './dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const FLHA_REMINDER_ID = 'flha-reminder';
const INSPECTION_REMINDER_ID = 'inspection-reminder';

export async function requestNotificationPermission(): Promise<void> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return;
  await Notifications.requestPermissionsAsync();
}

function nextReminderTime(): Date {
  const now = new Date();
  const target = new Date(now);
  target.setHours(16, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
  }
  return target;
}

export async function recomputeReminders(state: {
  flhaCountThisWeek: number;
  monthlyInspectionsDone: number;
  monthlyInspectionsTotal: number;
}): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(FLHA_REMINDER_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(INSPECTION_REMINDER_ID).catch(() => {});

  const today = new Date();
  const isMidweekOrLater = today.getDay() >= 3; // Wed, Thu, Fri, Sat
  if (state.flhaCountThisWeek < 2 && isMidweekOrLater) {
    await Notifications.scheduleNotificationAsync({
      identifier: FLHA_REMINDER_ID,
      content: {
        title: 'FLHA due this week',
        body: `${state.flhaCountThisWeek} of 2 submitted so far — don't let this slip.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextReminderTime(),
      },
    });
  }

  const daysLeft = daysUntilThe20th(today);
  if (
    state.monthlyInspectionsDone < state.monthlyInspectionsTotal &&
    daysLeft <= 5 &&
    daysLeft >= 0
  ) {
    await Notifications.scheduleNotificationAsync({
      identifier: INSPECTION_REMINDER_ID,
      content: {
        title: 'Monthly inspections due by the 20th',
        body: `${state.monthlyInspectionsDone} of ${state.monthlyInspectionsTotal} done, ${daysLeft} day(s) left.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextReminderTime(),
      },
    });
  }
}
