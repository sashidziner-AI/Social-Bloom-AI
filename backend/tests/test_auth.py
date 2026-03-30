from app.auth.jwt import create_access_token, decode_token, hash_password, verify_password


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "secure_password123"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password(self):
        hashed = hash_password("correct")
        assert not verify_password("wrong", hashed)


class TestJWT:
    def test_create_and_decode_access_token(self):
        token = create_access_token({"sub": "42"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "42"
        assert payload["type"] == "access"

    def test_decode_invalid_token(self):
        assert decode_token("invalid.token.here") is None

    def test_decode_empty_token(self):
        assert decode_token("") is None


class TestAuthEndpoints:
    def test_register(self, client):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@test.com",
                "password": "password123",
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@test.com"
        assert data["full_name"] == "New User"
        assert data["role"] == "creator"

    def test_register_duplicate_email(self, client, creator_user):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "creator@test.com",
                "password": "password123",
            },
        )
        assert response.status_code == 409

    def test_login(self, client, creator_user):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "creator@test.com", "password": "testpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, creator_user):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "creator@test.com", "password": "wrong"},
        )
        assert response.status_code == 400

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "nobody@test.com", "password": "pass"},
        )
        assert response.status_code == 400

    def test_me(self, client, creator_headers):
        response = client.get("/api/v1/auth/me", headers=creator_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "creator@test.com"
        assert data["role"] == "creator"

    def test_me_unauthorized(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_update_me(self, client, creator_headers):
        response = client.put(
            "/api/v1/auth/me",
            headers=creator_headers,
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"

    def test_refresh_token(self, client, creator_user):
        import time

        login_resp = client.post(
            "/api/v1/auth/login",
            data={"username": "creator@test.com", "password": "testpass123"},
        )
        refresh_token = login_resp.json()["refresh_token"]

        # Small delay to ensure new token has different timestamp
        time.sleep(1)

        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_invalid_token(self, client):
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 400

    def test_logout(self, client, creator_user):
        login_resp = client.post(
            "/api/v1/auth/login",
            data={"username": "creator@test.com", "password": "testpass123"},
        )
        tokens = login_resp.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        response = client.post(
            "/api/v1/auth/logout",
            headers=headers,
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 204

    def test_me_permissions(self, client, admin_headers):
        response = client.get("/api/v1/auth/me/permissions", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert all(isinstance(v, bool) for v in data.values())
