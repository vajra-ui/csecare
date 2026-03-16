import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Search, MessageCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Contact {
  user_id: string;
  name: string;
  role: string;
  identifier: string;
  unread: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export function MessagingPanel() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (currentUserId) {
      fetchContacts();
      // Subscribe to new messages in real-time
      const channel = supabase
        .channel('messages-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === currentUserId || msg.receiver_id === currentUserId) {
            // Update messages if in the active conversation
            setMessages(prev => {
              if (selectedContact && (
                (msg.sender_id === currentUserId && msg.receiver_id === selectedContact.user_id) ||
                (msg.receiver_id === currentUserId && msg.sender_id === selectedContact.user_id)
              )) {
                return [...prev, msg];
              }
              return prev;
            });
            // Refresh contacts for unread counts
            fetchContacts();
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [currentUserId, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    if (!currentUserId) return;

    // Determine which contacts to show based on role
    let contactList: Contact[] = [];

    if (user?.role === 'STUDENT') {
      // Students see their tutor and faculty who teach their section
      const { data: student } = await supabase.from('students').select('section, tutor_id').eq('user_id', currentUserId).single();
      if (!student) return;

      // Always add tutor first if assigned
      if (student.tutor_id) {
        const { data: tutor } = await supabase.from('faculty').select('id, name, faculty_id, user_id, is_tutor').eq('id', student.tutor_id).single();
        if (tutor?.user_id) {
          contactList.push({
            user_id: tutor.user_id,
            name: tutor.name,
            role: '⭐ Your Tutor',
            identifier: tutor.faculty_id,
            unread: 0,
          });
        }
      }

      // Get faculty from timetable
      const { data: tt } = await supabase.from('timetable').select('faculty_id, subject').eq('section', student.section as any);
      if (tt && tt.length > 0) {
        const facultyIds = [...new Set(tt.map(t => t.faculty_id))];
        const { data: facultyRecords } = await supabase.from('faculty').select('id, name, faculty_id, user_id, is_tutor').in('id', facultyIds);
        (facultyRecords || []).forEach(f => {
          if (f.user_id && !contactList.find(c => c.user_id === f.user_id)) {
            contactList.push({
              user_id: f.user_id,
              name: f.name,
              role: f.is_tutor ? 'Tutor' : 'Faculty',
              identifier: f.faculty_id,
              unread: 0,
            });
          }
        });
      }
    } else if (user?.role === 'FACULTY' || user?.role === 'TUTOR') {
      // Faculty see students in their sections + other faculty
      const { data: faculty } = await supabase.from('faculty').select('id, section').eq('user_id', currentUserId).single();
      if (!faculty) return;

      // Students from timetable sections
      const { data: tt } = await supabase.from('timetable').select('section').eq('faculty_id', faculty.id);
      const sections = [...new Set((tt || []).map((t: any) => t.section))];

      if (sections.length > 0) {
        const { data: studentList } = await supabase
          .from('students')
          .select('id, name, roll_number, user_id, section')
          .in('section', sections as any[])
          .not('user_id', 'is', null);

        (studentList || []).forEach(s => {
          if (s.user_id) {
            contactList.push({
              user_id: s.user_id,
              name: s.name,
              role: `Student • ${s.section}`,
              identifier: s.roll_number,
              unread: 0,
            });
          }
        });
      }

      // If tutor, also show tutor students
      if (user?.isTutor && faculty.section) {
        const { data: tutorStudents } = await supabase
          .from('students')
          .select('id, name, roll_number, user_id, section')
          .eq('tutor_id', faculty.id)
          .not('user_id', 'is', null);

        (tutorStudents || []).forEach(s => {
          if (s.user_id && !contactList.find(c => c.user_id === s.user_id)) {
            contactList.push({
              user_id: s.user_id,
              name: s.name,
              role: `Student • ${s.section}`,
              identifier: s.roll_number,
              unread: 0,
            });
          }
        });
      }
    }

    // Fetch unread counts and last messages
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (allMessages) {
      contactList.forEach(contact => {
        const contactMsgs = allMessages.filter(m =>
          (m.sender_id === contact.user_id && m.receiver_id === currentUserId) ||
          (m.sender_id === currentUserId && m.receiver_id === contact.user_id)
        );
        contact.unread = contactMsgs.filter(m => m.receiver_id === currentUserId && !m.is_read && m.sender_id === contact.user_id).length;
        if (contactMsgs.length > 0) {
          contact.lastMessage = contactMsgs[0].content;
          contact.lastMessageTime = contactMsgs[0].created_at;
        }
      });
    }

    // Sort: unread first, then by last message time
    contactList.sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
      if (a.lastMessageTime && b.lastMessageTime) return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      return a.name.localeCompare(b.name);
    });

    setContacts(contactList);
  };

  const selectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowMobileChat(true);

    // Fetch conversation
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${contact.user_id}),and(sender_id.eq.${contact.user_id},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    setMessages(data || []);

    // Mark unread messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', contact.user_id)
      .eq('receiver_id', currentUserId!)
      .eq('is_read', false);

    fetchContacts();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !currentUserId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: selectedContact.user_id,
        content: newMessage.trim(),
      });
      if (error) throw error;

      // Create notification for receiver
      await supabase.from('notifications').insert({
        user_id: selectedContact.user_id,
        title: 'New Message',
        message: `${user?.name}: ${newMessage.trim().slice(0, 100)}`,
        type: 'message',
        link: user?.role === 'STUDENT' ? '/student/messages' : '/faculty/messages',
      });

      setNewMessage('');
    } catch (e: any) {
      toast({ title: 'Error sending message', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const ContactsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            No contacts found
          </div>
        ) : (
          <div className="divide-y">
            {filteredContacts.map(contact => (
              <button
                key={contact.user_id}
                onClick={() => selectContact(contact)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left',
                  selectedContact?.user_id === contact.user_id && 'bg-muted'
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {contact.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    {contact.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">{formatTime(contact.lastMessageTime)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.lastMessage || contact.role}
                    </p>
                    {contact.unread > 0 && (
                      <Badge className="h-5 min-w-5 flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground">{contact.unread}</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatPanel = () => (
    <div className="flex flex-col h-full">
      {selectedContact ? (
        <>
          <div className="flex items-center gap-3 p-3 border-b">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setShowMobileChat(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{selectedContact.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{selectedContact.name}</p>
              <p className="text-xs text-muted-foreground">{selectedContact.role}</p>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map(msg => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2',
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn('text-xs mt-1', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {isMine && msg.is_read && ' ✓✓'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a contact to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] border rounded-lg overflow-hidden flex bg-card">
      {/* Desktop: side-by-side. Mobile: toggle */}
      <div className={cn('w-full md:w-80 md:border-r flex-shrink-0', showMobileChat ? 'hidden md:block' : 'block')}>
        <ContactsList />
      </div>
      <div className={cn('flex-1', !showMobileChat ? 'hidden md:flex md:flex-col' : 'flex flex-col')}>
        <ChatPanel />
      </div>
    </div>
  );
}
