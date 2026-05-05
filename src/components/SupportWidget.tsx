import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  unread_by_passenger: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string;
}

type PanelView = 'closed' | 'tickets' | 'thread' | 'new';

export function SupportWidget() {
  const { user } = useAuth();
  const [view, setView] = useState<PanelView>('closed');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasUnread = tickets.some(t => t.unread_by_passenger);

  // ── Fetch tickets ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('passenger_id', user.id)
      .order('updated_at', { ascending: false });
    if (data) setTickets(data as Ticket[]);
  };

  // ── Fetch messages for active ticket ──────────────────────
  useEffect(() => {
    if (!activeTicket) return;
    fetchMessages(activeTicket.id);

    // Mark as read by passenger
    supabase
      .from('support_tickets')
      .update({ unread_by_passenger: false })
      .eq('id', activeTicket.id)
      .then(() => {
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, unread_by_passenger: false } : t));
      });
  }, [activeTicket?.id]);

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  // ── Realtime subscription for new messages ────────────────
  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase
      .channel(`support-msgs-${activeTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${activeTicket.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicket?.id]);

  // ── Realtime subscription for ticket updates (unread badge) ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('support-tickets-passenger')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Auto-scroll messages ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Create new ticket ─────────────────────────────────────
  const handleCreateTicket = async () => {
    if (!user || !newSubject.trim() || !newBody.trim()) return;
    setSending(true);

    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets')
      .insert({ passenger_id: user.id, subject: newSubject.trim() })
      .select()
      .single();

    if (tErr || !ticket) { setSending(false); return; }

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_role: 'passenger',
      body: newBody.trim(),
    });

    setNewSubject('');
    setNewBody('');
    setSending(false);
    await fetchTickets();
    setActiveTicket(ticket as Ticket);
    setView('thread');
  };

  // ── Send reply ────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!user || !activeTicket || !replyBody.trim()) return;
    setSending(true);

    await supabase.from('support_messages').insert({
      ticket_id: activeTicket.id,
      sender_id: user.id,
      sender_role: 'passenger',
      body: replyBody.trim(),
    });

    // Mark unread for admin
    await supabase
      .from('support_tickets')
      .update({ unread_by_admin: true })
      .eq('id', activeTicket.id);

    setReplyBody('');
    setSending(false);
  };

  // ── Open a ticket thread ──────────────────────────────────
  const openThread = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setView('thread');
  };

  if (!user) return null;

  const statusColor: Record<string, string> = {
    open: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <>
      {/* Floating Bubble */}
      {view === 'closed' && (
        <button
          onClick={() => setView('tickets')}
          className="fixed z-[70] right-4 bg-electric-violet hover:bg-[#7e6be0] text-white w-14 h-14 rounded-full shadow-[0_4px_24px_rgba(138,117,240,0.5)] flex items-center justify-center transition-all active:scale-90 hover:shadow-[0_4px_32px_rgba(138,117,240,0.7)] group"
          style={{ bottom: 'calc(68px + 16px)' }}
          title="Contact Support"
        >
          <span className="material-symbols-outlined text-[26px] group-hover:scale-110 transition-transform">support_agent</span>
          {hasUnread && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#0f0d15] flex items-center justify-center">
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-ping absolute"></span>
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {view !== 'closed' && (
        <div
          ref={panelRef}
          className="fixed z-[70] right-4 w-[360px] max-w-[calc(100vw-32px)] bg-[#13111a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
          style={{ bottom: 'calc(68px + 16px)', maxHeight: 'calc(100vh - 68px - 32px - 56px)' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface-container/40 shrink-0">
            <div className="flex items-center gap-2">
              {(view === 'thread' || view === 'new') && (
                <button
                  onClick={() => { setView('tickets'); setActiveTicket(null); setMessages([]); }}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
              )}
              <span className="material-symbols-outlined text-electric-violet text-[20px]">support_agent</span>
              <h3 className="font-bold text-white text-sm">
                {view === 'tickets' && 'Support'}
                {view === 'new' && 'New Ticket'}
                {view === 'thread' && (activeTicket?.subject || 'Thread')}
              </h3>
            </div>
            <button
              onClick={() => { setView('closed'); setActiveTicket(null); setMessages([]); }}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* ── TICKETS LIST ── */}
          {view === 'tickets' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <span className="material-symbols-outlined text-[48px] text-slate-600 mb-3">forum</span>
                    <p className="text-sm text-slate-400 font-medium">No tickets yet</p>
                    <p className="text-xs text-slate-600 mt-1">Tap below to contact our support team</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-white/5">
                    {tickets.map(t => (
                      <button
                        key={t.id}
                        onClick={() => openThread(t)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {t.unread_by_passenger && (
                              <span className="w-2 h-2 rounded-full bg-electric-violet shrink-0"></span>
                            )}
                            <p className={`text-sm font-semibold truncate ${t.unread_by_passenger ? 'text-white' : 'text-slate-300'}`}>
                              {t.subject}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor[t.status] || statusColor.open}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {format(new Date(t.updated_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 text-[18px] mt-1">chevron_right</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-white/10 shrink-0">
                <button
                  onClick={() => setView('new')}
                  className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(138,117,240,0.3)]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  New Ticket
                </button>
              </div>
            </div>
          )}

          {/* ── NEW TICKET ── */}
          {view === 'new' && (
            <div className="flex-1 flex flex-col p-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Refund request, Schedule issue..."
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-surface-container/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-electric-violet transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Message</label>
                <textarea
                  placeholder="Describe your issue..."
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  className="w-full flex-1 bg-surface-container/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-electric-violet transition-colors resize-none min-h-[120px]"
                />
              </div>
              <button
                onClick={handleCreateTicket}
                disabled={!newSubject.trim() || !newBody.trim() || sending}
                className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_15px_rgba(138,117,240,0.3)]"
              >
                {sending ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">send</span>
                )}
                {sending ? 'Sending...' : 'Submit Ticket'}
              </button>
            </div>
          )}

          {/* ── THREAD VIEW ── */}
          {view === 'thread' && activeTicket && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Status bar */}
              <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor[activeTicket.status] || statusColor.open}`}>
                  {activeTicket.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-600">
                  Opened {format(new Date(activeTicket.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
                {messages.map(m => {
                  const isMe = m.sender_role === 'passenger';
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-electric-violet/20 border border-electric-violet/30 text-white rounded-br-md'
                          : 'bg-surface-container/60 border border-white/10 text-slate-200 rounded-bl-md'
                      }`}>
                        {!isMe && (
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Admin</p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1.5 ${isMe ? 'text-slate-400 text-right' : 'text-slate-600'}`}>
                          {format(new Date(m.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              {activeTicket.status !== 'resolved' ? (
                <div className="p-3 border-t border-white/10 flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Type a reply..."
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    className="flex-1 bg-surface-container/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-electric-violet transition-colors"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyBody.trim() || sending}
                    className="bg-electric-violet hover:bg-[#7e6be0] text-white p-2.5 rounded-xl transition-all active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-white/10 text-center shrink-0">
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    This ticket has been resolved
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
