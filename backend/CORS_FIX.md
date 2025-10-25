# CORS Configuration Fix

## Issue
The backend/.env file may contain ALLOWED_ORIGINS that override the comprehensive CORS configuration in config.py.

## Solution
**Remove the ALLOWED_ORIGINS line from backend/.env** to let config.py use its default comprehensive list.

## Current CORS Origins in config.py
The config.py file contains these comprehensive CORS origins:
- https://rentalai.ai
- https://www.rentalai.ai
- http://rentalai.ai
- http://www.rentalai.ai
- https://rentalai-monorepo.vercel.app
- http://localhost:3000
- http://localhost:3001
- http://127.0.0.1:3000
- https://rental-ai-frontend.vercel.app

## VPS Instructions
On your VPS at `/var/www/rentalai-monorepo/backend/.env`:

1. **Check if ALLOWED_ORIGINS exists:**
   ```bash
   grep -n "ALLOWED_ORIGINS" /var/www/rentalai-monorepo/backend/.env
   ```

2. **If it exists, remove it:**
   ```bash
   sed -i '/ALLOWED_ORIGINS/d' /var/www/rentalai-monorepo/backend/.env
   ```

3. **Or manually edit the file and remove the ALLOWED_ORIGINS line**

4. **Restart the backend service:**
   ```bash
   sudo systemctl restart rental-ai-backend
   # or
   pm2 restart rental-ai-backend
   ```

## Alternative (if you must override)
If you need to override CORS origins, use this format in .env:
```
ALLOWED_ORIGINS=["https://rentalai.ai","https://www.rentalai.ai","http://rentalai.ai","http://www.rentalai.ai","https://rentalai-monorepo.vercel.app","http://localhost:3000","http://localhost:3001","http://127.0.0.1:3000","https://rental-ai-frontend.vercel.app"]
```

## Verification
After making changes, test CORS by checking the browser console for CORS errors when making API requests from your frontend domains.
