import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Message = { role: 'user' | 'assistant'; content: string };

export function StudentAIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const resp = await supabase.functions.invoke('ai-student-advisor', {
        body: { messages: newMessages, studentName: user?.name || 'Student' },
      });

      if (resp.error) throw resp.error;

      const assistantContent = resp.data?.content || 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (e: any) {
      console.error('AI error:', e);
      const errorMsg = e?.message?.includes('429')
        ? 'Too many requests. Please wait a moment and try again.'
        : e?.message?.includes('402')
        ? 'AI usage limit reached. Please try again later.'
        : 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-neon animate-glow hover:scale-110 transition-transform"
        >
          <Bot className="h-6 w-6 text-background" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl overflow-hidden border border-neon-cyan/20 shadow-neon animate-scale-in"
          style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50" style={{ background: 'linear-gradient(135deg, hsl(var(--neon-cyan) / 0.1), hsl(var(--neon-purple) / 0.1))' }}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-background" />
              </div>
              <div>
                <p className="font-display text-xs font-semibold tracking-wider">AI ADVISOR</p>
                <p className="text-[10px] text-muted-foreground font-body">Academic guidance & support</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <Bot className="h-10 w-10 mx-auto text-neon-cyan/40 mb-3" />
                <p className="font-display text-sm font-semibold tracking-wide mb-1">Hi, {user?.name?.split(' ')[0] || 'there'}!</p>
                <p className="text-xs text-muted-foreground font-body mb-4">
                  I'm your AI academic advisor. Ask me about study tips, time management, career guidance, or anything related to your academics.
                </p>
                <div className="space-y-2">
                  {['How can I improve my CGPA?', 'Tips for time management', 'Career paths in CSE'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="w-full text-left text-xs p-2 rounded-lg border border-border/50 hover:border-neon-cyan/30 hover:bg-muted/30 transition-colors font-body text-muted-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm font-body ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20'
                      : 'bg-muted/50 border border-border/50'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 border border-border/50 rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/50">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan/40 transition-colors"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4 text-background" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
