import asyncio
import os

import jwt
from fastapi import Header, HTTPException

_jwks_client: jwt.PyJWKClient | None = None


def _supabase_url() -> str:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not url:
        raise HTTPException(503, "Server auth is not configured (SUPABASE_URL is unset).")
    return url


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(
            f"{_supabase_url()}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600
        )
    return _jwks_client


def _decode(token: str) -> dict:
    key = _get_jwks_client().get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
        issuer=f"{_supabase_url()}/auth/v1",
    )


async def require_user(authorization: str = Header(default="")) -> str:
    """FastAPI dependency: verify the Supabase access token and return the user id."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Sign in required.")
    try:
        claims = await asyncio.to_thread(_decode, token)
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(503, "Could not reach the auth server — try again shortly.")
    except (jwt.InvalidTokenError, jwt.PyJWKClientError):
        raise HTTPException(401, "Your session has expired — sign in again.")
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(401, "Your session has expired — sign in again.")
    return user_id
