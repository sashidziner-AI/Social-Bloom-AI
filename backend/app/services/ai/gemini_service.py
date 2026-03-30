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
) -> str:
    """Build a structured, professional image generation prompt from all requester inputs.

    This is the single source of truth for all social media image prompt construction.
    Every image generation action (auto-generate on approval, manual generate) uses this function.
    """

    # Platform-specific visual direction
    platform_visuals = {
        "instagram": "vibrant colors, bold composition, square 1:1 aspect ratio, Instagram aesthetic, eye-catching visual hierarchy",
        "facebook": "clean layout, professional look, engaging focal point, Facebook-optimized with warm inviting tones",
        "linkedin": "corporate elegance, minimal and polished, business-professional, muted blue and white tones, LinkedIn aesthetic",
        "twitter": "high contrast, bold imagery, attention-grabbing in a fast scroll feed, punchy visual impact",
    }

    # Tone-specific art direction
    tone_art = {
        "professional": "sleek modern design, clean lines, corporate color palette (navy, grey, white), minimalist composition",
        "casual": "warm friendly tones, natural lighting, approachable and relaxed composition, soft gradients",
        "humorous": "bright playful colors, fun illustrated elements, lighthearted and energetic composition",
        "inspirational": "dramatic lighting, aspirational imagery, golden hour tones, uplifting and powerful composition",
        "educational": "clean infographic style, organized visual hierarchy, clear sections, knowledge-forward design",
    }

    visual_style = platform_visuals.get(platform, "professional and engaging")
    art_direction = tone_art.get(platform, tone_art.get(tone, "professional"))

    # Core subject from title and topic
    subject = topic if topic else title

    # Build the structured prompt
    prompt_lines = [
        f"Create a high-quality, professional social media graphic.",
        f"",
        f"SUBJECT: {title}",
        f"BRIEF: {subject}",
    ]

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
        f"- Platform: {platform} ({visual_style})",
        f"- Tone: {tone} ({art_direction})",
        f"- The image must visually represent the subject matter described above",
        f"- Use relevant imagery, icons, or scenes that directly relate to: {subject[:100]}",
        f"- Professional quality, suitable for brand social media accounts",
        f"- Clean composition with strong focal point",
        f"- No watermarks, no stock photo artifacts",
    ])

    if target_audience:
        prompt_lines.append(f"- Design should appeal to: {target_audience}")

    prompt_lines.append(f"- Do NOT include any text or typography in the image unless it is a single short headline")

    return "\n".join(prompt_lines)


def _save_image_bytes(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """Save raw image bytes to the uploads directory and return the URL path."""
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


def generate_image(
    prompt: str,
    content_context: str | None = None,
) -> str | None:
    """Generate an image using Gemini's native image generation. Returns file path."""

    # Strategy 1: Use Gemini multimodal models (generate_content with IMAGE modality)
    # These work on free tier and use the configured Gemini API key
    gemini_image_models = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image-preview",
        "gemini-3-pro-image-preview",
    ]

    for model_name in gemini_image_models:
        for attempt in range(2):
            try:
                logger.info("Trying image generation with %s (attempt %d)...", model_name, attempt + 1)
                response = client.models.generate_content(
                    model=model_name,
                    contents=f"Generate an image based on this description. Only output the image, no text. Description: {prompt}",
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
                            return url_path

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
    imagen_models = ["imagen-4.0-fast-generate-001", "imagen-4.0-generate-001"]
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
                return url_path
        except Exception as e:
            logger.warning("Imagen %s failed: %s", model_name, str(e)[:100])
            continue

    logger.error("All image generation methods failed for prompt: %s", prompt[:100])
    return None
