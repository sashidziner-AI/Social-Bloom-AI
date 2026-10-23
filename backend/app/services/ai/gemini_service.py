import json
import logging
import os
import random
import time
import uuid

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Style angles for varied content generation
_STYLE_ANGLES = [
    "Focus on storytelling and emotional connection",
    "Lead with a surprising fact or statistic",
    "Use a question-based hook to grab attention",
    "Start with a bold statement or hot take",
    "Open with a relatable pain point and offer a solution",
    "Use a conversational, first-person narrative style",
    "Lead with urgency and time-sensitivity",
    "Start with social proof or a testimonial angle",
]


def _call_gemini_with_retry(prompt: str, max_retries: int = 3) -> str:
    """Call Gemini API with automatic retry on rate limit (429) errors."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=1.2,
                ),
            )
            return response.text.strip()
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = 6 * (attempt + 1)
                logger.warning(
                    "Gemini rate limited (attempt %d/%d), retrying in %ds...",
                    attempt + 1, max_retries, wait_time,
                )
                time.sleep(wait_time)
                continue
            raise
    raise RuntimeError("Gemini API rate limit exceeded after all retries")


def _generate_fallback_content(
    topic: str,
    platform: str,
    tone: str,
    audience_str: str,
    keywords: list[str] | None,
) -> dict[str, str | list[str]]:
    """Generate varied fallback content when the API is unavailable."""
    kw_list = keywords or []
    kw_tags = [f"#{kw.replace(' ', '')}" for kw in kw_list[:5]] or ["#socialmedia", "#content", "#marketing"]

    caption_templates = [
        f"Discover how {topic[:80]} is transforming the way {audience_str} work. Ready to level up? {kw_tags[0]}",
        f"Stop scrolling — this is the {tone} take on {topic[:80]} you've been waiting for. {kw_tags[0]}",
        f"What if {topic[:60]} could change everything for {audience_str}? Here's how. {kw_tags[0]}",
        f"The future of {topic[:60]} is here. Are you ready, {audience_str}? Let's dive in. {kw_tags[0]}",
        f"3 reasons why {audience_str} need to pay attention to {topic[:60]} right now. {kw_tags[0]}",
        f"We asked {audience_str} what they think about {topic[:60]}. The answer might surprise you. {kw_tags[0]}",
        f"Here's the {tone} truth about {topic[:60]} that nobody talks about. {kw_tags[0]}",
        f"Imagine a world where {topic[:60]} is effortless for {audience_str}. We're making it happen. {kw_tags[0]}",
    ]

    desc_templates = [
        f"In today's fast-paced {platform} landscape, {topic[:100]} has become essential for {audience_str}. "
        f"Our approach combines innovation with practicality to deliver real results. "
        f"Whether you're just getting started or looking to scale, this is your next move.",
        f"We've been working on something exciting around {topic[:100]}. "
        f"Designed specifically for {audience_str}, it addresses the key challenges you face daily. "
        f"Join the conversation and see what's possible when strategy meets execution.",
        f"The landscape of {topic[:80]} is evolving rapidly, and {audience_str} are at the forefront. "
        f"From emerging trends to proven strategies, we break down what matters most. "
        f"Don't miss out — this is the {tone} perspective you need right now.",
        f"Every {audience_str.split()[0] if audience_str != 'general audience' else 'professional'} knows "
        f"that {topic[:80]} can make or break your strategy. "
        f"Here's our {tone} take on turning insights into action. Ready to transform your approach?",
    ]

    return {
        "caption": random.choice(caption_templates),
        "description": random.choice(desc_templates),
        "hashtags": random.sample(kw_tags, min(len(kw_tags), 5))
        + [f"#{platform}", f"#{tone}content"][:5 - min(len(kw_tags), 5)],
    }


def generate_content_text(
    topic: str,
    platform: str,
    tone: str,
    target_audience: str | None = None,
    keywords: list[str] | None = None,
) -> dict[str, str | list[str]]:
    """Generate caption, description, and hashtags using Gemini."""
    keywords_str = ", ".join(keywords) if keywords else "none specified"
    audience_str = target_audience or "general audience"

    variation_seed = random.randint(1000, 9999)
    chosen_angle = random.choice(_STYLE_ANGLES)

    prompt = f"""You are a social media content expert. Generate FRESH, UNIQUE content for the following request.

