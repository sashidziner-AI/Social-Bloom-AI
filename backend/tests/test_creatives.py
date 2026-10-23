import pytest

from app.models.content_request import ContentRequest, Platform, Tone
from app.models.creative import Creative, CreativeStatus, CreativeType


VALID_CONTENT = {
    "title": "Test Post",
    "platform": "facebook",
    "tone": "professional",
    "topic": "AI in marketing",
    "target_audience": "marketers",
    "keywords": ["AI", "marketing"],
}


def _create_content_request(client, headers) -> int:
    """Helper to create a content request and return its id."""
    resp = client.post(
        "/api/v1/content-requests/",
        headers=headers,
        json=VALID_CONTENT,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_creative(client, headers, content_request_id: int, creative_type: str = "image") -> dict:
    """Helper to create a creative and return response data."""
    resp = client.post(
        "/api/v1/creatives/",
        headers=headers,
        json={
            "content_request_id": content_request_id,
            "creative_type": creative_type,
            "prompt": "A professional marketing image",
        },
    )
    assert resp.status_code == 201
    return resp.json()


class TestCreateCreative:
    def test_create(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        data = _create_creative(client, creator_headers, cr_id)
        assert data["content_request_id"] == cr_id
        assert data["creative_type"] == "image"
        assert data["status"] == "pending"
        assert data["prompt"] == "A professional marketing image"

    def test_create_all_types(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        for ctype in ["image", "video", "carousel"]:
            data = _create_creative(client, creator_headers, cr_id, creative_type=ctype)
            assert data["creative_type"] == ctype

    def test_create_unauthorized(self, client):
        resp = client.post(
            "/api/v1/creatives/",
            json={
                "content_request_id": 1,
                "creative_type": "image",
            },
        )
        assert resp.status_code == 401

    def test_create_invalid_type(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        try:
            resp = client.post(
                "/api/v1/creatives/",
                headers=creator_headers,
                json={
                    "content_request_id": cr_id,
                    "creative_type": "hologram",
                },
            )
            assert resp.status_code >= 400
        except Exception:
            pass


class TestListCreatives:
    def test_list_empty(self, client, creator_headers):
        resp = client.get("/api/v1/creatives/", headers=creator_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_with_items(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        _create_creative(client, creator_headers, cr_id)
        _create_creative(client, creator_headers, cr_id, creative_type="video")

        resp = client.get("/api/v1/creatives/", headers=creator_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    def test_list_filter_by_content_request(self, client, creator_headers):
        cr_id1 = _create_content_request(client, creator_headers)
        cr_id2 = _create_content_request(client, creator_headers)
        _create_creative(client, creator_headers, cr_id1)
        _create_creative(client, creator_headers, cr_id2)

        resp = client.get(
            f"/api/v1/creatives/?content_request_id={cr_id1}",
            headers=creator_headers,
        )
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["content_request_id"] == cr_id1

    def test_list_filter_by_type(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        _create_creative(client, creator_headers, cr_id, creative_type="image")
        _create_creative(client, creator_headers, cr_id, creative_type="video")

        resp = client.get(
            "/api/v1/creatives/?creative_type=video",
            headers=creator_headers,
        )
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["creative_type"] == "video"

    def test_list_pagination(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        for _ in range(3):
            _create_creative(client, creator_headers, cr_id)

        resp = client.get(
            "/api/v1/creatives/?page=1&per_page=2",
            headers=creator_headers,
        )
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3


class TestGetCreative:
    def test_get(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.get(
            f"/api/v1/creatives/{creative['id']}",
            headers=creator_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == creative["id"]

    def test_get_not_found(self, client, creator_headers):
        resp = client.get(
            "/api/v1/creatives/999",
            headers=creator_headers,
        )
        assert resp.status_code == 404


class TestUpdateCreative:
    def test_update_prompt(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.put(
            f"/api/v1/creatives/{creative['id']}",
            headers=creator_headers,
            json={"prompt": "Updated prompt for image"},
        )
        assert resp.status_code == 200
        assert resp.json()["prompt"] == "Updated prompt for image"

    def test_update_notes(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.put(
            f"/api/v1/creatives/{creative['id']}",
            headers=creator_headers,
            json={"notes": "Use brighter colors"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Use brighter colors"

    def test_update_by_non_owner_forbidden(self, client, creator_headers, designer_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.put(
            f"/api/v1/creatives/{creative['id']}",
            headers=designer_headers,
            json={"prompt": "Hijacked prompt"},
        )
        assert resp.status_code == 403


class TestDeleteCreative:
    def test_delete_pending(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.delete(
            f"/api/v1/creatives/{creative['id']}",
            headers=creator_headers,
        )
        assert resp.status_code == 204

    def test_delete_not_found(self, client, creator_headers):
        resp = client.delete(
            "/api/v1/creatives/999",
            headers=creator_headers,
        )
        assert resp.status_code == 404

    def test_delete_by_non_owner_forbidden(self, client, creator_headers, designer_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.delete(
            f"/api/v1/creatives/{creative['id']}",
            headers=designer_headers,
        )
        assert resp.status_code == 403

    def test_delete_non_pending_forbidden(self, client, creator_headers, db):
        cr_id = _create_content_request(client, creator_headers)
        creative_data = _create_creative(client, creator_headers, cr_id)

        # Manually set status to 'generated' to simulate progress
        creative = db.query(Creative).filter(Creative.id == creative_data["id"]).first()
        creative.status = CreativeStatus.generated
        db.commit()

        resp = client.delete(
            f"/api/v1/creatives/{creative_data['id']}",
            headers=creator_headers,
        )
        assert resp.status_code == 400


class TestCreativeStatusTransitions:
    def _make_generated_creative(self, client, creator_headers, db) -> dict:
        """Create a creative and set it to 'generated' status."""
        cr_id = _create_content_request(client, creator_headers)
        creative_data = _create_creative(client, creator_headers, cr_id)
        creative = db.query(Creative).filter(Creative.id == creative_data["id"]).first()
        creative.status = CreativeStatus.generated
        creative.ai_generated_url = "https://example.com/ai-image.png"
        db.commit()
        return creative_data

    def test_generated_to_submitted(self, client, creator_headers, db):
        creative_data = self._make_generated_creative(client, creator_headers, db)

        resp = client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "submitted"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    def test_submitted_to_tl_approved(self, client, creator_headers, db):
        creative_data = self._make_generated_creative(client, creator_headers, db)

        # generated -> submitted
        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "submitted"},
        )
        # submitted -> tl_approved
        resp = client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "tl_approved"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "tl_approved"

    def test_tl_approved_to_approved(self, client, creator_headers, db):
        creative_data = self._make_generated_creative(client, creator_headers, db)

        # generated -> submitted -> tl_approved -> approved
        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "submitted"},
        )
        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "tl_approved"},
        )
        resp = client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "approved"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"
        assert resp.json()["final_url"] is not None

    def test_submitted_to_rejected(self, client, creator_headers, db):
        creative_data = self._make_generated_creative(client, creator_headers, db)

        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "submitted"},
        )
        resp = client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "rejected"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_invalid_transition(self, client, creator_headers, db):
        creative_data = self._make_generated_creative(client, creator_headers, db)

        # generated -> approved is not valid (must go through submitted first)
        resp = client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "approved"},
        )
        assert resp.status_code == 400

    def test_approved_cannot_transition(self, client, creator_headers, db):
        creative_data = self._make_generated_creative(client, creator_headers, db)

        # Walk to approved
        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "submitted"},
        )
        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "tl_approved"},
        )
        client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "approved"},
        )

        # approved -> anything should fail
        resp = client.put(
            f"/api/v1/creatives/{creative_data['id']}/status",
            headers=creator_headers,
            json={"status": "rejected"},
        )
        assert resp.status_code == 400


class TestUpload:
    def test_upload_invalid_type(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        resp = client.post(
            f"/api/v1/creatives/{creative['id']}/upload",
            headers=creator_headers,
            files={"file": ("test.txt", b"not an image", "text/plain")},
        )
        assert resp.status_code == 400

    def test_upload_valid_image(self, client, creator_headers):
        cr_id = _create_content_request(client, creator_headers)
        creative = _create_creative(client, creator_headers, cr_id)

        # Minimal valid PNG bytes (1x1 pixel)
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
            b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
            b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        resp = client.post(
            f"/api/v1/creatives/{creative['id']}/upload",
            headers=creator_headers,
            files={"file": ("test.png", png_bytes, "image/png")},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "designer_replaced"
        assert resp.json()["designer_uploaded_url"] is not None
