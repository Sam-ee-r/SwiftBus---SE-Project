import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';

type AppRole = 'admin' | 'driver' | 'passenger';

interface UserWithRole {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
}

export default function ManageUsers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin, authLoading, navigate]);

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

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-electric-violet">sync</span>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-md">
        {/* Header section */}
        <div className="mb-lg flex justify-between items-end">
          <div>
            <h1 className="font-h2 text-h2 text-on-surface mb-xs">Manage Users</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">View, modify, and assign roles to system users.</p>
          </div>
        </div>

        {/* Glassmorphic Table Container */}
        <div className="bg-surface-container/40 backdrop-blur-xl border border-outline-variant rounded-xl overflow-hidden shadow-2xl">
          {/* Toolbar */}
          <div className="p-md border-b border-outline-variant/50 flex flex-col sm:flex-row justify-between items-center gap-3 bg-surface-container-low/30">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                className="w-full bg-surface-dim border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-on-surface font-body-md text-body-md focus:border-electric-violet focus:ring-1 focus:ring-electric-violet outline-none transition-all placeholder:text-outline" 
                placeholder="Search users..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">shield</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-surface-dim border border-outline-variant rounded-lg py-2 pl-9 pr-8 font-label-md text-label-md text-on-surface focus:outline-none focus:border-electric-violet transition-all cursor-pointer appearance-none"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
                <option value="passenger">Passenger</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredUsers.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4">group</span>
                <p className="text-outline">No users found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/40 text-on-surface-variant font-label-md text-label-md border-b border-outline-variant/80">
                    <th className="px-6 py-4 font-semibold w-1/4">Name</th>
                    <th className="px-6 py-4 font-semibold w-1/4">Email</th>
                    <th className="px-6 py-4 font-semibold w-1/6">Phone</th>
                    <th className="px-6 py-4 font-semibold w-1/6">Current Role</th>
                    <th className="px-6 py-4 font-semibold w-1/6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    const initials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() || '?';
                    
                    return (
                      <tr key={u.id} className={`hover:bg-surface-container/60 transition-colors group ${isSelf ? 'bg-white/5' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              u.role === 'admin' ? 'bg-error-container text-on-error-container' : 
                              u.role === 'driver' ? 'bg-secondary-container text-on-secondary-container' : 
                              'bg-surface-bright text-on-surface'
                            }`}>
                              {initials}
                            </div>
                            <div className="font-body-md text-body-md text-on-surface font-medium">
                              {`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'No Name'}
                              {isSelf && <span className="ml-2 text-xs text-on-surface-variant italic">(you)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant font-body-md text-body-md">{u.email ?? '-'}</td>
                        <td className="px-6 py-4 text-on-surface-variant font-body-md text-body-md">{u.phone ?? '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full font-label-sm text-label-sm border ${
                            u.role === 'admin' ? 'bg-error-container text-on-error-container border-error/20 shadow-[0_0_10px_rgba(147,0,10,0.3)]' :
                            u.role === 'driver' ? 'bg-secondary text-on-secondary border-secondary/20 shadow-[0_0_10px_rgba(67,238,184,0.2)]' :
                            'bg-surface-bright text-on-surface border-outline-variant'
                          }`}>
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-on-surface-variant italic">Cannot change own role</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <div className="relative inline-block text-left">
                                <select 
                                  className="bg-surface-dim border border-outline-variant rounded-md px-3 py-1.5 text-on-surface font-label-md text-label-md focus:border-electric-violet focus:ring-1 focus:ring-electric-violet outline-none transition-all cursor-pointer appearance-none pr-8 disabled:opacity-50"
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as AppRole)}
                                  disabled={updatingId === u.id}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="driver">Driver</option>
                                  <option value="passenger">Passenger</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">expand_more</span>
                                {updatingId === u.id && (
                                  <span className="absolute -left-6 top-1/2 -translate-y-1/2 material-symbols-outlined animate-spin text-sm text-electric-violet">sync</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteUser(u.id, `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || 'this user')}
                                className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
                                title="Delete user"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {filteredUsers.length > 0 && (
            <div className="p-4 border-t border-outline-variant/50 flex items-center justify-between bg-surface-container-low/30">
              <div className="text-sm text-on-surface-variant">
                Showing <span className="font-medium text-on-surface">{filteredUsers.length}</span> results
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
