#!/bin/bash

# RentalAI Monorepo Deployment Script
# Usage: ./deploy.sh [backend|frontend|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="168.231.69.150"
VPS_USER="root"  # Change to your VPS username
VPS_PATH="/var/www/rentalai-monorepo"
BACKEND_PATH="$VPS_PATH/backend"
FRONTEND_PATH="$VPS_PATH/frontend"

# Functions
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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    log_error "Please run this script from the monorepo root directory"
    exit 1
fi

# Deploy backend to VPS
deploy_backend() {
    log_info "🚀 Deploying backend to VPS..."
    
    # Create deployment directory on VPS
    ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"
    
    # Copy backend files
    log_info "📁 Copying backend files..."
    rsync -avz --delete \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='.git' \
        --exclude='venv' \
        --exclude='.env' \
        backend/ $VPS_USER@$VPS_HOST:$BACKEND_PATH/
    
    # Copy environment file template
    log_info "📄 Setting up environment..."
    ssh $VPS_USER@$VPS_HOST "cd $BACKEND_PATH && cp .env.example .env || echo 'No .env.example found'"
    
    # Install dependencies and run migrations
    log_info "📦 Installing dependencies and running migrations..."
    ssh $VPS_USER@$VPS_HOST << 'EOF'
        cd /var/www/rentalai-monorepo/backend
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Install/update dependencies
        pip install -r requirements.txt
        
        # Run database migrations
        alembic upgrade head
        
        # Restart systemd service
        sudo systemctl restart rentalai-backend
        sudo systemctl enable rentalai-backend
        
        echo "Backend deployment completed!"
EOF
    
    log_success "✅ Backend deployed successfully!"
}

# Deploy frontend to Vercel
deploy_frontend() {
    log_info "🌐 Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Please install it first:"
        log_info "npm i -g vercel"
        exit 1
    fi
    
    # Deploy to Vercel
    cd frontend
    vercel --prod --yes
    
    log_success "✅ Frontend deployed to Vercel!"
    cd ..
}

# Deploy everything
deploy_all() {
    log_info "🚀 Deploying entire RentalAI application..."
    deploy_backend
    deploy_frontend
    log_success "🎉 Full deployment completed!"
}

# Main script logic
case "${1:-all}" in
    "backend")
        deploy_backend
        ;;
    "frontend")
        deploy_frontend
        ;;
    "all")
        deploy_all
        ;;
    *)
        log_error "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac
