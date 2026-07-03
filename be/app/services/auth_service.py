from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import User
from fastapi.responses import RedirectResponse
from fastapi import Request, HTTPException
from httpx import AsyncClient
from datetime import datetime, timezone
from app.core.security import create_access_token

class AuthService:
    def __init__(self, frontend_url: str, backend_url:str, steam_api_key: str, steam_openid_url: str):
        self.frontend_url = frontend_url
        self.backend_url = backend_url
        self.steam_api_key = steam_api_key
        self.steam_openid_url = steam_openid_url

    async def steam_login(self):
        params = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "checkid_setup",
            "openid.return_to": f"{self.backend_url}/api/v1/auth/steam/callback",
            "openid.realm": self.backend_url,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select"
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        redirect_url = f"{self.steam_openid_url}?{query_string}"

        return redirect_url

    async def steam_callback(self, request: Request, db: AsyncSession):
        params = dict(request.query_params)
        val_params = params.copy()
        val_params["openid.mode"] = "check_authentication"

        async with AsyncClient() as client:
            response = await client.post(self.steam_openid_url, params=val_params)

            if "is_valid:true" not in response.text:
                raise HTTPException(
                    status_code=400, detail="Validation error")

            claimed_id = params.get("openid.claimed_id", "")
            steam_id = claimed_id.split("/")[-1]

            if not steam_id or len(steam_id) != 17:
                raise HTTPException(status_code=400, detail="Invalid steam id")

            steam_user_url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"

            user_params = {
                "key": self.steam_api_key,
                "steamids": steam_id,
            }

            user_response = await client.get(steam_user_url, params=user_params)
            user_data = user_response.json()

            player_profile = user_data["response"]["players"][0]
            personaname = player_profile.get("personaname", "CS2 Player")
            avatar_url = player_profile.get("avatarfull", "")

            result = await db.execute(select(User).where(User.steam_id == steam_id))
            user = result.scalars().first()

            current_time = datetime.now(timezone.utc).replace(tzinfo=None)

            if not user:
                user = User(
                    steam_id=steam_id,
                    name=personaname,
                    avatar_url=avatar_url,
                    last_login_at=current_time
                )
                db.add(user)
            else:
                user.name = personaname
                user.avatar_url = avatar_url
                user.last_login_at = current_time

            await db.commit()
            await db.refresh(user)

            token = create_access_token(subject=user.user_id)

            redirect_to_frontend = f"{self.frontend_url}/login-success?token={token}"
            return redirect_to_frontend


