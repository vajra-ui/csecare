import { StudentLayout } from '@/components/layouts/StudentLayout';
import { MessagingPanel } from '@/components/messaging/MessagingPanel';

export default function StudentMessages() {
  return (
    <StudentLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Messages</h1>
        <MessagingPanel />
      </div>
    </StudentLayout>
  );
}
