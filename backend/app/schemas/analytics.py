from pydantic import BaseModel


class AnalyticsResponse(BaseModel):
    id: int
    content_request_id: int
    platform: str
    impressions: int
    clicks: int
    likes: int
    shares: int
    comments_count: int
    engagement_rate: float

    class Config:
        from_attributes = True


class OverviewResponse(BaseModel):
    total_impressions: int
    total_clicks: int
    total_likes: int
    total_shares: int
    avg_engagement_rate: float


class PlatformAnalyticsResponse(BaseModel):
    platform: str
    total_posts: int
    total_impressions: int
    total_engagement: int


class TeamProductivityResponse(BaseModel):
    user_id: int
    full_name: str | None
    content_created: int
    content_approved: int
    content_published: int
