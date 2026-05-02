import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Mail, Phone, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (user) fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', user!.id)
      .single();

    if (data) {
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || user!.email || '',
        phone: data.phone || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
    }).eq('id', user!.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-foreground">My Profile</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input id="email" value={formData.email} disabled className="bg-muted/50" />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+92 300 0000000"
                  />
                </div>
              </div>
              <Button type="submit" variant="accent" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
