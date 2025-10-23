#!/bin/bash

# RentalAI VPS Setup Script
# Run this script on your VPS to set up the environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run this script as root (use sudo)"
    exit 1
fi

log_info "🚀 Setting up RentalAI VPS environment..."

# Update system packages
log_info "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
log_info "📦 Installing required packages..."
apt install -y \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    git \
    curl \
    wget \
    build-essential \
    libpq-dev \
    supervisor \
    certbot \
    python3-certbot-nginx

# Create application user
log_info "👤 Creating application user..."
useradd -m -s /bin/bash rentalai || log_warning "User rentalai already exists"
usermod -aG www-data rentalai

# Create application directory
log_info "📁 Creating application directory..."
mkdir -p /var/www/rentalai-monorepo
chown -R rentalai:www-data /var/www/rentalai-monorepo

# Setup PostgreSQL
log_info "🐘 Setting up PostgreSQL..."
sudo -u postgres psql << 'EOF'
CREATE DATABASE rentalai;
CREATE USER rentalai WITH PASSWORD 'rentalai_dev_password';
GRANT ALL PRIVILEGES ON DATABASE rentalai TO rentalai;
ALTER USER rentalai CREATEDB;
EOF

# Configure PostgreSQL
log_info "🔧 Configuring PostgreSQL..."
echo "host all all 127.0.0.1/32 md5" >> /etc/postgresql/15/main/pg_hba.conf
echo "listen_addresses = 'localhost'" >> /etc/postgresql/15/main/postgresql.conf
systemctl restart postgresql
systemctl enable postgresql

# Configure Redis
log_info "🔧 Configuring Redis..."
systemctl restart redis-server
systemctl enable redis-server

# Setup Python virtual environment
log_info "🐍 Setting up Python virtual environment..."
cd /var/www/rentalai-monorepo
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Install systemd service
log_info "⚙️ Installing systemd service..."
cp rentalai-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable rentalai-backend

# Configure Nginx
log_info "🌐 Configuring Nginx..."
cp nginx-rentalai-backend.conf /etc/nginx/sites-available/rentalai-backend
ln -sf /etc/nginx/sites-available/rentalai-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl restart nginx
systemctl enable nginx

# Setup log rotation
log_info "📝 Setting up log rotation..."
cat > /etc/logrotate.d/rentalai << 'EOF'
/var/log/rentalai/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload rentalai-backend
    endscript
}
EOF

# Create log directory
mkdir -p /var/log/rentalai
chown www-data:www-data /var/log/rentalai

# Setup firewall
log_info "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Setup SSL certificate (optional - uncomment if you have a domain)
# log_info "🔒 Setting up SSL certificate..."
# certbot --nginx -d api.rentalai.ai --non-interactive --agree-tos --email your-email@example.com

log_success "✅ VPS setup completed!"
log_info "📋 Next steps:"
log_info "1. Copy your application files to /var/www/rentalai-monorepo/"
log_info "2. Create .env file with your configuration"
log_info "3. Install Python dependencies: pip install -r requirements.txt"
log_info "4. Run database migrations: alembic upgrade head"
log_info "5. Start the service: systemctl start rentalai-backend"
log_info "6. Check status: systemctl status rentalai-backend"
log_info "7. View logs: journalctl -u rentalai-backend -f"
