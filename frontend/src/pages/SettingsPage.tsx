import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, Save, CheckCircle, AlertCircle, Link2, Briefcase, Globe } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import api from '../services/api';

interface FacebookPage {
  id: string;
  name: string;
  category: string;
}

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

  // Social connections
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [facebookConnected, setFacebookConnected] = useState<boolean | null>(null);
  const [facebookPageId, setFacebookPageId] = useState<string>('');
  const [facebookHasUserToken, setFacebookHasUserToken] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [facebookLoadingPages, setFacebookLoadingPages] = useState(false);
  const [facebookFlash, setFacebookFlash] = useState<string>('');
  const [linkedinFlash, setLinkedinFlash] = useState<string>('');

  const refreshConnections = async () => {
    try {
      const [lin, fb] = await Promise.all([
        api.get('/auth/linkedin/status'),
        api.get('/auth/facebook/status'),
      ]);
      setLinkedinConnected(!!lin.data.connected);
      setFacebookConnected(!!fb.data.connected);
      setFacebookPageId(fb.data.page_id || '');
      setFacebookHasUserToken(!!fb.data.user_token_present);
    } catch {
      // silent — endpoints may not exist in older backends
    }
  };

  useEffect(() => {
    refreshConnections();
    // Handle OAuth redirect flash messages (?linkedin=connected / ?facebook=pick_page)
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'connected') {
      setLinkedinFlash('LinkedIn connected.');
    } else if (params.get('linkedin') === 'error') {
      setLinkedinFlash(`LinkedIn connect failed: ${params.get('detail') || 'unknown'}`);
    }
    if (params.get('facebook') === 'pick_page') {
      setFacebookFlash('Authorized with Facebook. Now pick the Page to publish to.');
      void loadFacebookPages();
    } else if (params.get('facebook') === 'error') {
      setFacebookFlash(`Facebook connect failed: ${params.get('detail') || 'unknown'}`);
    }
    if (params.get('linkedin') || params.get('facebook')) {
      // strip query so a refresh doesn't keep replaying
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFacebookPages = async () => {
    setFacebookLoadingPages(true);
    try {
      const res = await api.get('/auth/facebook/pages');
      setFacebookPages(res.data.pages || []);
      if (res.data.selected_page_id) setFacebookPageId(res.data.selected_page_id);
      if (res.data.error && !res.data.pages?.length) {
        setFacebookFlash(`Could not load Pages: ${res.data.error}`);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'request failed';
      setFacebookFlash(`Could not load Pages: ${msg}`);
    } finally {
      setFacebookLoadingPages(false);
    }
  };

  const selectFacebookPage = async (pageId: string) => {
    try {
      const res = await api.post(`/auth/facebook/select-page?page_id=${encodeURIComponent(pageId)}`);
      if (res.data.ok) {
        setFacebookConnected(true);
        setFacebookPageId(pageId);
        setFacebookFlash('Facebook Page connected. Ready to publish.');
      } else {
        setFacebookFlash(`Select failed: ${res.data.error || 'unknown'}`);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'request failed';
      setFacebookFlash(`Select failed: ${msg}`);
    }
  };

  const apiOrigin = (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '');
  const connectUrl = (path: string) => `${apiOrigin || ''}${path}`;

  const startFacebookConnect = async () => {
    try {
      const res = await api.post('/auth/facebook/start');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'request failed';
      setFacebookFlash(`Could not start Facebook connect: ${msg}`);
    }
  };

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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your preferences</p>
        </div>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
          </div>

          <div className="space-y-4">
            {/* LinkedIn */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">LinkedIn</p>
                  <p className="text-xs text-gray-500">
                    {linkedinConnected === null
                      ? 'Checking…'
                      : linkedinConnected
                        ? 'Connected — ready to publish to profile + company pages'
                        : 'Not connected'}
                  </p>
                </div>
              </div>
              <a
                href={connectUrl('/api/v1/auth/linkedin')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:brightness-110"
              >
                {linkedinConnected ? 'Reconnect' : 'Connect LinkedIn'}
              </a>
            </div>

            {/* Facebook */}
            <div className="py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Facebook</p>
                    <p className="text-xs text-gray-500">
                      {facebookConnected === null
                        ? 'Checking…'
                        : facebookConnected
                          ? `Connected — Page ID ${facebookPageId}`
                          : facebookHasUserToken
                            ? 'Authorized, but no Page selected yet'
                            : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {facebookHasUserToken && (
                    <button
                      type="button"
                      onClick={loadFacebookPages}
                      disabled={facebookLoadingPages}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {facebookLoadingPages ? 'Loading…' : 'Choose Page'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={startFacebookConnect}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:brightness-110"
                  >
                    {facebookConnected ? 'Reconnect' : 'Connect Facebook'}
                  </button>
                </div>
              </div>

              {facebookPages.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-gray-500">Pick a Page to publish to:</p>
                  <div className="space-y-1.5">
                    {facebookPages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectFacebookPage(p.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                          facebookPageId === p.id
                            ? 'border-purple-300 bg-purple-50 text-purple-800'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">
                              {p.category} · id {p.id}
                            </p>
                          </div>
                          {facebookPageId === p.id && (
                            <CheckCircle size={16} className="text-purple-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {facebookFlash && (
                <p className="mt-3 text-xs text-gray-600 flex items-start gap-1">
                  <AlertCircle size={12} className="mt-0.5" />
                  <span>{facebookFlash}</span>
                </p>
              )}
            </div>

            {linkedinFlash && (
              <p className="text-xs text-gray-600 flex items-start gap-1">
                <AlertCircle size={12} className="mt-0.5" />
                <span>{linkedinFlash}</span>
              </p>
            )}
          </div>
        </GlassCard>

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
