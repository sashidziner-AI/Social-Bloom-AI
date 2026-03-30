from app.models.content_request import ContentRequest, ContentStatus, Platform, Tone
from app.models.creative import Creative, CreativeStatus


class TestDashboardStats:
    def test_creator_dashboard(self, client, creator_headers, creator_user, db):
        content = ContentRequest(
            title="My Post",
            platform=Platform.facebook,
            tone=Tone.professional,
            topic="Test",
            status=ContentStatus.draft,
            created_by=creator_user.id,
        )
        db.add(content)
        db.commit()

        response = client.get(
            "/api/v1/analytics/dashboard", headers=creator_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["my_requests"] == 1
        assert data["drafts"] == 1

    def test_admin_dashboard(self, client, admin_headers, admin_user, db):
        response = client.get(
            "/api/v1/analytics/dashboard", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_content" in data

    def test_manager_dashboard(self, client, manager_headers):
        response = client.get(
            "/api/v1/analytics/dashboard", headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "content_pending_review" in data

    def test_team_lead_dashboard(self, client, team_lead_headers):
        response = client.get(
            "/api/v1/analytics/dashboard", headers=team_lead_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "content_pending_review" in data
        assert "ready_to_publish" in data

    def test_designer_dashboard(self, client, designer_headers, designer_user, db):
        response = client.get(
            "/api/v1/analytics/dashboard", headers=designer_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "assigned_creatives" in data

    def test_recent_activity_included(self, client, creator_headers, creator_user, db):
        content = ContentRequest(
            title="Recent Post",
            platform=Platform.linkedin,
            tone=Tone.casual,
            topic="Recent",
            status=ContentStatus.draft,
            created_by=creator_user.id,
        )
        db.add(content)
        db.commit()

        response = client.get(
            "/api/v1/analytics/dashboard", headers=creator_headers
        )
        data = response.json()
        assert "recent_activity" in data
        assert len(data["recent_activity"]) > 0


class TestOverview:
    def test_overview(self, client, creator_headers):
        response = client.get(
            "/api/v1/analytics/overview", headers=creator_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_impressions" in data
        assert "avg_engagement_rate" in data


class TestPlatformAnalytics:
    def test_platform_analytics(self, client, creator_headers):
        response = client.get(
            "/api/v1/analytics/platform/facebook", headers=creator_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "facebook"
        assert "total_posts" in data


class TestTeamProductivity:
    def test_team_productivity_admin(self, client, admin_headers):
        response = client.get(
            "/api/v1/analytics/team", headers=admin_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_team_productivity_forbidden_for_creator(self, client, creator_headers):
        response = client.get(
            "/api/v1/analytics/team", headers=creator_headers
        )
        assert response.status_code == 403
