import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';

interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-purple-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function SettingsPage() {
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      key: 'email_approval',
      label: 'Approval notifications',
      description: 'Email when your content is approved or rejected',
      enabled: true,
    },
    {
      key: 'email_publish',
      label: 'Publish notifications',
      description: 'Email when your content is published',
      enabled: true,
    },
    {
      key: 'email_comment',
      label: 'Comment notifications',
      description: 'Email when someone comments on your content',
      enabled: false,
    },
    {
      key: 'email_assignment',
      label: 'Assignment notifications',
      description: 'Email when content is assigned to you',
      enabled: true,
    },
  ]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const toggleNotification = (key: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.key === key ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const handleSaveNotifications = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSaved(false);

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your preferences</p>
        </div>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Email Notifications
            </h3>
          </div>

          <div className="space-y-4">
            {notifications.map((notif, i) => (
              <motion.div
                key={notif.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{notif.label}</p>
                  <p className="text-xs text-gray-500">{notif.description}</p>
                </div>
                <ToggleSwitch
                  enabled={notif.enabled}
                  onChange={() => toggleNotification(notif.key)}
                />
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <GradientButton size="sm" onClick={handleSaveNotifications}>
              <span className="flex items-center gap-1">
                <Save size={14} /> Save
              </span>
            </GradientButton>
            {notifSaved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-600 flex items-center gap-1"
              >
                <CheckCircle size={14} /> Saved
              </motion.span>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          </div>

          <div className="space-y-4">
            <AnimatedInput
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <AnimatedInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <AnimatedInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />

            {passwordError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <AlertCircle size={14} /> {passwordError}
              </motion.p>
            )}

            {passwordSaved && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-600 flex items-center gap-1"
              >
                <CheckCircle size={14} /> Password updated
              </motion.p>
            )}

            <GradientButton onClick={handleChangePassword}>
              <span className="flex items-center gap-2">
                <Lock size={16} /> Update Password
              </span>
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
