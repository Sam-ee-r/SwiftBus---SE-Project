import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  passenger_id: string;
  subject: string;
  status: string;
  unread_by_admin: boolean;
  unread_by_passenger: boolean;
  created_at: string;
  updated_at: string;
  passenger_email?: string;
  passenger_name?: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string;
}

interface PassengerBooking {
  id: string;
  seat_no: number;
  status: string;
  travel_date: string;
  route_departure?: string;
  route_destination?: string;
}

export default function SupportInbox() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passengerBookings, setPassengerBookings] = useState<PassengerBooking[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch all tickets ─────────────────────────────────────
  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('unread_by_admin', { ascending: false })
      .order('updated_at', { ascending: false });

    if (data) {
      // Fetch passenger emails for each ticket
      const enriched = await Promise.all(
        (data as Ticket[]).map(async (t) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', t.passenger_id)
            .single();
          return {
            ...t,
            passenger_email: profile?.email || 'Unknown',
            passenger_name: profile?.full_name || profile?.email || 'Passenger',
          };
        })
      );
      setTickets(enriched);
    }
    setLoading(false);
  };

  // ── Fetch messages for active ticket ──────────────────────
  useEffect(() => {
    if (!activeTicket) return;
    fetchMessages(activeTicket.id);
    fetchPassengerBookings(activeTicket.passenger_id);

    // Mark as read by admin
    supabase
      .from('support_tickets')
      .update({ unread_by_admin: false })
      .eq('id', activeTicket.id)
      .then(() => {
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, unread_by_admin: false } : t));
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

  const fetchPassengerBookings = async (passengerId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('id, seat_no, status, travel_date, schedule:schedules(bus:buses(route:routes(departure, destination)))')
      .eq('passenger_id', passengerId)
      .order('travel_date', { ascending: false })
      .limit(5);

    if (data) {
      const mapped = data.map((b: any) => ({
        id: b.id,
        seat_no: b.seat_no,
        status: b.status,
        travel_date: b.travel_date,
        route_departure: b.schedule?.bus?.route?.departure,
        route_destination: b.schedule?.bus?.route?.destination,
      }));
      setPassengerBookings(mapped);
    }
  };

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase
      .channel(`admin-support-msgs-${activeTicket.id}`)
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

  // Ticket updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-tickets-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Auto-scroll messages ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send reply ────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!user || !activeTicket || !replyBody.trim()) return;
    setSending(true);

    await supabase.from('support_messages').insert({
      ticket_id: activeTicket.id,
      sender_id: user.id,
      sender_role: 'admin',
      body: replyBody.trim(),
    });

    // Mark unread for passenger + set in_progress
    await supabase
      .from('support_tickets')
      .update({ unread_by_passenger: true, status: activeTicket.status === 'open' ? 'in_progress' : activeTicket.status })
      .eq('id', activeTicket.id);

    // Notify the passenger
    await supabase.from('notifications').insert({
      user_id: activeTicket.passenger_id,
      title: 'Support Reply 💬',
      message: `Admin replied to your ticket: "${activeTicket.subject}"`,
    });

    setReplyBody('');
    setSending(false);
    fetchTickets();
  };

  // ── Update ticket status ──────────────────────────────────
  const handleStatusChange = async (status: string) => {
    if (!activeTicket) return;
    await supabase
      .from('support_tickets')
      .update({ status, unread_by_passenger: true })
      .eq('id', activeTicket.id);

    // Notify passenger of resolution
    if (status === 'resolved') {
      await supabase.from('notifications').insert({
        user_id: activeTicket.passenger_id,
        title: 'Ticket Resolved ✅',
        message: `Your support ticket "${activeTicket.subject}" has been resolved.`,
      });
    }

    setActiveTicket(prev => prev ? { ...prev, status } : null);
    fetchTickets();
  };

  const unreadCount = tickets.filter(t => t.unread_by_admin).length;

  const statusColor: Record<string, string> = {
    open: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const bookingStatusColor: Record<string, string> = {
    confirmed: 'text-emerald-400',
    pending: 'text-amber-400',
    cancelled: 'text-rose-400',
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-h1 text-3xl md:text-4xl text-white font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-electric-violet text-[32px]">support_agent</span>
          Support Inbox
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-2.5 py-0.5 ml-2">
              {unreadCount}
            </span>
          )}
        </h1>
        <p className="text-slate-400 mt-1">Manage passenger support tickets and respond to queries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {/* ── LEFT: Ticket List ── */}
        <div className="lg:col-span-4 bg-surface-container/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              All Tickets ({tickets.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-[32px] text-electric-violet">sync</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <span className="material-symbols-outlined text-[48px] text-slate-700 mb-3">inbox</span>
                <p className="text-sm text-slate-500">No tickets yet</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={`w-full text-left px-4 py-4 hover:bg-white/5 transition-all ${
                      activeTicket?.id === t.id ? 'bg-electric-violet/10 border-l-2 border-electric-violet' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {t.unread_by_admin && (
                        <span className="w-2.5 h-2.5 rounded-full bg-electric-violet shrink-0 mt-1.5 animate-pulse"></span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${t.unread_by_admin ? 'text-white' : 'text-slate-300'}`}>
                          {t.subject}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{t.passenger_name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor[t.status] || statusColor.open}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {format(new Date(t.updated_at), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Thread View ── */}
        <div className="lg:col-span-8 bg-surface-container/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          {!activeTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <span className="material-symbols-outlined text-[64px] text-slate-700 mb-4">mark_chat_unread</span>
              <p className="text-lg text-slate-400 font-medium">Select a ticket to view</p>
              <p className="text-sm text-slate-600 mt-1">Click on a ticket from the left panel</p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{activeTicket.subject}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {activeTicket.passenger_name} · {activeTicket.passenger_email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeTicket.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    className="bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider focus:outline-none focus:border-electric-violet cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Passenger context: recent bookings */}
              {passengerBookings.length > 0 && (
                <div className="px-5 py-3 border-b border-white/5 shrink-0 bg-surface-container-high/20">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recent Bookings</p>
                  <div className="flex flex-wrap gap-2">
                    {passengerBookings.map(b => (
                      <div key={b.id} className="bg-surface-container/60 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
                        <span className={`font-bold ${bookingStatusColor[b.status] || 'text-slate-400'}`}>
                          {b.route_departure} → {b.route_destination}
                        </span>
                        <span className="text-slate-600">Seat {b.seat_no}</span>
                        <span className="text-slate-600">{format(new Date(b.travel_date), 'MMM d')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-3">
                {messages.map(m => {
                  const isAdmin = m.sender_role === 'admin';
                  return (
                    <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isAdmin
                          ? 'bg-electric-violet/20 border border-electric-violet/30 text-white rounded-br-md'
                          : 'bg-surface-container/60 border border-white/10 text-slate-200 rounded-bl-md'
                      }`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1">
                          {isAdmin ? (
                            <span className="text-electric-violet">You (Admin)</span>
                          ) : (
                            <span className="text-emerald-400">{activeTicket.passenger_name}</span>
                          )}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1.5 ${isAdmin ? 'text-slate-400 text-right' : 'text-slate-600'}`}>
                          {format(new Date(m.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="p-4 border-t border-white/10 flex gap-3 shrink-0">
                <input
                  type="text"
                  placeholder="Type your reply..."
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  className="flex-1 bg-surface-container/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-electric-violet transition-colors"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyBody.trim() || sending}
                  className="bg-electric-violet hover:bg-[#7e6be0] text-white px-5 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(138,117,240,0.3)]"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
