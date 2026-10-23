import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Send, Clock, Shield, Check, X, ChevronDown, Save, RotateCcw, UserCog, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { DataTable } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { adminService } from '../../services/adminService';
import type { AdminStats, UserPermissionsResponse, PermissionEntry, RoleDefaultsResponse } from '../../services/adminService';
import type { User } from '../../types';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'creator', label: 'Requester' },
  { value: 'designer', label: 'Designer' },
];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  team_lead: 'Team Lead',
  creator: 'Requester',
  designer: 'Designer',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  team_lead: 'bg-purple-100 text-purple-700',
  creator: 'bg-green-100 text-green-700',
  designer: 'bg-amber-100 text-amber-700',
};

const roles = ['admin', 'manager', 'team_lead', 'creator', 'designer'] as const;

const roleDefaultPermissions: Record<string, Record<string, boolean>> = {
  admin: {
    'content_requests.create': true, 'content_requests.view_all': true,
    'ai.generate': true,
    'creatives.review': true, 'creatives.upload': true,
    'approvals.first_level': true, 'approvals.final': true, 'approvals.reject': true,
    'publishing.publish': true,
    'admin.user_management': true, 'admin.system_settings': true, 'admin.audit_logs': true, 'admin.analytics': true,
  },
  manager: {
    'content_requests.create': true, 'content_requests.view_all': true,
    'ai.generate': true,
    'creatives.review': true, 'creatives.upload': false,
    'approvals.first_level': true, 'approvals.final': true, 'approvals.reject': true,
    'publishing.publish': true,
    'admin.user_management': false, 'admin.system_settings': false, 'admin.audit_logs': true, 'admin.analytics': true,
  },
  team_lead: {
    'content_requests.create': true, 'content_requests.view_all': true,
    'ai.generate': true,
    'creatives.review': true, 'creatives.upload': false,
    'approvals.first_level': true, 'approvals.final': false, 'approvals.reject': true,
    'publishing.publish': false,
    'admin.user_management': false, 'admin.system_settings': false, 'admin.audit_logs': false, 'admin.analytics': true,
  },
  creator: {
    'content_requests.create': true, 'content_requests.view_all': false,
    'ai.generate': true,
    'creatives.review': false, 'creatives.upload': false,
    'approvals.first_level': false, 'approvals.final': false, 'approvals.reject': false,
    'publishing.publish': false,
    'admin.user_management': false, 'admin.system_settings': false, 'admin.audit_logs': false, 'admin.analytics': false,
  },
  designer: {
    'content_requests.create': false, 'content_requests.view_all': false,
    'ai.generate': false,
    'creatives.review': true, 'creatives.upload': true,
    'approvals.first_level': false, 'approvals.final': false, 'approvals.reject': false,
    'publishing.publish': false,
    'admin.user_management': false, 'admin.system_settings': false, 'admin.audit_logs': false, 'admin.analytics': false,
  },
};

const permissionGroupsMeta = [
  {
    category: 'Content Requests',
    permissions: [
      { key: 'content_requests.create', name: 'Create/edit content requests' },
      { key: 'content_requests.view_all', name: 'View all content' },
    ],
  },
  {
    category: 'AI Generation',
    permissions: [
      { key: 'ai.generate', name: 'Generate AI content' },
    ],
  },
  {
    category: 'Creatives',
    permissions: [
      { key: 'creatives.review', name: 'Review/replace creatives' },
      { key: 'creatives.upload', name: 'Upload assets' },
    ],
  },
  {
    category: 'Approvals',
    permissions: [
      { key: 'approvals.first_level', name: 'First-level approval' },
      { key: 'approvals.final', name: 'Final approval' },
      { key: 'approvals.reject', name: 'Reject (with comments)' },
    ],
  },
  {
    category: 'Publishing',
    permissions: [
      { key: 'publishing.publish', name: 'Publish content' },
    ],
  },
  {
    category: 'Administration',
    permissions: [
      { key: 'admin.user_management', name: 'User management' },
      { key: 'admin.system_settings', name: 'System settings' },
      { key: 'admin.audit_logs', name: 'View audit logs' },
      { key: 'admin.analytics', name: 'View analytics' },
    ],
  },
];

