import { supabase } from '@/integrations/supabase/client';

/**
 * Warm, personality-driven notification helpers.
 * Instead of clinical system messages ("Attendance updated"),
 * these speak like a supportive friend.
 */

type NotifyArgs = {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
};

export async function pushNotification(args: NotifyArgs) {
  return supabase.from('notifications').insert({
    user_id: args.userId,
    title: args.title,
    message: args.message,
    type: args.type ?? 'info',
    link: args.link ?? null,
    is_read: false,
  });
}

export const warmMessages = {
  odApproved: (name: string) => ({
    title: '🎉 OD approved!',
    message: `Great news ${name.split(' ')[0]} — your OD letter is ready to download.`,
  }),
  odRejected: (reason?: string) => ({
    title: '💬 OD needs a rethink',
    message: reason ? `Your tutor left a note: "${reason}". Try updating and resubmitting.` : 'Your tutor sent it back with feedback — check the details.',
  }),
  achievementApproved: (title: string) => ({
    title: '🏆 Achievement verified!',
    message: `"${title}" is now on your portfolio. Keep going!`,
  }),
  attendanceStreak: (pct: number) => ({
    title: '🔥 Attendance streak!',
    message: `You're at ${pct}% — solid consistency. Keep the streak alive.`,
  }),
  attendanceRisk: (pct: number) => ({
    title: '⚠️ Attendance dipping',
    message: `You're at ${pct}%. A couple of skips and you'll cross the 75% line — worth being careful this week.`,
  }),
  cgpaBoost: (from: number, to: number) => ({
    title: '📈 CGPA moved up!',
    message: `From ${from.toFixed(2)} → ${to.toFixed(2)}. Whatever you're doing, keep doing it.`,
  }),
  birthday: (name: string) => ({
    title: '🎂 Happy Birthday!',
    message: `Everyone at CSE wishes you a fantastic year ahead, ${name.split(' ')[0]}!`,
  }),
};
