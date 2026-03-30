import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { PlatformIcon } from '../../components/ui/PlatformIcons';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { TextArea } from '../../components/ui/TextArea';
import { Select } from '../../components/ui/Select';
import { useCreateContentRequest } from '../../hooks/useContentRequests';

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
];

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
];

export function ContentRequestCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateContentRequest();

  const [title, setTitle] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [tone, setTone] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [topic, setTopic] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [error, setError] = useState('');

  const togglePlatform = (value: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(value)
        ? prev.filter((p) => p !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }
    try {
      const keywords = keywordsStr
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      // Create one content request per selected platform
      for (const platform of selectedPlatforms) {
        const requestTitle = selectedPlatforms.length > 1
          ? `${title} (${platformOptions.find((p) => p.value === platform)?.label || platform})`
          : title;
        await createMutation.mutateAsync({
          title: requestTitle,
          platform,
          tone,
          target_audience: targetAudience || undefined,
          topic,
          keywords,
        });
      }
      navigate('/posters');
    } catch {
      setError('Failed to create content request');
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          New Content Request
        </h1>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <AnimatedInput
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Product Launch Announcement"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms <span className="text-xs text-gray-400 font-normal">(select one or more)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {platformOptions.map((opt) => {
                  const isSelected = selectedPlatforms.includes(opt.value);
                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => togglePlatform(opt.value)}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <PlatformIcon platform={opt.value} size={20} />
                      <span>{opt.label}</span>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
                        >
                          <Check size={12} className="text-white" />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              {selectedPlatforms.length > 1 && (
                <p className="text-xs text-purple-600 mt-2">
                  {selectedPlatforms.length} platforms selected — a separate request will be created for each
                </p>
              )}
            </div>

            <Select
              label="Tone"
              value={tone}
              onChange={setTone}
              options={toneOptions}
              placeholder="Select tone"
            />

            <AnimatedInput
              label="Target Audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="E.g., Marketing professionals aged 25-40"
            />

            <TextArea
              label="Topic / Brief"
              value={topic}
              onChange={setTopic}
              placeholder="Describe what this content should be about..."
              rows={5}
              required
            />

            <AnimatedInput
              label="Keywords (comma-separated)"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              placeholder="E.g., marketing, social media, growth"
            />

            <div className="flex gap-3 pt-2">
              <GradientButton
                type="submit"
                isLoading={createMutation.isPending}
              >
                Create Request
              </GradientButton>
              <GradientButton
                variant="secondary"
                onClick={() => navigate('/posters')}
              >
                Cancel
              </GradientButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
