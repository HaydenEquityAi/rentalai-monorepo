# CORS Configuration Fix Summary

## ✅ Changes Made

### 1. Fixed app/main.py
**Before:**
```python
origins = [
    "https://rentalai.ai",
    "https://www.rentalai.ai",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://rental-ai-frontend.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**After:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Updated app/core/config.py
- Added `https://rentalai-monorepo.vercel.app` to default origins
- Kept existing JSON/comma-separated parsing validator

### 3. Updated env.example
- Changed from `CORS_ORIGINS` to `ALLOWED_ORIGINS`
- Added proper JSON array format example

## 🔧 Environment Variable Format

Your `.env` file should contain:
```bash
# Option 1: JSON array format (recommended)
ALLOWED_ORIGINS=["https://rentalai.ai","https://www.rentalai.ai","https://rentalai-monorepo.vercel.app","http://localhost:3000"]

# Option 2: Comma-separated format (also supported)
ALLOWED_ORIGINS=https://rentalai.ai,https://www.rentalai.ai,https://rentalai-monorepo.vercel.app,http://localhost:3000
```

## 🚀 Deployment Steps

### 1. Update your VPS .env file
```bash
# SSH into your VPS
ssh root@168.231.69.150

# Navigate to backend directory
cd /var/www/rentalai-monorepo/backend

# Edit .env file
nano .env

# Add or update this line:
ALLOWED_ORIGINS=["https://rentalai.ai","https://www.rentalai.ai","https://rentalai-monorepo.vercel.app","http://localhost:3000"]
```

### 2. Restart the backend service
```bash
# Restart the service (note: use the correct service name)
sudo systemctl restart rentalai-backend

# Check status
sudo systemctl status rentalai-backend

# View logs to verify CORS origins are loaded
sudo journalctl -u rentalai-backend -f
```

### 3. Verify CORS is working
```bash
# Test CORS headers
curl -H "Origin: https://rentalai-monorepo.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://168.231.69.150/api/v1/health
```

## 🔍 Troubleshooting

### If CORS still doesn't work:

1. **Check service name**: Make sure you're using the correct service name
   ```bash
   # List all services
   sudo systemctl list-units --type=service | grep rentalai
   
   # Common service names might be:
   sudo systemctl restart rentalai-backend
   # or
   sudo systemctl restart rentalai-monorepo
   ```

2. **Verify .env is loaded**: Check logs for CORS origins
   ```bash
   sudo journalctl -u rentalai-backend -f | grep -i cors
   ```

3. **Test environment variable parsing**:
   ```bash
   # SSH into VPS and test Python
   cd /var/www/rentalai-monorepo/backend
   source venv/bin/activate
   python3 -c "
   from app.core.config import settings
   print('ALLOWED_ORIGINS:', settings.ALLOWED_ORIGINS)
   "
   ```

4. **Check nginx configuration**: Ensure nginx isn't blocking CORS headers
   ```bash
   # Check nginx config
   sudo nginx -t
   
   # Restart nginx if needed
   sudo systemctl restart nginx
   ```

## 📋 CORS Headers Explained

The current configuration provides these CORS headers:
- `Access-Control-Allow-Origin`: Set to the requesting origin if it's in ALLOWED_ORIGINS
- `Access-Control-Allow-Credentials`: true (allows cookies/auth headers)
- `Access-Control-Allow-Methods`: * (all HTTP methods)
- `Access-Control-Allow-Headers`: * (all headers)

## 🔒 Security Notes

- Only origins in `ALLOWED_ORIGINS` will be allowed
- Credentials are enabled, so make sure you trust all origins
- In production, consider being more restrictive with methods and headers
- Monitor logs for CORS-related errors

## ✅ Verification Checklist

- [ ] Updated both `app/main.py` and `backend/app/main.py`
- [ ] Updated both `app/core/config.py` and `backend/app/core/config.py`
- [ ] Added `https://rentalai-monorepo.vercel.app` to default origins
- [ ] Updated `.env` file on VPS with correct `ALLOWED_ORIGINS`
- [ ] Restarted backend service
- [ ] Verified CORS headers in browser dev tools
- [ ] Tested API calls from frontend
