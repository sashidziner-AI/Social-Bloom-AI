class TestAdminUsers:
    def test_list_users(self, client, admin_headers, creator_user):
        response = client.get("/api/v1/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_list_users_forbidden(self, client, creator_headers):
        response = client.get("/api/v1/admin/users", headers=creator_headers)
        assert response.status_code == 403

    def test_update_user_role(self, client, admin_headers, creator_user):
        response = client.put(
            f"/api/v1/admin/users/{creator_user.id}",
            headers=admin_headers,
            json={"role": "designer"},
        )
        assert response.status_code == 200
        assert response.json()["role"] == "designer"

    def test_deactivate_user(self, client, admin_headers, creator_user):
        response = client.delete(
            f"/api/v1/admin/users/{creator_user.id}",
            headers=admin_headers,
        )
        assert response.status_code == 204


class TestAdminStats:
    def test_stats(self, client, admin_headers):
        response = client.get("/api/v1/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_content_requests" in data

    def test_stats_forbidden(self, client, creator_headers):
        response = client.get("/api/v1/admin/stats", headers=creator_headers)
        assert response.status_code == 403


class TestPermissionRegistry:
    def test_get_registry(self, client, admin_headers):
        response = client.get(
            "/api/v1/admin/permissions/registry",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_registry_forbidden(self, client, creator_headers):
        response = client.get(
            "/api/v1/admin/permissions/registry",
            headers=creator_headers,
        )
        assert response.status_code == 403


class TestUserPermissions:
    def test_get_user_permissions(self, client, admin_headers, creator_user):
        response = client.get(
            f"/api/v1/admin/users/{creator_user.id}/permissions",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == creator_user.id
        assert "groups" in data


class TestRoleDefaults:
    def test_get_role_defaults(self, client, admin_headers):
        response = client.get(
            "/api/v1/admin/permissions/role-defaults",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "defaults" in data