Platform: {platform}
Tone: {tone}
Target Audience: {audience_str}
Topic: {topic}
Keywords: {keywords_str}

Creative Direction: {chosen_angle}
Variation Seed: {variation_seed}

Respond in EXACTLY this JSON format (no markdown, no code blocks, just raw JSON):
{{
  "caption": "The main post caption text (2-4 sentences, optimized for {platform})",
  "description": "A longer description/body text (3-5 sentences)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}}

Rules:
- Caption should be engaging and {tone} in tone
- Hashtags should start with # and be relevant to the topic
- Optimize length for {platform} best practices
- Include a call-to-action in the caption
- Produce completely different wording, structure, and angle from any previous output
- Use the creative direction above to shape your approach
"""

    try:
        text = _call_gemini_with_retry(prompt)

        # Clean up any markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:])
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        result = json.loads(text)
        logger.info("Gemini content generated successfully for platform: %s", platform)

        return {
            "caption": result.get("caption", ""),
            "description": result.get("description", ""),
            "hashtags": result.get("hashtags", []),
        }
    except Exception as e:
        logger.error("Gemini content generation failed: %s", e)
        return _generate_fallback_content(topic, platform, tone, audience_str, keywords)


def _hex_to_color_name(hex_color: str) -> str:
    """Convert a hex color to a human-readable color name for image AI models.

    AI image generators understand color names far better than hex codes.
    """
    hex_color = hex_color.lstrip("#").lower()
    if len(hex_color) != 6:
        return hex_color

    r, g, b = int(hex_color[:2], 16), int(hex_color[2:4], 16), int(hex_color[4:], 16)

    # Map to descriptive color names based on HSL-like logic
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    lightness = (max_c + min_c) / 2
    chroma = max_c - min_c

    if chroma < 20:
        if lightness < 40:
            return "black"
        if lightness > 220:
            return "white"
        return "gray"

    # Determine hue
    if max_c == r:
        hue = 60 * ((g - b) / chroma % 6)
    elif max_c == g:
        hue = 60 * ((b - r) / chroma + 2)
    else:
        hue = 60 * ((r - g) / chroma + 4)
    if hue < 0:
        hue += 360

    saturation = chroma / (255 - abs(2 * lightness - 255)) if lightness != 0 and lightness != 255 else 0

    # Brightness prefix
    if lightness < 60:
        brightness = "dark "
    elif lightness > 200:
        brightness = "light "
    elif saturation > 0.7 and lightness > 100:
        brightness = "vivid "
    elif saturation > 0.5:
        brightness = "bright "
    else:
        brightness = ""

    # Hue to color name
    if hue < 15 or hue >= 345:
        color = "red"
    elif hue < 35:
        color = "orange"
    elif hue < 55:
        color = "golden yellow"
    elif hue < 75:
        color = "yellow"
    elif hue < 105:
        color = "yellow-green"
    elif hue < 150:
        color = "green"
    elif hue < 175:
        color = "teal"
    elif hue < 200:
        color = "cyan"
    elif hue < 240:
        color = "blue"
    elif hue < 270:
        color = "indigo"
    elif hue < 300:
        color = "purple"
    elif hue < 330:
        color = "magenta"
    else:
        color = "pink"

    return f"{brightness}{color}"


def build_social_media_image_prompt(
    title: str,
    topic: str,
    platform: str,
    tone: str,
    target_audience: str | None = None,
    caption: str | None = None,
    description: str | None = None,
    keywords: list[str] | None = None,
    hashtags: list[str] | None = None,
    brand_colors: dict[str, str] | None = None,
) -> str:
    """Build a structured, professional image generation prompt from all requester inputs.

    This is the single source of truth for all social media image prompt construction.
    Every image generation action (auto-generate on approval, manual generate) uses this function.
    """

    # Describe layouts WITHOUT naming the social platform — naming "LinkedIn",
    # "Instagram" etc. causes the model to draw the platform's logo on the image.
    if brand_colors:
        platform_visuals = {
            "instagram": "bold composition, square 1:1 aspect ratio, eye-catching visual hierarchy",
            "facebook": "clean layout, professional look, engaging focal point",
            "linkedin": "corporate elegance, minimal and polished, business-professional",
            "twitter": "high contrast, bold imagery, attention-grabbing in a fast scroll feed, punchy visual impact",
        }
        tone_art = {
            "professional": "sleek modern design, clean lines, minimalist composition",
            "casual": "natural lighting, approachable and relaxed composition, soft gradients",
            "humorous": "fun illustrated elements, lighthearted and energetic composition",
            "inspirational": "dramatic lighting, aspirational imagery, uplifting and powerful composition",
            "educational": "clean infographic style, organized visual hierarchy, clear sections, knowledge-forward design",
        }
    else:
        platform_visuals = {
            "instagram": "vibrant colors, bold composition, square 1:1 aspect ratio, eye-catching visual hierarchy",
            "facebook": "clean layout, professional look, engaging focal point, warm inviting tones",
            "linkedin": "corporate elegance, minimal and polished, business-professional",
            "twitter": "high contrast, bold imagery, attention-grabbing in a fast scroll feed, punchy visual impact",
        }
        tone_art = {
            "professional": "sleek modern design, clean lines, minimalist composition",
            "casual": "warm friendly tones, natural lighting, approachable and relaxed composition, soft gradients",
            "humorous": "bright playful colors, fun illustrated elements, lighthearted and energetic composition",
            "inspirational": "dramatic lighting, aspirational imagery, golden hour tones, uplifting and powerful composition",
            "educational": "clean infographic style, organized visual hierarchy, clear sections, knowledge-forward design",
        }

    visual_style = platform_visuals.get(platform, "professional and engaging")
    art_direction = tone_art.get(tone, "professional")

    # Core subject from title and topic
    subject = topic if topic else title

    # Build the structured prompt — brand colors come FIRST as the primary constraint
    prompt_lines = []

    if brand_colors:
        primary = brand_colors['primary_color']
        secondary = brand_colors['secondary_color']
        primary_name = _hex_to_color_name(primary)
        secondary_name = _hex_to_color_name(secondary)
        # Intentionally do NOT mention the company name — the model otherwise
        # invents a wordmark/logo for the brand and bakes it into the scene,
        # which collides with our deterministic post-overlay logo.
        prompt_lines.extend([
            f"Create a high-quality social media graphic.",
            f"",
            f"MANDATORY COLOR PALETTE — this overrides all other visual choices:",
            f"- Primary color: EXACT hex {primary} (approximately {primary_name}) — use as the dominant background color filling most of the image",
            f"- Secondary color: EXACT hex {secondary} (approximately {secondary_name}) — use for accent elements, highlights, borders, and decorative shapes",
            f"- ONLY allowed colors: the two exact hex values above, plus white and black for typography/contrast",
            f"- Match the hex codes precisely; do NOT drift to a different shade",
            f"- Do NOT introduce any other hues — no other blues, greens, reds, oranges, or purples unless they ARE the exact hex values above",
            f"",
        ])
    else:
        prompt_lines.extend([
            f"Create a high-quality, professional social media graphic.",
            f"",
        ])

    prompt_lines.extend([
        f"SUBJECT: {title}",
        f"BRIEF: {subject}",
    ])

    if target_audience:
        prompt_lines.append(f"AUDIENCE: {target_audience}")

    if caption:
        prompt_lines.append(f"POST MESSAGE: {caption}")

    if description:
        prompt_lines.append(f"CONTEXT: {description}")

    if keywords:
        prompt_lines.append(f"THEMES: {', '.join(keywords[:8])}")

    prompt_lines.extend([
        f"",
        f"VISUAL DIRECTION:",
        f"- Style: {visual_style}",
        f"- Tone: {tone} ({art_direction})",
        f"- The image must visually represent the subject matter described above",
        f"- Use relevant scenery, illustrations, or photographic imagery related to: {subject[:100]}",
        f"- Professional quality, suitable for brand social media accounts",
        f"- Clean composition with strong focal point",
        f"- No watermarks, no stock photo artifacts",
    ])

    if target_audience:
        prompt_lines.append(f"- Design should appeal to: {target_audience}")

    prompt_lines.extend([
        f"- STRICT: NO text, NO typography, NO letters, NO numbers, NO words, NO headlines, NO captions, NO labels of any kind in the image",
        f"- STRICT: NO logos, NO icons, NO badges, NO emblems, NO monograms, NO wordmarks, NO signs, NO billboards, NO posters",
        f"- STRICT: do NOT draw the LinkedIn, Facebook, Instagram, Twitter, X, YouTube, TikTok, or any other social media platform mark",
        f"- STRICT: do NOT add any third-party brand logos, company logos, app icons, or recognizable trademarks",
        f"- A separate real brand logo will be composited onto the image after generation — produce ONLY the underlying scene",
    ])

    # Reinforce brand colors at the end so the model doesn't forget
    if brand_colors:
        prompt_lines.extend([
            f"",
            f"REMINDER: The image MUST use the EXACT hex {primary} as the dominant color and EXACT hex {secondary} as the accent color. Match these hex values precisely. No other color palette is acceptable. No social media platform logos or third-party brand marks of any kind.",
        ])

    return "\n".join(prompt_lines)


_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_JPEG_MAGIC = b"\xff\xd8\xff"
_WEBP_RIFF = b"RIFF"


def _save_image_bytes(image_bytes, mime_type: str = "image/png") -> str:
    """Save image data to the uploads directory and return the URL path.

    `image_bytes` may be raw bytes or a base64-encoded str/bytes (the Gemini
    SDK sometimes returns base64 in `inline_data.data` instead of decoded
    bytes). Detect by magic bytes and decode when needed.
    """
    import base64

    if isinstance(image_bytes, str):
        try:
            image_bytes = base64.b64decode(image_bytes, validate=False)
        except Exception:
            image_bytes = image_bytes.encode("latin-1", errors="ignore")
    elif isinstance(image_bytes, (bytearray, memoryview)):
        image_bytes = bytes(image_bytes)

    # If bytes don't start with a real image magic, assume base64 and decode.
    head = image_bytes[:8]
    if not (
        head.startswith(_PNG_MAGIC)
        or head.startswith(_JPEG_MAGIC)
        or head[:4] == _WEBP_RIFF
    ):
        try:
            decoded = base64.b64decode(image_bytes, validate=False)
            if decoded[:8].startswith(_PNG_MAGIC) or decoded[:3].startswith(_JPEG_MAGIC) or decoded[:4] == _WEBP_RIFF:
                image_bytes = decoded
        except Exception:
            pass

    upload_dir = os.path.join(settings.UPLOAD_DIR, "creatives")
    os.makedirs(upload_dir, exist_ok=True)

    ext = "png" if "png" in mime_type else "jpg" if "jpeg" in mime_type or "jpg" in mime_type else "webp"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(image_bytes)

    url_path = f"/uploads/creatives/{filename}"
    logger.info("Image saved: %s (%d bytes)", url_path, len(image_bytes))
    return url_path


_ALLOWED_LOGO_EXTS = {"png", "jpg", "jpeg", "webp", "gif"}


def _resolve_upload_path(url: str) -> str | None:
    """Resolve a /uploads/... URL to a safe absolute disk path, or None.

    Defends against path traversal (see _load_logo_part) and restricts
    to image extensions.
    """
    if not url or not url.startswith("/uploads/"):
        return None
    rel = url[len("/uploads/"):]
    if (
        not rel
        or rel.startswith(("/", "\\"))
        or ".." in rel.replace("\\", "/").split("/")
        or "\x00" in rel
    ):
        return None
    ext = os.path.splitext(rel)[1].lower().lstrip(".")
    if ext not in _ALLOWED_LOGO_EXTS:
        return None
    base = os.path.realpath(settings.UPLOAD_DIR)
    candidate = os.path.realpath(os.path.join(base, rel.replace("/", os.sep)))
    if candidate != base and not candidate.startswith(base + os.sep):
        return None
    return candidate if os.path.exists(candidate) else None


def _overlay_logo_on_image(image_path: str, logo_url: str) -> None:
    """Composite the brand logo onto the generated image as a corner badge.

    Deterministic — runs after Gemini returns. Always-on so the logo is
    actually present even when the text-to-image model ignored the prompt.
    """
    logo_path = _resolve_upload_path(logo_url)
    if not logo_path:
        return
    try:
        from PIL import Image
    except ImportError:
        logger.warning("Pillow not installed; skipping logo overlay")
        return

    try:
        with Image.open(image_path) as base, Image.open(logo_path) as logo:
            base_img = base.convert("RGBA")
            logo_img = logo.convert("RGBA")

            # Scale logo to ~15% of the shorter side, preserving aspect ratio
            target = int(min(base_img.size) * 0.15)
            ratio = target / max(logo_img.size)
            new_size = (max(1, int(logo_img.width * ratio)), max(1, int(logo_img.height * ratio)))
            logo_img = logo_img.resize(new_size, Image.LANCZOS)

            # White rounded-rectangle backdrop so the logo stays legible
            # on any brand-color background
            pad = max(6, target // 12)
            backdrop_size = (logo_img.width + pad * 2, logo_img.height + pad * 2)
            backdrop = Image.new("RGBA", backdrop_size, (255, 255, 255, 230))

            margin = max(12, target // 6)
            bx = base_img.width - backdrop.width - margin
            by = base_img.height - backdrop.height - margin
            base_img.alpha_composite(backdrop, (bx, by))
            base_img.alpha_composite(logo_img, (bx + pad, by + pad))

            # Re-save in the original extension
            ext = os.path.splitext(image_path)[1].lower()
            save_format = "JPEG" if ext in (".jpg", ".jpeg") else "PNG"
            save_img = base_img.convert("RGB") if save_format == "JPEG" else base_img
            save_img.save(image_path, format=save_format)
            logger.info("Logo overlay applied to %s (logo=%s)", image_path, logo_url)
    except Exception as e:
        logger.warning("Logo overlay failed for %s: %s", image_path, e)


def _apply_logo_overlay(url_path: str, brand_colors: dict | None) -> str:
    """Overlay the brand logo on the generated image (if a logo is configured)."""
    logo_url = (brand_colors or {}).get("logo_url", "") if brand_colors else ""
    if not logo_url:
        return url_path
    image_path = _resolve_upload_path(url_path)
    if image_path:
        _overlay_logo_on_image(image_path, logo_url)
    return url_path


def _load_logo_part(logo_url: str):
    """Load a company logo from /uploads/... into a Gemini image Part, or None.

    Defends against path traversal: rejects '..' segments / absolute paths,
    requires the resolved path to live inside UPLOAD_DIR, and restricts to
    an image extension allowlist.
    """
    if not logo_url or not logo_url.startswith("/uploads/"):
        return None

    rel = logo_url[len("/uploads/"):]
    # Reject absolute paths, parent traversal, NULs, or backslashes (Windows-style)
    if (
        not rel
        or rel.startswith(("/", "\\"))
        or ".." in rel.replace("\\", "/").split("/")
        or "\x00" in rel
    ):
        logger.warning("Rejected suspicious logo path: %s", logo_url)
        return None

    ext = os.path.splitext(rel)[1].lower().lstrip(".")
    if ext not in _ALLOWED_LOGO_EXTS:
        logger.warning("Rejected logo with disallowed extension: %s", logo_url)
        return None

    base = os.path.realpath(settings.UPLOAD_DIR)
    candidate = os.path.realpath(os.path.join(base, rel.replace("/", os.sep)))
    if candidate != base and not candidate.startswith(base + os.sep):
        logger.warning("Logo path escapes UPLOAD_DIR: %s -> %s", logo_url, candidate)
        return None

    if not os.path.exists(candidate):
        logger.warning("Logo file missing on disk: %s", candidate)
        return None

    try:
        with open(candidate, "rb") as f:
            data = f.read()
        mime = f"image/{'jpeg' if ext in ('jpg', 'jpeg') else ext}"
        return types.Part.from_bytes(data=data, mime_type=mime)
    except Exception as e:
        logger.warning("Failed to load logo for reference image: %s", e)
        return None


def generate_image(
    prompt: str,
    content_context: str | None = None,
    brand_colors: dict[str, str] | None = None,
) -> str | None:
    """Generate an image using Gemini's native image generation. Returns file path."""

    # Build the wrapper instruction — emphasize brand colors if provided.
    # We do NOT ask the model to draw a logo here: the brand logo is composited
    # onto the final image deterministically by _apply_logo_overlay(). Asking
    # the model to also draw one results in two logos appearing.
    no_logo_rule = (
        "STRICT: do NOT draw any logo, icon, wordmark, monogram, badge, emblem, watermark, signature, "
        "sign, banner, poster, billboard, signage, app icon, brand mark, or any text/typography of any kind "
        "anywhere in the image. The image must be a pure scene with NO writing, NO letters, NO numbers, "
        "NO logos, NO labels. No LinkedIn, Facebook, Instagram, Twitter/X, YouTube, TikTok, or other "
        "social-platform marks. No invented brand logos or company names. A separate, real logo will be "
        "composited onto the image afterwards — your job is to produce ONLY the underlying scene."
    )
    if brand_colors:
        primary = brand_colors['primary_color']
        secondary = brand_colors['secondary_color']
        wrapper = (
            f"Generate an image that strictly uses the EXACT hex colors {primary} (dominant background) "
            f"and {secondary} (accents). Match the hex codes precisely. Do not use any other hues. "
            f"{no_logo_rule} "
            f"Only output the image, no text. "
            f"Full description: {prompt}"
        )
    else:
        wrapper = (
            f"Generate an image based on this description. {no_logo_rule} "
            f"Only output the image, no text. "
            f"Description: {prompt}"
        )

    # Logo is handled exclusively by the deterministic PIL post-overlay
    # (_apply_logo_overlay). We deliberately do NOT pass it as a reference
    # image here, because the model tends to draw an additional copy of any
    # reference image it sees.
    logo_part = None
    if logo_part is not None:
        contents = [
            wrapper,
            logo_part,
        ]
    else:
        contents = wrapper

    # Strategy 1: Gemini multimodal models with IMAGE response modality
    gemini_image_models = [
        "gemini-2.0-flash-preview-image-generation",
        "gemini-2.0-flash-exp",
    ]

    for model_name in gemini_image_models:
        for attempt in range(2):
            try:
                logger.info("Trying image generation with %s (attempt %d, logo=%s)...", model_name, attempt + 1, bool(logo_part))
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                    ),
                )

                # Extract image from response parts
                if response.candidates:
                    for part in response.candidates[0].content.parts:
                        if part.inline_data and part.inline_data.data:
                            url_path = _save_image_bytes(
                                part.inline_data.data,
                                part.inline_data.mime_type or "image/png",
                            )
                            logger.info("Image generated with %s: %s", model_name, url_path)
                            return _apply_logo_overlay(url_path, brand_colors)

                logger.warning("Model %s returned no image data", model_name)
                break  # No point retrying same model if it returned empty

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning("%s rate limited, waiting 6s before retry...", model_name)
                    time.sleep(6)
                    continue
                logger.warning("Image generation with %s failed: %s", model_name, error_str[:150])
                break  # Non-rate-limit error, try next model

    # Strategy 2: Try Imagen API (requires paid plan, but try anyway)
    imagen_models = ["imagen-3.0-fast-generate-001", "imagen-3.0-generate-001"]
    for model_name in imagen_models:
        try:
            logger.info("Trying Imagen API with %s...", model_name)
            response = client.models.generate_images(
                model=model_name,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                    safety_filter_level="BLOCK_MEDIUM_AND_ABOVE",
                ),
            )
            if response.generated_images:
                url_path = _save_image_bytes(
                    response.generated_images[0].image.image_bytes,
                    "image/png",
                )
                logger.info("Image generated with Imagen %s: %s", model_name, url_path)
                return _apply_logo_overlay(url_path, brand_colors)
        except Exception as e:
            logger.warning("Imagen %s failed: %s", model_name, str(e)[:100])
            continue

    # Strategy 3: Fall back to OpenAI gpt-image-1
    openai_url = _generate_with_openai(prompt)
    if openai_url:
        return _apply_logo_overlay(openai_url, brand_colors)

    logger.error("All image generation methods failed for prompt: %s", prompt[:100])
    return None


def _generate_with_openai(prompt: str) -> str | None:
    """Fallback image generation via OpenAI gpt-image-1."""
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        logger.warning("OpenAI fallback skipped: OPENAI_API_KEY not configured")
        return None

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("OpenAI fallback skipped: openai package not installed")
        return None

    try:
        logger.info("Trying image generation with OpenAI gpt-image-1...")
        client = OpenAI(api_key=api_key)
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
            n=1,
        )
        if response.data and response.data[0].b64_json:
            import base64
            image_bytes = base64.b64decode(response.data[0].b64_json)
            url_path = _save_image_bytes(image_bytes, "image/png")
            logger.info("Image generated with OpenAI gpt-image-1: %s", url_path)
            return url_path
        logger.warning("OpenAI gpt-image-1 returned no image data")
    except Exception as e:
        logger.warning("OpenAI gpt-image-1 failed: %s", str(e)[:200])

    return None
