import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <PageWrapper>
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-500">
            {description || 'This module is coming soon. It will be built in Phase 2.'}
          </p>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
