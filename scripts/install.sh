#!/bin/bash

# Multi-Tenant Academic System Installer
# This script installs all dependencies and sets up the system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Multi-Tenant Academic System Installer             ║${NC}"
echo -e "${GREEN}║   Sistema de Gestión Académica Multi-Tenant          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ This installer must be run as root${NC}"
  echo "Please run: sudo bash scripts/install.sh"
  exit 1
fi

echo -e "${YELLOW}📋 Checking system requirements...${NC}"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
else
    echo -e "${RED}❌ Cannot detect OS${NC}"
    exit 1
fi

echo "Detected OS: $OS $OS_VERSION"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update
    apt-get upgrade -y
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum update -y
else
    echo -e "${RED}❌ Unsupported OS: $OS${NC}"
    exit 1
fi

# Install Node.js 20
echo -e "${YELLOW}📦 Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PostgreSQL 17
echo -e "${YELLOW}📦 Installing PostgreSQL 17...${NC}"
if ! command -v psql &> /dev/null; then
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get -y install postgresql-17
fi

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo "PostgreSQL version: $(psql --version)"

# Install Redis
echo -e "${YELLOW}📦 Installing Redis 7...${NC}"
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
fi

# Start Redis
systemctl start redis-server
systemctl enable redis-server

echo "Redis version: $(redis-server --version)"

# Install Docker and Docker Compose
echo -e "${YELLOW}📦 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

echo "Docker version: $(docker --version)"

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Docker Compose version: $(docker-compose --version)"

# Setup PostgreSQL database
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
sudo -u postgres psql -c "CREATE DATABASE multitenant_db;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Install project dependencies
echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
cd "$(dirname "$0")/.."

# Frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Setup environment files
echo -e "${YELLOW}📝 Setting up environment files...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Backend .env file created"
fi

cd ..
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Frontend .env file created"
fi

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
cd backend
npm run db:push

# Seed database
echo -e "${YELLOW}🌱 Seeding database...${NC}"
npm run db:seed

cd ..

# Create systemd services
echo -e "${YELLOW}⚙️  Creating systemd services...${NC}"

# Backend service
cat > /etc/systemd/system/multitenant-backend.service <<EOF
[Unit]
Description=Multi-Tenant Academic System Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
cat > /etc/systemd/system/multitenant-frontend.service <<EOF
[Unit]
Description=Multi-Tenant Academic System Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Installation completed successfully!            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo ""
echo "1. For development, run:"
echo "   npm run dev:all"
echo ""
echo "2. For production, build and start services:"
echo "   npm run build"
echo "   cd backend && npm run build"
echo "   sudo systemctl start multitenant-backend"
echo "   sudo systemctl start multitenant-frontend"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:5000"
echo "   Backend API: http://localhost:3000"
echo "   API Docs: http://localhost:3000/docs"
echo ""
echo "4. Default credentials:"
echo "   Username: admin"
echo "   Password: escolastica123"
echo ""
echo -e "${GREEN}🎉 Enjoy your Multi-Tenant Academic System!${NC}"
