import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Users, Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';

type AppRole = 'admin' | 'driver' | 'passenger';

interface UserWithRole {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  driver: 'bg-accent/10 text-accent border-accent/20',
  passenger: 'bg-muted text-muted-foreground border-border',
};

export default function ManageUsers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin, authLoading]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, email, phone').order('first_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map<string, AppRole>();
      (rolesRes.data || []).forEach((r: any) => rolesMap.set(r.user_id, r.role));

      const merged: UserWithRole[] = (profilesRes.data || []).map((p: any) => ({
        ...p,
        role: rolesMap.get(p.id) ?? 'passenger',
      }));

      setUsers(merged);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('User role updated successfully');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role: ${error.message}`);
    } finally {
      setUpdatingId(null);
    }
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
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h1 className="font-bold text-foreground">Manage Users</h1>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">{users.length} registered user{users.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No registered users yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <TableRow key={u.id} className={isSelf ? 'bg-muted/30' : ''}>
                        <TableCell className="font-medium">
                          {u.first_name || u.last_name
                            ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                            : <span className="text-muted-foreground italic">No name</span>}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {u.email ?? '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {u.phone ?? '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ROLE_COLORS[u.role]}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground italic">Cannot change own role</span>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(val) => handleRoleChange(u.id, val as AppRole)}
                              disabled={updatingId === u.id}
                            >
                              <SelectTrigger className="w-36">
                                {updatingId === u.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="passenger">Passenger</SelectItem>
                                <SelectItem value="driver">Driver</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
