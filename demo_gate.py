import os
from fastapi import HTTPException, status

def require_write_access():
    if os.environ.get("DEMO_MODE", "false").lower() == "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Write operations are disabled in demo mode."
        )
