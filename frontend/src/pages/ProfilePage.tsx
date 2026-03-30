import { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Shield, Calendar, Save, CheckCircle } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  team_lead: 'bg-purple-100 text-purple-700',
  creator: 'bg-green-100 text-green-700',
  designer: 'bg-orange-100 text-orange-700',
};

export function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await authService.updateMe({ full_name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const roleLabel = user.role.replace(/_/g, ' ');
  const badgeColor = roleBadgeColors[user.role] || 'bg-gray-100 text-gray-700';

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1">View and manage your account</p>
        </div>

        <GlassCard>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
              {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.full_name || 'No name set'}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${badgeColor}`}
              >
                <Shield size={12} className="mr-1" />
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail size={18} className="text-gray-400" />
              <span>{user.email}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-600">
              <Calendar size={18} className="text-gray-400" />
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-600">
              <CheckCircle
                size={18}
                className={user.is_verified ? 'text-green-500' : 'text-gray-300'}
              />
              <span>{user.is_verified ? 'Verified' : 'Not verified'}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>

          <div className="space-y-4">
            <AnimatedInput
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <UserIcon size={14} />
                <span>Email cannot be changed</span>
              </div>
            </motion.div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {saved && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-green-600 flex items-center gap-1"
              >
                <CheckCircle size={14} /> Profile updated successfully
              </motion.p>
            )}

            <GradientButton onClick={handleSave} isLoading={saving}>
              <span className="flex items-center gap-2">
                <Save size={16} /> Save Changes
              </span>
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
