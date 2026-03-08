import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { MessagingPanel } from '@/components/messaging/MessagingPanel';

export default function FacultyMessages() {
  return (
    <FacultyLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Messages</h1>
        <MessagingPanel />
      </div>
    </FacultyLayout>
  );
}