function RoleDefaultsTable({ showPermissions, setShowPermissions }: { showPermissions: boolean; setShowPermissions: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editPerms, setEditPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: roleDefaultsData } = useQuery<RoleDefaultsResponse>({
    queryKey: ['role-defaults'],
    queryFn: () => adminService.getRoleDefaults().then((r) => r.data),
  });

  const effectiveDefaults = roleDefaultsData?.defaults ?? roleDefaultPermissions;

  const startEditing = useCallback(() => {
    const copy: Record<string, Record<string, boolean>> = {};
    for (const role of roles) {
      copy[role] = { ...(effectiveDefaults[role] ?? {}) };
    }
    setEditPerms(copy);
    setIsEditing(true);
  }, [effectiveDefaults]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditPerms({});
  }, []);

  const togglePerm = useCallback((role: string, permKey: string) => {
    setEditPerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permKey]: !prev[role]?.[permKey] },
    }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const role of roles) {
        await adminService.updateRoleDefaults(role, editPerms[role] ?? {});
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-defaults'] });
      setIsEditing(false);
      setEditPerms({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <button
        onClick={() => setShowPermissions(!showPermissions)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white">
            <Shield size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-gray-900">Role-Based Permissions</h2>
            <p className="text-sm text-gray-500">Default permission matrix for all roles</p>
          </div>
        </div>
        <motion.span animate={{ rotate: showPermissions ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-400">
          <ChevronDown size={20} />
        </motion.span>
      </button>

      <AnimatePresence>
        {showPermissions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200/50 overflow-hidden"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50/60 border-b border-gray-200/50">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <UserCog size={14} />
                <span>{isEditing ? 'Editing permissions — toggle checkboxes to customize' : 'Click Edit Permissions to modify role defaults'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={cancelEditing}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <X size={14} />
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <Save size={14} />
                      {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startEditing}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      saveSuccess
                        ? 'text-green-700 bg-green-50 border border-green-200'
                        : 'text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    {saveSuccess ? <Check size={14} /> : <Pencil size={14} />}
                    {saveSuccess ? 'Saved Successfully' : 'Edit Permissions'}
                  </motion.button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th key={role} className="text-center px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[role]}`}>
                          {roleLabels[role]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionGroupsMeta.map((group) => (
                    <PermissionCategoryRows
                      key={group.category}
                      category={group.category}
                      permissions={group.permissions}
                      isEditing={isEditing}
                      editPerms={editPerms}
                      effectiveDefaults={effectiveDefaults}
                      onToggle={togglePerm}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/50">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Approval Workflow</h3>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {[
                  { label: 'Draft', color: 'bg-gray-200 text-gray-700' },
                  { label: 'Pending Review', color: 'bg-amber-100 text-amber-700' },
                  { label: 'Reviewed (Team Lead)', color: 'bg-blue-100 text-blue-700' },
                  { label: 'Approved (Manager)', color: 'bg-green-100 text-green-700' },
                  { label: 'Published', color: 'bg-purple-100 text-purple-700' },
                ].map((step, i, arr) => (
                  <span key={step.label} className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full font-medium ${step.color}`}>{step.label}</span>
                    {i < arr.length - 1 && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function PermissionCategoryRows({
  category,
  permissions,
  isEditing,
  editPerms,
  effectiveDefaults,
  onToggle,
}: {
  category: string;
  permissions: { key: string; name: string }[];
  isEditing: boolean;
  editPerms: Record<string, Record<string, boolean>>;
  effectiveDefaults: Record<string, Record<string, boolean>>;
  onToggle: (role: string, permKey: string) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={1 + roles.length} className="px-6 py-2.5 bg-gradient-to-r from-gray-100/80 to-transparent text-xs font-bold text-gray-600 uppercase tracking-wider">
          {category}
        </td>
      </tr>
      {permissions.map((perm) => (
        <tr key={perm.key} className="border-t border-gray-100 hover:bg-purple-50/30 transition-colors">
          <td className="px-6 py-3 text-sm text-gray-700">{perm.name}</td>
          {roles.map((role) => {
            if (isEditing) {
              const granted = editPerms[role]?.[perm.key] ?? false;
              return (
                <td key={role} className="px-4 py-3 text-center">
                  <label className="inline-flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={granted}
                      onChange={() => onToggle(role, perm.key)}
                      className="sr-only peer"
                    />
                    <span
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        granted
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {granted && <Check size={14} className="text-white" />}
                    </span>
                  </label>
                </td>
              );
            }
            const granted = effectiveDefaults[role]?.[perm.key] ?? false;
            return (
              <td key={role} className="px-4 py-3 text-center">
                {granted ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                    <Check size={14} className="text-green-600" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
                    <X size={14} className="text-red-400" />
                  </span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function UserPermissionEditor({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: permData, isLoading } = useQuery<UserPermissionsResponse>({
    queryKey: ['user-permissions', user.id],
    queryFn: () => adminService.getUserPermissions(user.id).then((r) => r.data),
  });

  useEffect(() => {
    if (permData) {
      const perms: Record<string, boolean> = {};
      for (const group of permData.groups) {
        for (const perm of group.permissions) {
          perms[perm.key] = perm.granted;
        }
      }
      setLocalPerms(perms);
      setHasChanges(false);
    }
  }, [permData]);

  const saveMutation = useMutation({
    mutationFn: () => adminService.updateUserPermissions(user.id, localPerms),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-permissions', user.id] });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const togglePermission = useCallback((key: string) => {
    setLocalPerms((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return updated;
    });
  }, []);

  const resetToRoleDefaults = useCallback(() => {
    if (!permData) return;
    const defaults: Record<string, boolean> = {};
    for (const group of permData.groups) {
      for (const perm of group.permissions) {
        defaults[perm.key] = perm.role_default;
      }
    }
    setLocalPerms(defaults);
    setHasChanges(true);
  }, [permData]);

  const isCustom = useCallback(
    (perm: PermissionEntry) => {
      if (!permData) return false;
      return localPerms[perm.key] !== perm.role_default;
    },
    [localPerms, permData],
  );

  const roleStr = user.role;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="mt-4 rounded-2xl border border-purple-200/60 bg-white/90 backdrop-blur-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white">
              <UserCog size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user.full_name || user.email}</h3>
              <p className="text-xs text-gray-500">
                Role: <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${roleColors[roleStr]}`}>{roleLabels[roleStr]}</span>
                <span className="ml-2 text-gray-400">
                  Customized permissions override role defaults
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetToRoleDefaults}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
            >
              <RotateCcw size={12} />
              Reset to Defaults
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white transition-all ${
                saveSuccess
                  ? 'bg-green-500'
                  : hasChanges
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saveSuccess ? <Check size={12} /> : <Save size={12} />}
              {saveSuccess ? 'Saved' : saveMutation.isPending ? 'Saving...' : 'Save'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X size={16} />
            </motion.button>
          </div>
        </div>

        {/* Permission Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
          </div>
        ) : permData ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permData.groups.map((group) => (
                <div key={group.category} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {group.category}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {group.permissions.map((perm) => {
                      const custom = isCustom(perm);
                      const granted = localPerms[perm.key] ?? perm.granted;
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-purple-50/30 ${
                            custom ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{perm.name}</span>
                            {custom && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={() => togglePermission(perm.key)}
                              className="sr-only peer"
                            />
                            <div className={`w-9 h-5 rounded-full transition-colors ${granted ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                granted ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500" /> Granted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-300" /> Denied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">CUSTOM</span>
                Overrides role default
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function AdminPage() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getStats().then((r) => r.data),
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', { role: roleFilter, page }],
    queryFn: () =>
      adminService.listUsers({ role: roleFilter || undefined, page }).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; is_active?: boolean } }) =>
      adminService.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: <Users size={22} />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Content Requests', value: stats?.total_content_requests || 0, icon: <FileText size={22} />, color: 'from-purple-500 to-pink-500' },
    { label: 'Published', value: stats?.total_published || 0, icon: <Send size={22} />, color: 'from-green-500 to-emerald-500' },
    { label: 'Pending Approvals', value: stats?.total_pending_approvals || 0, icon: <Clock size={22} />, color: 'from-amber-500 to-orange-500' },
  ];

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <div>
          <p className="font-medium text-gray-900">{user.full_name || '-'}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <select
          value={user.role}
          onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 capitalize"
        >
          {roleOptions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (user: User) => new Date(user.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
            className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${
              editingUserId === user.id
                ? 'text-purple-700 bg-purple-100'
                : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Shield size={12} />
            Permissions
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              updateMutation.mutate({
                id: user.id,
                data: { is_active: !user.is_active },
              })
            }
            className={`text-xs px-3 py-1 rounded-full ${
              user.is_active
                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                : 'text-green-600 bg-green-50 hover:bg-green-100'
            }`}
          >
            {user.is_active ? 'Deactivate' : 'Activate'}
          </motion.button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Admin Panel</h1>
          <p className="text-gray-500 mt-1">Platform management and user administration</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Role Defaults */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <RoleDefaultsTable showPermissions={showPermissions} setShowPermissions={setShowPermissions} />
        </motion.div>

        {/* User Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleOptions}
              placeholder="All Roles"
              className="w-44"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={usersData?.items || []}
                keyExtractor={(user) => user.id}
                emptyMessage="No users found"
                renderRowExpansion={(user: User) =>
                  editingUserId === user.id ? (
                    <UserPermissionEditor user={user} onClose={() => setEditingUserId(null)} />
                  ) : null
                }
              />
              {usersData && (
                <Pagination
                  page={page}
                  totalPages={Math.ceil(usersData.total / usersData.per_page)}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
