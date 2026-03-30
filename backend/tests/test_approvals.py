from app.models.content_request import ContentRequest, ContentStatus, Platform, Tone


def _create_pending_content(db, user_id: int) -> ContentRequest:
    content = ContentRequest(
        title="Review Me",
        platform=Platform.facebook,
        tone=Tone.professional,
        topic="Approval test",
        status=ContentStatus.pending_review,
        created_by=user_id,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


class TestSubmitForApproval:
    def test_submit(self, client, creator_headers, creator_user, db):
        content = _create_pending_content(db, creator_user.id)
        response = client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["entity_type"] == "content_request"
        assert data["approval_level"] == "team_lead"
        assert data["status"] == "pending"


class TestListApprovals:
    def test_list_empty(self, client, creator_headers):
        response = client.get("/api/v1/approvals/", headers=creator_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    def test_list_with_items(self, client, creator_headers, creator_user, db):
        content = _create_pending_content(db, creator_user.id)
        client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        response = client.get("/api/v1/approvals/", headers=creator_headers)
        assert response.json()["total"] == 1

    def test_list_filter_by_status(self, client, creator_headers, creator_user, db):
        content = _create_pending_content(db, creator_user.id)
        client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        response = client.get(
            "/api/v1/approvals/?status=pending", headers=creator_headers
        )
        assert response.json()["total"] == 1

        response = client.get(
            "/api/v1/approvals/?status=approved", headers=creator_headers
        )
        assert response.json()["total"] == 0


class TestApprovalActions:
    def test_approve(
        self, client, creator_headers, team_lead_headers, creator_user, db
    ):
        content = _create_pending_content(db, creator_user.id)
        create_resp = client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        approval_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/approvals/{approval_id}/approve",
            headers=team_lead_headers,
            json={"comments": "Looks good"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"

    def test_reject(
        self, client, creator_headers, team_lead_headers, creator_user, db
    ):
        content = _create_pending_content(db, creator_user.id)
        create_resp = client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        approval_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/approvals/{approval_id}/reject",
            headers=team_lead_headers,
            json={"comments": "Needs work"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    def test_request_revision(
        self, client, creator_headers, team_lead_headers, creator_user, db
    ):
        content = _create_pending_content(db, creator_user.id)
        create_resp = client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        approval_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/approvals/{approval_id}/request-revision",
            headers=team_lead_headers,
            json={"comments": "Please revise the caption"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "revision_requested"


class TestApprovalHistory:
    def test_history(
        self, client, creator_headers, team_lead_headers, creator_user, db
    ):
        content = _create_pending_content(db, creator_user.id)
        create_resp = client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )
        approval_id = create_resp.json()["id"]

        client.put(
            f"/api/v1/approvals/{approval_id}/approve",
            headers=team_lead_headers,
            json={"comments": "LGTM"},
        )

        response = client.get(
            f"/api/v1/approvals/history/content_request/{content.id}",
            headers=creator_headers,
        )
        assert response.status_code == 200
        history = response.json()
        assert len(history) >= 1


class TestPendingApproval:
    def test_get_pending(self, client, creator_headers, creator_user, db):
        content = _create_pending_content(db, creator_user.id)
        client.post(
            "/api/v1/approvals/",
            headers=creator_headers,
            json={"entity_type": "content_request", "entity_id": content.id},
        )

        response = client.get(
            f"/api/v1/approvals/pending/content_request/{content.id}",
            headers=creator_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"

    def test_no_pending(self, client, creator_headers):
        response = client.get(
            "/api/v1/approvals/pending/content_request/999",
            headers=creator_headers,
        )
        assert response.status_code == 200
        assert response.json()["id"] is None
