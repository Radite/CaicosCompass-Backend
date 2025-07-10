# deployment/docker/Dockerfile - Backend Docker configuration
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Change ownership of the app directory
RUN chown -R backend:nodejs /app
USER backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]

# deployment/docker/docker-compose.yml - Development environment
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/turksexplorer
      - JWT_SECRET=your_jwt_secret_here
      - EMAIL_USER=your_email@gmail.com
      - EMAIL_PASS=your_app_password
      - STRIPE_SECRET_KEY=sk_test_your_stripe_secret
      - STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable
      - STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
      - FRONTEND_URL=http://localhost:3000
    depends_on:
      - mongo
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=turksexplorer
    volumes:
      - mongo_data:/data/db
      - ./deployment/mongo/init.js:/docker-entrypoint-initdb.d/init.js:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deployment/ssl:/etc/ssl/certs:ro
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:

# deployment/railway/railway.json - Railway deployment configuration
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}

# deployment/vercel/vercel.json - Frontend Vercel configuration
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-url.railway.app/api/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-backend-url.railway.app",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@stripe_publishable_key"
  },
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  }
}

# deployment/scripts/deploy.sh - Deployment script
#!/bin/bash

# TurksExplorer Deployment Script
set -e

echo "🚀 Starting TurksExplorer deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="."
FRONTEND_DIR="../frontend"
ENV_FILE=".env.production"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

install_dependencies() {
    log_info "Installing backend dependencies..."
    cd $BACKEND_DIR
    npm ci --production
    
    if [ -d "$FRONTEND_DIR" ]; then
        log_info "Installing frontend dependencies..."
        cd $FRONTEND_DIR
        npm ci
        cd ..
    fi
}

run_tests() {
    log_info "Running tests..."
    cd $BACKEND_DIR
    
    # Set test environment
    export NODE_ENV=test
    
    # Run tests
    npm test
    
    if [ $? -ne 0 ]; then
        log_error "Tests failed! Deployment aborted."
        exit 1
    fi
    
    log_info "All tests passed"
}

build_application() {
    log_info "Building application..."
    
    if [ -d "$FRONTEND_DIR" ]; then
        log_info "Building frontend..."
        cd $FRONTEND_DIR
        npm run build
        cd ..
    fi
    
    log_info "Build completed"
}

deploy_backend() {
    log_info "Deploying backend to Railway..."
    
    # Install Railway CLI if not present
    if ! command -v railway &> /dev/null; then
        log_info "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Deploy to Railway
    railway login
    railway up
    
    log_info "Backend deployed successfully"
}

deploy_frontend() {
    if [ -d "$FRONTEND_DIR" ]; then
        log_info "Deploying frontend to Vercel..."
        cd $FRONTEND_DIR
        
        # Install Vercel CLI if not present
        if ! command -v vercel &> /dev/null; then
            log_info "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Deploy to Vercel
        vercel --prod
        
        cd ..
        log_info "Frontend deployed successfully"
    fi
}

setup_database() {
    log_info "Setting up production database..."
    
    # Run database migrations/setup if needed
    # node scripts/setup-db.js
    
    log_info "Database setup completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if backend is responding
    BACKEND_URL="${BACKEND_URL:-https://your-app.railway.app}"
    
    if curl -f -s "$BACKEND_URL/health" > /dev/null; then
        log_info "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    log_info "Deployment verification completed"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup tasks here
    log_info "Cleanup completed"
}

# Main deployment flow
main() {
    echo "========================================"
    echo "     TurksExplorer Deployment"
    echo "========================================"
    
    check_prerequisites
    install_dependencies
    run_tests
    build_application
    setup_database
    deploy_backend
    deploy_frontend
    verify_deployment
    cleanup
    
    echo "========================================"
    log_info "🎉 Deployment completed successfully!"
    echo "========================================"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: https://your-frontend-domain.vercel.app"
    echo "========================================"
}

# Run deployment
main "$@"

# deployment/nginx/nginx.conf - Nginx configuration
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    server {
        listen 80;
        server_name turksexplorer.com www.turksexplorer.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name turksexplorer.com www.turksexplorer.com;

        # SSL Configuration
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_stapling on;
        ssl_stapling_verify on;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Login rate limiting
        location /api/users/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://backend;
            access_log off;
        }

        # Static files (if serving from Nginx)
        location /static/ {
            alias /app/public/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Error pages
        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
    }
}

# deployment/mongo/init.js - MongoDB initialization script
// Create database and user
db = db.getSiblingDB('turksexplorer');

// Create collections with indexes
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });

db.createCollection('bookings');
db.bookings.createIndex({ "user": 1 });
db.bookings.createIndex({ "status": 1 });
db.bookings.createIndex({ "category": 1 });
db.bookings.createIndex({ "createdAt": -1 });
db.bookings.createIndex({ "date": 1 });

db.createCollection('activities');
db.activities.createIndex({ "location": 1 });
db.activities.createIndex({ "island": 1 });
db.activities.createIndex({ "category": 1 });
db.activities.createIndex({ "price": 1 });

db.createCollection('stays');
db.stays.createIndex({ "location": 1 });
db.stays.createIndex({ "island": 1 });
db.stays.createIndex({ "pricePerNight": 1 });

db.createCollection('dining');
db.dining.createIndex({ "location": 1 });
db.dining.createIndex({ "island": 1 });
db.dining.createIndex({ "cuisineType": 1 });

db.createCollection('transportation');
db.transportation.createIndex({ "category": 1 });
db.transportation.createIndex({ "island": 1 });

print('Database initialized successfully');

# healthcheck.js - Health check script for Docker
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on