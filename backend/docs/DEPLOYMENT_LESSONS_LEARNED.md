# Deployment Lessons Learned - HUD Compliance Module

## Critical Issues We Faced and How to Prevent Them

### 1. CORS Configuration
**Problem**: Browser blocked API requests with "No 'Access-Control-Allow-Origin' header"
**Root Causes**:
- .env file overriding config.py CORS settings
- Nginx not passing through CORS headers from FastAPI
- Missing preflight OPTIONS handling

**Solutions**:
- NEVER put ALLOWED_ORIGINS in .env - let config.py control it
- Add CORS headers to nginx config for api subdomain
- Always test with curl for both GET and OPTIONS requests
- Use incognito to avoid browser cache when testing CORS

**Prevention Checklist**:
- [ ] Remove ALLOWED_ORIGINS from backend/.env
- [ ] Verify nginx passes CORS headers with: `curl -I -H "Origin: https://www.rentalai.ai" https://api.rentalai.ai/api/v1/health`
- [ ] Test OPTIONS preflight: `curl -X OPTIONS -I -H "Origin: https://www.rentalai.ai" -H "Access-Control-Request-Method: GET" https://api.rentalai.ai/api/v1/endpoint`

### 2. Port Configuration Mismatch
**Problem**: Nginx proxying to wrong port (8004 instead of 8001)
**Root Cause**: Backend service changed ports but nginx config wasn't updated

**Solutions**:
- Check systemd service file for actual port
- Verify nginx proxy_pass matches service port
- Test with: `curl http://localhost:PORT/api/v1/health`

**Prevention Checklist**:
- [ ] When changing ports, update both systemd service AND nginx config
- [ ] Document actual port in .env and nginx config comments
- [ ] Always verify: `systemctl status SERVICE_NAME` shows correct port

### 3. Base URL Construction Issues
**Problem**: URLs had double /api/v1 or missing /api/v1
**Root Cause**: NEXT_PUBLIC_API_URL and service baseUrl both adding /api/v1

**Solutions**:
- NEXT_PUBLIC_API_URL should be: `https://api.rentalai.ai` (NO /api/v1)
- Service code adds /api/v1: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8004'}/api/v1`
- Always append /api/v1 in code, never in env var

**Prevention Checklist**:
- [ ] Vercel env: `NEXT_PUBLIC_API_URL=https://api.rentalai.ai`
- [ ] Local env: `NEXT_PUBLIC_API_URL=http://localhost:8004`
- [ ] Service files always append /api/v1 to baseUrl
- [ ] Test final URLs in browser network tab

### 4. SQLAlchemy Relationship Errors
**Problem**: Models couldn't find referenced classes (Organization, Property, Unit, Tenant)
**Root Cause**: HUD models in separate file with separate Base class

**Solutions**:
- Keep all models in ONE file (`backend/app/models/__init__.py`)
- Use single shared `Base = declarative_base()`
- Models can reference each other with string names
- Proper `relationship()` with `back_populates`

**Prevention Checklist**:
- [ ] All SQLAlchemy models in `models/__init__.py`
- [ ] Single Base class for entire app
- [ ] Use string references for relationships: `relationship("Organization")`
- [ ] Test imports: `python -c "from app.models import ModelName"`

### 5. Database Migration Issues
**Problem**: Migration failed because existing data violated NOT NULL constraint
**Root Cause**: Adding tenant_id as NOT NULL when existing leases have no tenants

**Solutions**:
- Always make new FK columns `nullable=True` initially
- Backfill data, then alter to NOT NULL if needed
- Test migrations on dev database first
- Use `alembic downgrade` if migration fails

**Prevention Checklist**:
- [ ] New FK columns: `nullable=True`
- [ ] Test migration: `alembic upgrade head` on dev first
- [ ] Check for existing data before adding NOT NULL constraints
- [ ] Keep `downgrade()` function working for rollbacks

### 6. Code Sync Between Environments
**Problem**: VPS had old code, causing 500 errors
**Root Cause**: Forgot to git pull on VPS after pushing changes

