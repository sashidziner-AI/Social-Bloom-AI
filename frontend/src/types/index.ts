export type UserRole = 'admin' | 'manager' | 'team_lead' | 'creator' | 'designer';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export type Platform = 'facebook' | 'linkedin' | 'instagram' | 'twitter';
export type Tone = 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational';
export type ContentStatus = 'draft' | 'pending_review' | 'reviewed' | 'designer_review' | 'approved' | 'rejected' | 'revision_requested' | 'confirmed' | 'published';
export type CreativeType = 'image' | 'video' | 'carousel';
export type CreativeStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'designer_review'
  | 'designer_replaced'
  | 'submitted'
  | 'tl_approved'
  | 'approved'
  | 'rejected';
export type ApprovalLevel = 'team_lead' | 'manager';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type PublishStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
export type PublishTarget = 'profile' | 'company_page' | 'both';

export interface ContentRequest {
  id: number;
  title: string;
  platform: Platform;
  tone: Tone;
  target_audience: string | null;
  topic: string;
  keywords: string[];
  generated_caption: string | null;
  generated_description: string | null;
  generated_hashtags: string[];
  status: ContentStatus;
  company_id: number | null;
  created_by: number;
  assigned_to: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface Creative {
  id: number;
  content_request_id: number;
  creative_type: CreativeType;
  prompt: string | null;
  ai_generated_url: string | null;
  designer_uploaded_url: string | null;
  final_url: string | null;
  status: CreativeStatus;
  notes: string | null;
  created_by: number;
  reviewed_by: number | null;
  assigned_to: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface Approval {
  id: number;
  entity_type: 'content_request' | 'creative';
  entity_id: number;
  approval_level: ApprovalLevel;
  status: ApprovalStatus;
  reviewer_id: number | null;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface PublishJob {
  id: number;
  content_request_id: number;
  content_title: string | null;
  creative_id: number | null;
  platform: Platform;
  scheduled_at: string | null;
  published_at: string | null;
  status: PublishStatus;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  publish_target: PublishTarget;
  target_org_ids: number[] | null;
  created_by: number;
  created_at: string;
  updated_at: string | null;
}

export interface LinkedInOrganization {
  org_id: string;
  name: string;
  logo_url: string | null;
}

export interface Analytics {
  id: number;
  content_request_id: number;
  platform: Platform;
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  comments_count: number;
  engagement_rate: number;
  fetched_at: string;
}

export interface Company {
  id: number;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
}

export type TemplatePlatform = 'linkedin' | 'instagram' | 'facebook';
export type LogoPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';

export interface CompanyTemplate {
  id: number;
  company_id: number;
  platform: TemplatePlatform;
  name: string;
  width: number;
  height: number;
  bg_color: string | null;
  text_color: string;
  heading_font_size: number;
  body_font_size: number;
  logo_position: LogoPosition;
  overlay_opacity: number;
  default_cta: string | null;
  default_hashtags: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
