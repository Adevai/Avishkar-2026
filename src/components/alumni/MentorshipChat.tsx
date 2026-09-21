import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ChatMessage } from '../../types';

interface Props {
  roomId: string;
  onBack?: () => void;
}

export const MentorshipChat: React.FC<Props> = ({ roomId, onBack }) => {
  const { student, setNotification } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const load = useCallback(async () => {
    try {
      const msgs = await api.getRoomMessages(roomId);
      setMessages(msgs);
    } catch {
      // keep old messages on failure
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 50);
    }
  }, [roomId]);

  useEffect(() => {
    load();
    // Poll every 6s — SSE notifies instantly, this catches missed events
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const msg = await api.sendRoomMessage(roomId, 'mentor', student.name, body);
      setMessages(prev => [...prev, msg]);
      setDraft('');
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      setNotification(err.message || 'Message failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="premium-card flex flex-col h-[560px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-900/[0.07] bg-white">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-ink-900/[0.05] text-ink-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-extrabold text-sm">
          M
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink-900 text-sm">Mentorship Room</p>
          <p className="text-[11px] text-ink-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            Private 1-on-1 · end-to-end between you and your mentee
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-ivory-deep/40">
        {loading ? (
          <div className="flex items-center justify-center h-full text-ink-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-ink-400">
            Say hello — this room is private to you two.
          </div>
        ) : (
          messages.map(m => {
            const mine = m.senderRole === 'mentor';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  mine
                    ? 'bg-ink-900 text-white rounded-br-md'
                    : 'bg-white text-ink-800 border border-ink-900/[0.06] rounded-bl-md'
                }`}>
                  {m.senderRole === 'mentor' && m.senderName !== student.name && (
                    <p className="text-[10px] font-bold text-gold-400 mb-0.5">{m.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/50' : 'text-ink-400'}`}>
                    {new Date(m.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-900/[0.07] bg-white">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-ink-900/10 bg-ivory text-sm focus:border-gold-500"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="btn-gold !px-4 !py-2.5"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
