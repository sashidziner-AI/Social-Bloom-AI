"""Platform adapters for social media publishing.

Each adapter handles publishing to a specific platform (Facebook, LinkedIn,
Instagram, Twitter/X). If API credentials are not configured, adapters
fall back to simulation mode with mock responses.
"""

import logging
from abc import ABC, abstractmethod

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PublishResult:
    """Result from a platform publish operation."""

    def __init__(self, post_id: str, post_url: str):
        self.post_id = post_id
        self.post_url = post_url


class PlatformAdapter(ABC):
    """Base class for social media platform adapters."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        ...

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if API credentials are available."""
        ...

    @abstractmethod
    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
    ) -> PublishResult:
        """Publish content to the platform."""
        ...

    def _simulate(self, caption: str) -> PublishResult:
        """Return simulated publish result when credentials are missing."""
        import uuid

        post_id = f"sim_{self.platform_name}_{uuid.uuid4().hex[:8]}"
        post_url = f"https://{self.platform_name}.com/post/{post_id}"
        logger.warning(
            "%s adapter running in simulation mode (no credentials configured)",
            self.platform_name.capitalize(),
        )
        return PublishResult(post_id=post_id, post_url=post_url)


class FacebookAdapter(PlatformAdapter):
    """Publish to Facebook Pages via Graph API."""

    @property
    def platform_name(self) -> str:
        return "facebook"

    def is_configured(self) -> bool:
        return bool(settings.FACEBOOK_ACCESS_TOKEN)

    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
    ) -> PublishResult:
        if not self.is_configured():
            return self._simulate(caption)

        message = caption
        if hashtags:
            message += "\n\n" + " ".join(hashtags)

        async with httpx.AsyncClient(timeout=30) as client:
            if image_url:
                response = await client.post(
                    "https://graph.facebook.com/v18.0/me/photos",
                    data={
                        "caption": message,
                        "url": image_url,
                        "access_token": settings.FACEBOOK_ACCESS_TOKEN,
                    },
                )
            else:
                response = await client.post(
                    "https://graph.facebook.com/v18.0/me/feed",
                    data={
                        "message": message,
                        "access_token": settings.FACEBOOK_ACCESS_TOKEN,
                    },
                )

            response.raise_for_status()
            data = response.json()
            post_id = data.get("id", data.get("post_id", ""))
            logger.info("Published to Facebook: %s", post_id)
            return PublishResult(
                post_id=str(post_id),
                post_url=f"https://facebook.com/{post_id}",
            )


class LinkedInAdapter(PlatformAdapter):
    """Publish to LinkedIn via Share API."""

    @property
    def platform_name(self) -> str:
        return "linkedin"

    def is_configured(self) -> bool:
        return bool(settings.LINKEDIN_CLIENT_ID and settings.LINKEDIN_CLIENT_SECRET)

    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
    ) -> PublishResult:
        if not self.is_configured():
            return self._simulate(caption)

        text = caption
        if hashtags:
            text += "\n\n" + " ".join(hashtags)

        async with httpx.AsyncClient(timeout=30) as client:
            share_data = {
                "author": "urn:li:person:me",
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": text},
                        "shareMediaCategory": "NONE",
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                },
            }

            response = await client.post(
                "https://api.linkedin.com/v2/ugcPosts",
                json=share_data,
                headers={
                    "Authorization": f"Bearer {settings.LINKEDIN_CLIENT_SECRET}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            response.raise_for_status()
            data = response.json()
            post_id = data.get("id", "")
            logger.info("Published to LinkedIn: %s", post_id)
            return PublishResult(
                post_id=str(post_id),
                post_url=f"https://linkedin.com/feed/update/{post_id}",
            )


class InstagramAdapter(PlatformAdapter):
    """Publish to Instagram via Graph API (Business accounts)."""

    @property
    def platform_name(self) -> str:
        return "instagram"

    def is_configured(self) -> bool:
        return bool(settings.INSTAGRAM_ACCESS_TOKEN)

    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
    ) -> PublishResult:
        if not self.is_configured():
            return self._simulate(caption)

        message = caption
        if hashtags:
            message += "\n\n" + " ".join(hashtags)

        if not image_url:
            logger.warning("Instagram requires an image; using simulation")
            return self._simulate(caption)

        async with httpx.AsyncClient(timeout=30) as client:
            # Step 1: Create media container
            create_resp = await client.post(
                "https://graph.facebook.com/v18.0/me/media",
                data={
                    "image_url": image_url,
                    "caption": message,
                    "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
                },
            )
            create_resp.raise_for_status()
            container_id = create_resp.json().get("id")

            # Step 2: Publish the container
            publish_resp = await client.post(
                "https://graph.facebook.com/v18.0/me/media_publish",
                data={
                    "creation_id": container_id,
                    "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
                },
            )
            publish_resp.raise_for_status()
            data = publish_resp.json()
            post_id = data.get("id", "")
            logger.info("Published to Instagram: %s", post_id)
            return PublishResult(
                post_id=str(post_id),
                post_url=f"https://instagram.com/p/{post_id}",
            )


class TwitterAdapter(PlatformAdapter):
    """Publish to Twitter/X via v2 API."""

    @property
    def platform_name(self) -> str:
        return "twitter"

    def is_configured(self) -> bool:
        return bool(settings.TWITTER_API_KEY and settings.TWITTER_API_SECRET)

    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
    ) -> PublishResult:
        if not self.is_configured():
            return self._simulate(caption)

        text = caption
        if hashtags:
            text += "\n" + " ".join(hashtags)

        # Twitter has a 280 char limit
        if len(text) > 280:
            text = text[:277] + "..."

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.twitter.com/2/tweets",
                json={"text": text},
                headers={
                    "Authorization": f"Bearer {settings.TWITTER_API_SECRET}",
                },
            )
            response.raise_for_status()
            data = response.json()
            post_id = data.get("data", {}).get("id", "")
            logger.info("Published to Twitter: %s", post_id)
            return PublishResult(
                post_id=str(post_id),
                post_url=f"https://twitter.com/i/status/{post_id}",
            )


def get_adapter(platform: str) -> PlatformAdapter:
    """Get the appropriate adapter for the given platform."""
    adapters: dict[str, PlatformAdapter] = {
        "facebook": FacebookAdapter(),
        "linkedin": LinkedInAdapter(),
        "instagram": InstagramAdapter(),
        "twitter": TwitterAdapter(),
    }
    adapter = adapters.get(platform)
    if not adapter:
        raise ValueError(f"Unsupported platform: {platform}")
    return adapter
