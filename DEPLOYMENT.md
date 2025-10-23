# RentalAI Deployment Guide

## Overview
This guide will help you deploy your RentalAI monorepo to your VPS and frontend to Vercel.

## Prerequisites
- VPS running Ubuntu 24.04 at 168.231.69.150
- Domain name (optional, for SSL)
- Vercel account for frontend deployment
- All required API keys and secrets

## Step 1: Fix Import Error ✅
The Base import error in `app/models/subscription.py` has been fixed by changing:
```python
from app.core.database import Base
```
to:
```python
from . import Base
```

## Step 2: VPS Setup

### 2.1 Initial VPS Setup
Run the setup script on your VPS:
```bash
# Copy setup script to VPS
scp setup-vps.sh root@168.231.69.150:/root/
ssh root@168.231.69.150 "chmod +x setup-vps.sh && ./setup-vps.sh"
```

### 2.2 Manual Setup (Alternative)
If you prefer manual setup:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3.11-venv python3.11-dev postgresql postgresql-contrib redis-server nginx git curl wget build-essential libpq-dev supervisor certbot python3-certbot-nginx

# Create database
sudo -u postgres psql -c "CREATE DATABASE rentalai;"
sudo -u postgres psql -c "CREATE USER rentalai WITH PASSWORD 'rentalai_dev_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rentalai TO rentalai;"

# Create application directory
sudo mkdir -p /var/www/rentalai-monorepo
sudo chown -R www-data:www-data /var/www/rentalai-monorepo
```

## Step 3: Deploy Backend

### 3.1 Copy Files to VPS
```bash
# Copy backend files
rsync -avz --delete \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='venv' \
    --exclude='.env' \
    backend/ root@168.231.69.150:/var/www/rentalai-monorepo/backend/
```

### 3.2 Setup Environment
```bash
# SSH into VPS
ssh root@168.231.69.150

# Navigate to backend directory
cd /var/www/rentalai-monorepo/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp env.example .env
# Edit .env with your actual values
nano .env
```

### 3.3 Database Migration
```bash
# Run Alembic migrations
alembic upgrade head
```

### 3.4 Install Systemd Service
```bash
# Copy systemd service file
cp rentalai-backend.service /etc/systemd/system/

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable rentalai-backend
systemctl start rentalai-backend

# Check status
systemctl status rentalai-backend
```

### 3.5 Configure Nginx
```bash
# Copy nginx configuration
cp nginx-rentalai-backend.conf /etc/nginx/sites-available/rentalai-backend

# Enable site
ln -sf /etc/nginx/sites-available/rentalai-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
nginx -t
systemctl restart nginx
```

## Step 4: Deploy Frontend to Vercel

### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Deploy Frontend
```bash
cd frontend
vercel --prod --yes
```

### 4.3 Configure Environment Variables
In Vercel dashboard, add these environment variables:
- `NEXT_PUBLIC_API_URL=https://168.231.69.150/api/v1`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key`
- Any other frontend-specific environment variables

## Step 5: SSL Certificate (Optional)
If you have a domain name:
```bash
# Install SSL certificate
certbot --nginx -d api.rentalai.ai --non-interactive --agree-tos --email your-email@example.com
```

## Step 6: Monitoring and Maintenance

### 6.1 Check Service Status
```bash
# Backend service
systemctl status rentalai-backend

# Database
systemctl status postgresql

# Redis
systemctl status redis-server

# Nginx
systemctl status nginx
```

### 6.2 View Logs
```bash
# Backend logs
journalctl -u rentalai-backend -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 6.3 Update Deployment
Use the provided deployment script:
```bash
# Deploy everything
./deploy.sh all

# Deploy only backend
./deploy.sh backend

# Deploy only frontend
./deploy.sh frontend
```

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure the Base import fix is applied
2. **Database Connection**: Check PostgreSQL is running and credentials are correct
3. **Service Won't Start**: Check logs with `journalctl -u rentalai-backend -f`
4. **Nginx 502 Error**: Ensure backend service is running on port 8000
5. **CORS Issues**: Update CORS origins in backend configuration

### Useful Commands
```bash
# Restart services
systemctl restart rentalai-backend
systemctl restart nginx

# Check port usage
netstat -tlnp | grep :8000

# Test database connection
psql -h localhost -U rentalai -d rentalai

# Check Redis
redis-cli ping
```

## Security Considerations

1. **Firewall**: Only open necessary ports (22, 80, 443)
2. **SSL**: Use HTTPS in production
3. **Environment Variables**: Never commit .env files
4. **Database**: Use strong passwords
5. **Updates**: Keep system packages updated
6. **Monitoring**: Set up log monitoring and alerts

## Performance Optimization

1. **Gunicorn Workers**: Adjust worker count based on CPU cores
2. **Database Pool**: Configure connection pooling
3. **Redis**: Use Redis for caching
4. **Nginx**: Enable gzip compression
5. **CDN**: Use CDN for static assets

## Backup Strategy

1. **Database**: Regular PostgreSQL backups
2. **Code**: Git repository backups
3. **Files**: Backup uploaded files to S3
4. **Configuration**: Document all configuration changes

## Support

For issues:
1. Check logs first
2. Verify service status
3. Test database connectivity
4. Check network connectivity
5. Review configuration files