**Solutions**:
- ALWAYS git pull on VPS after pushing to main
- Restart service after pulling: `systemctl restart SERVICE_NAME`
- Check logs immediately: `journalctl -u SERVICE_NAME -n 30`

**Prevention Checklist**:
- [ ] After git push: ssh to VPS
- [ ] `cd /var/www/rentalai-monorepo && git pull origin main`
- [ ] `systemctl restart rental-ai`
- [ ] `journalctl -u rental-ai -n 20 | grep -E "Started|Error"`
- [ ] `curl http://localhost:8001/api/v1/health`

### 7. Import Errors After Refactoring
**Problem**: Services importing from deleted `app.models.hud`
**Root Cause**: Moved models but forgot to update imports

**Solutions**:
- Search entire codebase for old imports: `grep -r "from app.models.hud" .`
- Update all imports to: `from app.models import`
- Test all imports before deploying

**Prevention Checklist**:
- [ ] After moving files: `grep -r "old_import_path" backend/`
- [ ] Fix ALL matches
- [ ] Test: `python -c "from app.services.SERVICE import CLASS"`
- [ ] Commit and push immediately

### 8. Browser Cache Causing False Errors
**Problem**: CORS still failing in browser after fixing server
**Root Cause**: Browser cached failed CORS preflight requests

**Solutions**:
- ALWAYS test in incognito after CORS changes
- Clear cache completely (Ctrl+Shift+Delete)
- Use curl to verify server first, then test browser

**Prevention Checklist**:
- [ ] After CORS changes: test with curl first
- [ ] Open NEW incognito window
- [ ] Hard refresh: Ctrl+Shift+R
- [ ] Check Network tab for actual request/response

## Deployment Workflow (FOLLOW THIS EXACTLY)

### Making Backend Changes:
1. Make changes locally
2. Test locally: `npm run dev` (frontend) + backend server
3. Commit: `git add . && git commit -m "message"`
4. Push: `git push origin main`
5. SSH to VPS: `ssh root@168.231.69.150`
6. Pull: `cd /var/www/rentalai-monorepo && git pull origin main`
7. Restart: `systemctl restart rental-ai`
8. Verify: `curl http://localhost:8001/api/v1/health`
9. Check logs: `journalctl -u rental-ai -n 20`
10. Test in browser (incognito)

### Making Frontend Changes:
1. Make changes locally
2. Test: `npm run dev`
3. Commit and push: `git add . && git commit -m "message" && git push`
4. Vercel auto-deploys (wait 2 min)
5. Test in browser (incognito)

### Adding New Models:
1. Add to `backend/app/models/__init__.py` (NOT separate file)
2. Create migration: `alembic revision --autogenerate -m "message"`
3. Review migration file (check nullable, constraints)
4. Test locally: `alembic upgrade head`
5. Commit migration file
6. Push to GitHub
7. Pull on VPS
8. Run on VPS: `alembic upgrade head`
9. Restart service
10. Test endpoints

### Environment Variables:
**NEVER EVER:**
- Put ALLOWED_ORIGINS in .env (use config.py defaults)
- Put /api/v1 in NEXT_PUBLIC_API_URL (code adds it)
- Commit .env files to git

**ALWAYS:**
- Document env vars in .env.example
- Set in Vercel UI for frontend vars
- Set in VPS .env for backend vars
- Restart services after env changes

## Quick Debugging Commands

### Backend Issues:
```bash
# Check service status
systemctl status rental-ai

# Check logs
journalctl -u rental-ai -n 50

# Test API locally
curl http://localhost:8001/api/v1/health

# Test CORS
curl -H "Origin: https://www.rentalai.ai" https://api.rentalai.ai/api/v1/health

# Check nginx config
nginx -t
systemctl reload nginx

# Check port usage
netstat -tlnp | grep :8001
```

### Frontend Issues:
```bash
# Test API URL construction
echo $NEXT_PUBLIC_API_URL

# Check Vercel deployment
vercel logs

# Test in incognito
# Always use incognito for CORS testing
```

