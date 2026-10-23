import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Building2, Globe, Loader2, AlertTriangle, Check } from 'lucide-react';
import { GradientButton } from '../ui/GradientButton';
import { PlatformIcon } from '../ui/PlatformIcons';
import { useLinkedInOrganizations } from '../../hooks/usePublish';
import type { PublishTarget, ContentRequest } from '../../types';

interface PublishTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (target: PublishTarget, orgIds?: number[], selectedPlatformIds?: number[]) => void;
  platform: string;
  isLoading: boolean;
  allPlatformRequests?: ContentRequest[];
}

export function PublishTargetModal({
  isOpen,
  onClose,
  onPublish,
  platform,
  isLoading,
  allPlatformRequests = [],
}: PublishTargetModalProps) {
  const [target, setTarget] = useState<PublishTarget>('profile');
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const { data: orgData, isLoading: orgsLoading } = useLinkedInOrganizations();
  const organizations = orgData?.items ?? [];
  const missingScopes = orgData?.missing_scopes ?? [];
  const hasOrgAccess = orgData?.has_org_access ?? true;

  const hasMultiplePlatforms = allPlatformRequests.length > 1;

  // Select all platforms by default when modal opens
  useEffect(() => {
    if (isOpen && allPlatformRequests.length > 0) {
      setSelectedPlatformIds(allPlatformRequests.map((r) => r.id));
    }
  }, [isOpen, allPlatformRequests]);

  // Check if any selected platform is LinkedIn (for org selection)
  const hasLinkedInSelected = allPlatformRequests
    .filter((r) => selectedPlatformIds.includes(r.id))
    .some((r) => r.platform === 'linkedin');

  const handleSubmit = () => {
    setError('');

    if (hasMultiplePlatforms && selectedPlatformIds.length === 0) {
      setError('Please select at least one platform to publish');
      return;
    }

    if (hasLinkedInSelected && (target === 'company_page' || target === 'both') && selectedOrgIds.length === 0) {
      setError('Please select at least one company page');
      return;
    }

    const orgIds = target === 'profile' ? undefined : selectedOrgIds;
    onPublish(target, orgIds, hasMultiplePlatforms ? selectedPlatformIds : undefined);
  };

  const toggleOrg = (orgId: number) => {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
    setError('');
  };

  const togglePlatform = (reqId: number) => {
    setSelectedPlatformIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
    setError('');
  };

  const toggleAllPlatforms = () => {
    if (selectedPlatformIds.length === allPlatformRequests.length) {
      setSelectedPlatformIds([]);
    } else {
      setSelectedPlatformIds(allPlatformRequests.map((r) => r.id));
    }
  };

  const targetOptions: { value: PublishTarget; label: string; icon: typeof User; description: string }[] = [
    {
      value: 'profile',
      label: 'Profile Page',
      icon: User,
      description: 'Publish to your personal profile',
    },
    {
      value: 'company_page',
      label: 'Company Page',
      icon: Building2,
      description: 'Publish to a company page you manage',
    },
    {
      value: 'both',
      label: 'Both',
      icon: Globe,
      description: 'Publish to your profile and company page(s)',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Publish Content</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Platform Selection — shown when multiple platforms exist */}
              {hasMultiplePlatforms && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Platforms to Publish
                    </label>
                    <button
                      type="button"
                      onClick={toggleAllPlatforms}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      {selectedPlatformIds.length === allPlatformRequests.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {allPlatformRequests.map((req) => {
                      const isSelected = selectedPlatformIds.includes(req.id);
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => togglePlatform(req.id)}
                          className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <PlatformIcon platform={req.platform} size={20} />
                          <span className="capitalize">{req.platform}</span>
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
                            >
                              <Check size={12} className="text-white" />
                            </motion.span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedPlatformIds.length} of {allPlatformRequests.length} platforms selected
                  </p>
                </div>
              )}

              {/* Target Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Where would you like to publish?
                </label>
                <div className="space-y-2">
                  {targetOptions.map((option) => {
                    const Icon = option.icon;
                    const isDisabled =
                      !hasLinkedInSelected && !platform.includes('linkedin') && option.value !== 'profile';
                    const isSelected = target === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setTarget(option.value);
                          if (option.value === 'profile') {
                            setSelectedOrgIds([]);
                          }
                          setError('');
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-purple-500' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!hasLinkedInSelected && !platform.includes('linkedin') && (
                  <p className="text-xs text-amber-600 mt-1">
                    Company page publishing is only available for LinkedIn.
                  </p>
                )}
              </div>

              {/* Company Page Selection */}
              {hasLinkedInSelected && (target === 'company_page' || target === 'both') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="block text-sm font-medium text-gray-700">
                    Select Company Page(s)
                  </label>

                  {orgsLoading ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-gray-500">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Loading company pages...</span>
                    </div>
                  ) : !hasOrgAccess && missingScopes.length > 0 ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            LinkedIn app missing required permissions
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Your LinkedIn Developer App needs the <strong>Community Management API</strong> product enabled.
                            Organization scopes were requested but not granted by LinkedIn.
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            Missing scopes: {missingScopes.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-red-700 bg-red-100 rounded-lg p-3 space-y-1">
                        <p className="font-medium">To fix this:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline font-medium">LinkedIn Developer Apps</a></li>
                          <li>Select your app &rarr; <strong>Products</strong> tab</li>
                          <li>Request access to <strong>Community Management API</strong></li>
                          <li>Once approved, re-authorize LinkedIn in Settings</li>
                        </ol>
                      </div>
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-800">
                        No company pages found. Make sure you have admin access to a LinkedIn company page.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {organizations.map((org) => {
                        const orgIdNum = parseInt(org.org_id, 10);
                        const isChecked = selectedOrgIds.includes(orgIdNum);
                        return (
                          <label
                            key={org.org_id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              isChecked
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOrg(orgIdNum)}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            {org.logo_url ? (
                              <img
                                src={org.logo_url}
                                alt={org.name}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Building2 size={14} className="text-gray-500" />
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">{org.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <GradientButton variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </GradientButton>
              <GradientButton
                size="sm"
                onClick={handleSubmit}
                isLoading={isLoading}
                disabled={
                  isLoading ||
                  (hasMultiplePlatforms && selectedPlatformIds.length === 0) ||
                  (hasLinkedInSelected &&
                    (target === 'company_page' || target === 'both') &&
                    organizations.length === 0)
                }
              >
                <span className="flex items-center gap-2">
                  Publish{hasMultiplePlatforms && selectedPlatformIds.length > 1
                    ? ` to ${selectedPlatformIds.length} Platforms`
                    : ' Now'}
                </span>
              </GradientButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
