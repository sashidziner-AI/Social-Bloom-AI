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
        author_urn: str | None = None,
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

    def _is_public_url(self, url: str) -> bool:
        """Check if a URL is publicly accessible (not localhost/placeholder)."""
        if not url:
            return False
        lower = url.lower()
        return (
            lower.startswith("https://")
            and "localhost" not in lower
            and "127.0.0.1" not in lower
            and "placehold" not in lower
        )

    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
        author_urn: str | None = None,
    ) -> PublishResult:
        if not self.is_configured():
            return self._simulate(caption)

        message = caption
        if hashtags:
            message += "\n\n" + " ".join(hashtags)

        async with httpx.AsyncClient(timeout=30) as client:
            if image_url and self._is_public_url(image_url):
                response = await client.post(
                    "https://graph.facebook.com/v21.0/me/photos",
                    data={
                        "caption": message,
                        "url": image_url,
                        "access_token": settings.FACEBOOK_ACCESS_TOKEN,
                    },
                )
            else:
                if image_url:
                    logger.warning(
                        "Facebook: image_url '%s' is not publicly accessible, posting as text only",
                        image_url,
                    )
                response = await client.post(
                    "https://graph.facebook.com/v21.0/me/feed",
                    data={
                        "message": message,
                        "access_token": settings.FACEBOOK_ACCESS_TOKEN,
                    },
                )

            if response.status_code != 200:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error_msg = error_data.get("error", {}).get("message", response.text)
                logger.error("Facebook API error (%s): %s", response.status_code, error_msg)
                response.raise_for_status()

            data = response.json()
            post_id = data.get("id", data.get("post_id", ""))
            logger.info("Published to Facebook: %s", post_id)
            return PublishResult(
                post_id=str(post_id),
                post_url=f"https://facebook.com/{post_id}",
            )


class LinkedInAdapter(PlatformAdapter):
    """Publish to LinkedIn via UGC Posts API with image support."""

    @property
    def platform_name(self) -> str:
        return "linkedin"

    def is_configured(self) -> bool:
        return bool(settings.LINKEDIN_ACCESS_TOKEN)

    def _auth_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.LINKEDIN_ACCESS_TOKEN}",
            "X-Restli-Protocol-Version": "2.0.0",
        }

    async def _get_person_urn(self, client: httpx.AsyncClient) -> str:
        """Fetch the authenticated user's LinkedIn person URN."""
        resp = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {settings.LINKEDIN_ACCESS_TOKEN}"},
        )
        resp.raise_for_status()
        sub = resp.json().get("sub", "")
        return f"urn:li:person:{sub}"

    async def _upload_image(self, client: httpx.AsyncClient, author: str, image_path: str) -> str:
        """Upload image to LinkedIn and return the asset URN."""
        import os

        # Step 1: Register the upload
        register_data = {
            "registerUploadRequest": {
                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                "owner": author,
                "serviceRelationships": [
                    {
                        "relationshipType": "OWNER",
                        "identifier": "urn:li:userGeneratedContent",
                    }
                ],
            }
        }

        resp = await client.post(
            "https://api.linkedin.com/v2/assets?action=registerUpload",
            json=register_data,
            headers=self._auth_headers(),
        )
        resp.raise_for_status()
        upload_data = resp.json()

        upload_url = upload_data["value"]["uploadMechanism"][
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]["uploadUrl"]
        asset = upload_data["value"]["asset"]

        # Step 2: Upload the image binary
        # Resolve the local file path from the URL path
        abs_path = os.path.join(
            os.path.abspath(settings.UPLOAD_DIR),
            "..",
            image_path.lstrip("/"),
        )
        abs_path = os.path.abspath(abs_path)

        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Image not found: {abs_path}")

        with open(abs_path, "rb") as f:
            image_data = f.read()

        upload_resp = await client.put(
            upload_url,
            content=image_data,
            headers={
                "Authorization": f"Bearer {settings.LINKEDIN_ACCESS_TOKEN}",
                "Content-Type": "application/octet-stream",
            },
        )
        upload_resp.raise_for_status()

        logger.info("Uploaded image to LinkedIn: %s", asset)
        return asset

    async def publish(
        self,
        caption: str,
        description: str | None = None,
        hashtags: list[str] | None = None,
        image_url: str | None = None,
        author_urn: str | None = None,
    ) -> PublishResult:
        if not self.is_configured():
            return self._simulate(caption)

        text = caption
        if hashtags:
            text += "\n\n" + " ".join(hashtags)

        async with httpx.AsyncClient(timeout=60) as client:
            author = author_urn or await self._get_person_urn(client)

            if image_url:
                # Upload image and create post with image
                asset_urn = await self._upload_image(client, author, image_url)

                share_data = {
                    "author": author,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": text},
                            "shareMediaCategory": "IMAGE",
                            "media": [
                                {
                                    "status": "READY",
                                    "description": {"text": description or ""},
                                    "media": asset_urn,
                                }
                            ],
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                    },
                }
            else:
                # Text-only post
                share_data = {
                    "author": author,
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
                headers=self._auth_headers(),
            )
            response.raise_for_status()
            data = response.json()
            post_id = data.get("id", "")
            logger.info("Published to LinkedIn: %s", post_id)
            return PublishResult(
                post_id=str(post_id),
                post_url=f"https://www.linkedin.com/feed/update/{post_id}",
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
        author_urn: str | None = None,
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
        author_urn: str | None = None,
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