### Database Issues:
```bash
# Check migration status
alembic current

# Run migrations
alembic upgrade head

# Rollback if needed
alembic downgrade -1

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Import/Model Issues:
```bash
# Test model imports
cd backend && python -c "from app.models import ModelName; print('OK')"

# Test service imports
cd backend && python -c "from app.services.service_name import ClassName; print('OK')"

# Search for old imports
grep -r "from app.models.old_module" backend/
```

## Common Error Messages and Solutions

### "No 'Access-Control-Allow-Origin' header"
- Check nginx config for CORS headers
- Remove ALLOWED_ORIGINS from .env
- Test with curl first, then incognito browser

### "When initializing mapper X, expression 'Y' failed to locate a name"
- All models must be in same file with same Base class
- Use string references: `relationship("ModelName")`
- Check imports: `from app.models import ModelName`

### "ModuleNotFoundError: No module named 'app.models.X'"
- Search for old imports: `grep -r "old_import" backend/`
- Update all imports to new path
- Test imports before deploying

### "502 Bad Gateway" or "Connection refused"
- Check if service is running: `systemctl status SERVICE_NAME`
- Check port: `netstat -tlnp | grep :PORT`
- Check nginx proxy_pass matches service port

### "Failed to fetch" in browser
- Check if API is accessible: `curl https://api.rentalai.ai/api/v1/health`
- Check CORS with curl
- Test in incognito window
- Check browser Network tab for actual error

## Environment-Specific Notes

### VPS (168.231.69.150):
- Service: `rental-ai` (systemctl)
- Port: 8001 (check with `systemctl status rental-ai`)
- Path: `/var/www/rentalai-monorepo`
- Nginx: `/etc/nginx/sites-available/rentalai`

### Vercel:
- Frontend auto-deploys on git push
- Environment variables set in Vercel UI
- NEXT_PUBLIC_API_URL=https://api.rentalai.ai

### Local Development:
- Frontend: `npm run dev` (port 3000)
- Backend: `uvicorn app.main:app --reload` (port 8004)
- Database: Local PostgreSQL

## Final Checklist Before Any Deployment

### Backend Deployment:
- [ ] All tests pass locally
- [ ] Models import correctly: `python -c "from app.models import *"`
- [ ] Services import correctly: `python -c "from app.services import *"`
- [ ] No old import paths: `grep -r "old_path" backend/`
- [ ] Committed and pushed to GitHub
- [ ] Pulled on VPS: `git pull origin main`
- [ ] Service restarted: `systemctl restart rental-ai`
- [ ] Health check passes: `curl http://localhost:8001/api/v1/health`
- [ ] Logs show no errors: `journalctl -u rental-ai -n 20`

### Frontend Deployment:
- [ ] Builds successfully: `npm run build`
- [ ] Environment variables correct in Vercel
- [ ] NEXT_PUBLIC_API_URL points to correct backend
- [ ] Committed and pushed to GitHub
- [ ] Vercel deployment completed
- [ ] Tested in incognito browser

### Database Changes:
- [ ] Migration file reviewed (nullable, constraints)
- [ ] Tested locally: `alembic upgrade head`
- [ ] Migration file committed
- [ ] Applied on VPS: `alembic upgrade head`
- [ ] Service restarted after migration

## Emergency Rollback Procedures

### Backend Rollback:
```bash
# Rollback code
cd /var/www/rentalai-monorepo
git log --oneline -5  # Find previous commit
git reset --hard COMMIT_HASH
systemctl restart rental-ai

# Rollback database (if needed)
alembic downgrade -1
```

### Frontend Rollback:
- Use Vercel dashboard to rollback to previous deployment
- Or revert git commit and push

### Database Rollback:
```bash
alembic downgrade -1  # Go back one migration
# Or specific migration: alembic downgrade MIGRATION_ID
```

---

**Remember**: Always test in incognito after CORS changes, always pull on VPS after pushing, and always check logs immediately after restarting services. These three practices would have saved us hours today.
