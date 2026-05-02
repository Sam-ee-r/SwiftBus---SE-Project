import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  User, Mail, Phone, ShieldCheck, Bus, KeyRound, Save, LogOut,
  Ticket, RotateCcw, MessageSquare, Loader2, Gauge, AlertCircle, Send
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ProfileDashboard() {
  const { user, loading: authLoading, signOut, isDriver, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Edit forms
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Data for tabs
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [myRefunds, setMyRefunds] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  
  // Complaint form
  const [complaintType, setComplaintType] = useState('complaint');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (profileErr) throw profileErr;
      setProfile(profileData);
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
      setPhone(profileData.phone || '');

      // 2. Fetch Driver Info if applicable
      if (isDriver) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*, bus:buses(bus_no)')
          .eq('user_id', user?.id)
          .maybeSingle();
        if (driverData) setDriverInfo(driverData);
      }

      // 3. Fetch Recent Bookings (History)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, seat_no, status, travel_date, schedule_id, bus:buses(bus_no)')
        .eq('passenger_id', user?.id)
        .order('booking_date', { ascending: false })
        .limit(5);
        
      if (bookingsData && bookingsData.length > 0) {
        // fetch route info
        const schedIds = bookingsData.map(b => b.schedule_id).filter(Boolean);
        const { data: scheds } = await supabase.from('schedules').select('id, route:routes(departure, destination)').in('id', schedIds.length ? schedIds : ['']);
        
        const enrichedBookings = bookingsData.map(b => {
           const sched = scheds?.find(s => s.id === b.schedule_id);
           return { ...b, route: (sched?.route as any) };
        });
        setRecentBookings(enrichedBookings);
      }

      // 4. Fetch Refunds
      const { data: refundData } = await supabase
        .from('refunds')
        .select('id, status, amount, requested_at, reason')
        .order('requested_at', { ascending: false });
      // RLS policy ensures users only see their own refunds
      if (refundData) setMyRefunds(refundData);

      // 5. Fetch Complaints
      const { data: compData } = await supabase
        .from('complaints')
        .select('*')
        .eq('user_id', user?.id)
        .order('submitted_at', { ascending: false });
      if (compData) setComplaints(compData);

    } catch (err: any) {
      toast.error(`Error loading profile data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(`Failed to update profile: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSubject.trim() || !complaintMessage.trim()) return;
    
    setSubmittingComplaint(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .insert({
          user_id: user?.id,
          type: complaintType,
          subject: complaintSubject,
          message: complaintMessage
        });
        
      if (error) throw error;
      toast.success(`${complaintType === 'suggestion' ? 'Suggestion' : 'Complaint'} submitted successfully!`);
      setComplaintSubject('');
      setComplaintMessage('');
      
      // Refresh complaints
      const { data: compData } = await supabase
        .from('complaints')
        .select('*')
        .eq('user_id', user?.id)
        .order('submitted_at', { ascending: false });
      if (compData) setComplaints(compData);
      
    } catch (err: any) {
      toast.error(`Failed to submit: ${err.message}`);
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const getRoleBadge = () => {
    if (isAdmin) return <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-md font-medium border border-primary/30 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Admin</span>;
    if (isDriver) return <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-md font-medium border border-accent/30 flex items-center gap-1"><Gauge className="w-3 h-3"/> Driver</span>;
    return <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-md font-medium border border-border flex items-center gap-1"><User className="w-3 h-3"/> Passenger</span>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Profile Section */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent text-2xl font-bold shadow-soft">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                {profile?.first_name} {profile?.last_name}
                {getRoleBadge()}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" /> {user?.email}
              </p>
            </div>
          </div>
          
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 w-full sm:w-auto overflow-x-auto flex justify-start border border-border shadow-sm p-1 rounded-xl">
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"><User className="w-4 h-4 mr-2"/> Profile</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"><Ticket className="w-4 h-4 mr-2"/> Booking History</TabsTrigger>
            <TabsTrigger value="refunds" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"><RotateCcw className="w-4 h-4 mr-2"/> My Refunds</TabsTrigger>
            <TabsTrigger value="complaints" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"><MessageSquare className="w-4 h-4 mr-2"/> Feedback & Complaints</TabsTrigger>
          </TabsList>

          {/* TAB 1: Profile Settings */}
          <TabsContent value="profile" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Personal Info Edit */}
              <Card className="lg:col-span-2 border-border/50 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-accent"/> Personal Information</CardTitle>
                  <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 3XX XXXXXXX" />
                    </div>
                    <Button type="submit" variant="accent" disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                      Save Changes
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Account Security / Driver Info */}
              <div className="space-y-6">
                {isDriver && driverInfo && (
                  <Card className="border-border/50 shadow-soft bg-accent/5 border-accent/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-accent"><Gauge className="w-5 h-5"/> Driver Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">License No.</span>
                        <span className="font-medium">{driverInfo.license_no}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Assigned Bus</span>
                        <span className="font-medium flex items-center gap-1"><Bus className="w-3 h-3"/> {driverInfo.bus?.bus_no || 'None'}</span>
                      </div>
                      <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/driver')}>
                        Go to Driver Portal
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="border-border/50 shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5"/> Account Security</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">To reset your password, please sign out and use the "Forgot Password" link on the login page.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: History */}
          <TabsContent value="history" className="outline-none">
            <Card className="border-border/50 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>A quick glance at your latest travels</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/my-bookings')}>View All</Button>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Ticket className="mx-auto w-10 h-10 mb-3 opacity-20"/>
                    <p>No bookings found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map(b => (
                      <div key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg border border-border bg-muted/20">
                        <div>
                          <p className="font-medium">{b.route ? `${b.route.departure} → ${b.route.destination}` : 'Unknown Route'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(b.travel_date), 'PPP')} • Seat #{b.seat_no} • Bus {b.bus?.bus_no}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0 capitalize text-sm font-medium px-2 py-1 bg-background rounded-md border border-border shadow-sm">
                          {b.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Refunds */}
          <TabsContent value="refunds" className="outline-none">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle>My Refund Requests</CardTitle>
                <CardDescription>Track the status of your cancellations and refunds.</CardDescription>
              </CardHeader>
              <CardContent>
                {myRefunds.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <RotateCcw className="mx-auto w-10 h-10 mb-3 opacity-20"/>
                    <p>You have no refund requests.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRefunds.map(r => (
                      <div key={r.id} className="flex justify-between items-center p-4 rounded-lg border border-border bg-muted/20">
                        <div>
                          <p className="font-semibold text-lg">Rs. {Number(r.amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Requested: {format(parseISO(r.requested_at), 'PPP')}</p>
                          <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                        </div>
                        <div>
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full border capitalize ${
                             r.status === 'processed' ? 'bg-success/10 text-success border-success/20' :
                             r.status === 'approved' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                             r.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                             'bg-warning/10 text-warning border-warning/20'
                           }`}>
                             {r.status}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Complaints & Suggestions */}
          <TabsContent value="complaints" className="outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Submission Form */}
              <Card className="border-border/50 shadow-soft">
                <CardHeader>
                  <CardTitle>Submit Feedback</CardTitle>
                  <CardDescription>Have a complaint or suggestion? Let us know.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitComplaint} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={complaintType} onValueChange={setComplaintType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="suggestion">Suggestion</SelectItem>
                          <SelectItem value="feedback">General Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={complaintSubject} onChange={e => setComplaintSubject(e.target.value)} required placeholder="Brief title..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea value={complaintMessage} onChange={e => setComplaintMessage(e.target.value)} required rows={4} placeholder="Please provide details..." />
                    </div>
                    <Button type="submit" variant="accent" className="w-full" disabled={submittingComplaint}>
                      {submittingComplaint ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                      Submit {complaintType}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Previous Complaints */}
              <Card className="border-border/50 shadow-soft">
                <CardHeader>
                  <CardTitle>My Submissions</CardTitle>
                  <CardDescription>Status of your previous messages.</CardDescription>
                </CardHeader>
                <CardContent>
                  {complaints.length === 0 ? (
                     <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                       <MessageSquare className="mx-auto w-8 h-8 mb-3 opacity-20"/>
                       <p className="text-sm">No submissions yet.</p>
                     </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {complaints.map(c => (
                        <div key={c.id} className="p-3 rounded-lg border border-border bg-muted/10 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                             c.status === 'resolved' ? 'bg-success' :
                             c.status === 'closed' ? 'bg-muted-foreground' : 'bg-warning'
                          }`}></div>
                          <div className="flex justify-between items-start mb-2 pl-2">
                             <div className="flex items-center gap-2">
                               <span className="text-xs uppercase font-bold text-accent tracking-wider">{c.type}</span>
                               <span className="text-xs text-muted-foreground">• {format(parseISO(c.submitted_at), 'MMM d, yyyy')}</span>
                             </div>
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                               c.status === 'resolved' ? 'border-success text-success bg-success/10' :
                               c.status === 'closed' ? 'border-border text-muted-foreground bg-muted' : 'border-warning text-warning bg-warning/10'
                             }`}>{c.status}</span>
                          </div>
                          <p className="font-medium text-sm pl-2">{c.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1 pl-2 line-clamp-2">{c.message}</p>
                          {c.admin_reply && (
                            <div className="mt-3 pl-2 pr-2">
                               <div className="bg-primary/5 border border-primary/20 rounded-md p-2 text-xs">
                                 <strong className="text-primary block mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Admin Reply</strong>
                                 {c.admin_reply}
                               </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
