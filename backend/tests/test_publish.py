from datetime import datetime, timedelta, timezone

from app.models.content_request import ContentRequest, ContentStatus, Platform, Tone
from app.models.publish_job import PublishJob, PublishStatus


def _create_approved_content(db, user_id: int) -> ContentRequest:
    content = ContentRequest(
        title="Approved Post",
        platform=Platform.facebook,
        tone=Tone.professional,
        topic="Test topic",
        status=ContentStatus.approved,
        created_by=user_id,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


class TestCreatePublishJob:
    def test_create(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        response = client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={
                "content_request_id": content.id,
                "platform": "facebook",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "scheduled"
        assert data["platform"] == "facebook"

    def test_create_with_schedule(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        scheduled = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        response = client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={
                "content_request_id": content.id,
                "platform": "facebook",
                "scheduled_at": scheduled,
            },
        )
        assert response.status_code == 201
        assert response.json()["scheduled_at"] is not None

    def test_create_not_approved(self, client, creator_headers, creator_user, db):
        content = ContentRequest(
            title="Draft Post",
            platform=Platform.facebook,
            tone=Tone.casual,
            topic="Test",
            status=ContentStatus.draft,
            created_by=creator_user.id,
        )
        db.add(content)
        db.commit()

        response = client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={
                "content_request_id": content.id,
                "platform": "facebook",
            },
        )
        assert response.status_code == 400


class TestListPublishJobs:
    def test_list_empty(self, client, creator_headers):
        response = client.get("/api/v1/publish/", headers=creator_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_list_with_items(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={"content_request_id": content.id, "platform": "facebook"},
        )
        response = client.get("/api/v1/publish/", headers=creator_headers)
        assert response.json()["total"] == 1

    def test_list_filter_by_platform(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={"content_request_id": content.id, "platform": "facebook"},
        )
        response = client.get(
            "/api/v1/publish/?platform=facebook", headers=creator_headers
        )
        assert response.json()["total"] == 1

        response = client.get(
            "/api/v1/publish/?platform=twitter", headers=creator_headers
        )
        assert response.json()["total"] == 0


class TestCancelPublishJob:
    def test_cancel_scheduled(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        create_resp = client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={"content_request_id": content.id, "platform": "facebook"},
        )
        job_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/publish/{job_id}/cancel", headers=creator_headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    def test_cancel_non_scheduled(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        job = PublishJob(
            content_request_id=content.id,
            platform=Platform.facebook,
            status=PublishStatus.published,
            created_by=creator_user.id,
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        response = client.put(
            f"/api/v1/publish/{job.id}/cancel", headers=creator_headers
        )
        assert response.status_code == 400


class TestRetryPublishJob:
    def test_retry_failed(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        job = PublishJob(
            content_request_id=content.id,
            platform=Platform.facebook,
            status=PublishStatus.failed,
            error_message="Connection timeout",
            created_by=creator_user.id,
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        response = client.post(
            f"/api/v1/publish/{job.id}/retry", headers=creator_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "scheduled"
        assert data["retry_count"] == 1

    def test_retry_non_failed(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        create_resp = client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={"content_request_id": content.id, "platform": "facebook"},
        )
        job_id = create_resp.json()["id"]

        response = client.post(
            f"/api/v1/publish/{job_id}/retry", headers=creator_headers
        )
        assert response.status_code == 400


class TestPublishCalendar:
    def test_calendar(self, client, creator_headers, creator_user, db):
        content = _create_approved_content(db, creator_user.id)
        scheduled = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        client.post(
            "/api/v1/publish/",
            headers=creator_headers,
            json={
                "content_request_id": content.id,
                "platform": "facebook",
                "scheduled_at": scheduled,
            },
        )

        start = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        end = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
        response = client.get(
            f"/api/v1/publish/calendar?start_date={start}&end_date={end}",
            headers=creator_headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 1
