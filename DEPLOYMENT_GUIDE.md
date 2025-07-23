# Robust Proxy Server Deployment Guide

## Overview
This guide covers installation, configuration, and deployment of the robust proxy server with automatic HTTP client selection, retry logic, and circuit breaker patterns.

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Local Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd TechPlusPOS

# Install dependencies
npm install

# Verify installation
npm run start
```

### Dependencies
The server requires these key dependencies:
```json
{
  "express": "^4.21.2",
  "cors": "^2.8.5", 
  "node-fetch": "^2.7.0",
  "axios": "^1.10.0",
  "form-data": "^4.0.3"
}
```

## Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=888
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8000,https://your-domain.com

# Circuit Breaker Settings
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000

# Retry Configuration
RETRY_ATTEMPTS=2
RETRY_DELAY_BASE=1000
```

### CORS Configuration
The server supports multiple origins for both development and production:

#### Development
```javascript
const corsOptions = {
  origin: [
    'http://localhost:8000',
    'http://localhost:3000', 
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

#### Production
```javascript
const corsOptions = {
  origin: [
    'https://your-production-domain.com',
    'https://*.vercel.app',
    'https://*.netlify.app'
  ],
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

## Running Locally

### Development Mode
```bash
# Start the proxy server
npm run start

# Or directly
node index.js
```

### Health Check
```bash
curl http://localhost:888/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "clients": {
    "fetch": "available",
    "axios": "available"
  }
}
```

### Test Proxy Endpoint
```bash
curl -X POST http://localhost:888/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://httpbin.org/post",
    "test": true
  }'
```

## Deployment Options

### 1. Cloud VM (AWS EC2, Google Compute Engine, Azure VM)

#### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 16+
- PM2 (for process management)

#### Installation Steps
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd TechPlusPOS

# Install dependencies
npm install

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'robust-proxy',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 888
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 888
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Firewall Configuration
```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 888

# Enable firewall
sudo ufw enable
```

#### Nginx Reverse Proxy (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Serverless (AWS Lambda, Vercel, Netlify)

#### AWS Lambda
Create `lambda.js`:
```javascript
const serverless = require('serverless-http');
const app = require('./index.js');

module.exports.handler = serverless(app);
```

Add to `package.json`:
```json
{
  "scripts": {
    "deploy:lambda": "serverless deploy"
  },
  "devDependencies": {
    "serverless": "^3.0.0",
    "serverless-http": "^3.0.0"
  }
}
```

Create `serverless.yml`:
```yaml
service: robust-proxy

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  proxy:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
```

#### Vercel
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ]
}
```

### 3. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 888

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:888/health || exit 1

CMD ["node", "index.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  proxy:
    build: .
    ports:
      - "888:888"
    environment:
      - NODE_ENV=production
      - PORT=888
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:888/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Build and Run
```bash
# Build image
docker build -t robust-proxy .

# Run container
docker run -d -p 888:888 --name proxy-server robust-proxy

# Or with docker-compose
docker-compose up -d
```

## Monitoring and Logging

### Health Monitoring
```bash
# Check server health
curl http://localhost:888/health

# Monitor logs
pm2 logs robust-proxy

# Check process status
pm2 status
```

### Log Analysis
```bash
# View real-time logs
tail -f logs/proxy.log

# Search for errors
grep "ERROR" logs/proxy.log

# Monitor request patterns
grep "PROXY REQUEST" logs/proxy.log | wc -l
```

### Performance Monitoring
```bash
# Monitor CPU/Memory usage
pm2 monit

# Check response times
grep "Response time" logs/proxy.log | awk '{print $NF}' | sort -n
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use different configurations for dev/staging/prod
- Rotate secrets regularly

### 2. CORS Configuration
- Restrict origins to known domains
- Avoid using `*` in production
- Validate origin headers

### 3. Rate Limiting
Add rate limiting middleware:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/proxy', limiter);
```

### 4. Input Validation
```javascript
const { body, validationResult } = require('express-validator');

app.post('/proxy', [
  body('targetUrl').isURL().withMessage('Invalid URL'),
  body('targetUrl').matches(/^https:\/\/script\.google\.com\//).withMessage('Must be Google Apps Script URL')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ... rest of handler
});
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 888
lsof -i :888

# Kill process
kill -9 <PID>

# Or use different port
PORT=8889 npm start
```

#### 2. CORS Errors
```bash
# Check CORS configuration
curl -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:888/proxy
```

#### 3. HTTP Client Failures
```bash
# Check available clients
curl http://localhost:888/health

# Test individual clients
node -e "console.log(require('node-fetch'))"
node -e "console.log(require('axios'))"
```

#### 4. Circuit Breaker Issues
```bash
# Check circuit breaker state
grep "Circuit breaker" logs/proxy.log

# Reset circuit breaker (restart server)
pm2 restart robust-proxy
```

### Debug Commands
```bash
# Check server status
pm2 status

# View detailed logs
pm2 logs robust-proxy --lines 100

# Monitor real-time
pm2 monit

# Check system resources
htop
df -h
free -h
```

## Performance Optimization

### 1. Cluster Mode
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Worker process
  app.listen(PORT);
}
```

### 2. Caching
```javascript
const mcache = require('memory-cache');

const cache = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = mcache.get(key);
    
    if (cachedBody) {
      res.send(cachedBody);
      return;
    }
    
    res.sendResponse = res.send;
    res.send = (body) => {
      mcache.put(key, body, duration * 1000);
      res.sendResponse(body);
    };
    next();
  };
};

app.use('/health', cache(300)); // Cache for 5 minutes
```

### 3. Compression
```javascript
const compression = require('compression');
app.use(compression());
```

## Backup and Recovery

### 1. Configuration Backup
```bash
# Backup configuration
cp .env .env.backup
cp ecosystem.config.js ecosystem.config.js.backup

# Restore configuration
cp .env.backup .env
```

### 2. Process Recovery
```bash
# PM2 will auto-restart on failure
pm2 start ecosystem.config.js --env production

# Manual restart
pm2 restart robust-proxy
```

### 3. Log Rotation
```bash
# Install logrotate
sudo apt-get install logrotate

# Configure log rotation
sudo nano /etc/logrotate.d/robust-proxy
```

## Updates and Maintenance

### 1. Code Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart server
pm2 restart robust-proxy
```

### 2. Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Test after update
npm test
```

### 3. Security Updates
```bash
# Audit dependencies
npm audit

# Fix security issues
npm audit fix

# Update to latest versions
npm update
```

## Support and Documentation

### Useful Commands
```bash
# Start server
npm start

# Development mode
npm run dev

# Check health
curl http://localhost:888/health

# View logs
pm2 logs

# Monitor performance
pm2 monit
```

### Contact Information
- **Issues**: Create GitHub issue
- **Documentation**: Check README.md
- **Deployment**: Follow this guide
- **Monitoring**: Use PM2 dashboard

Remember to restart the server after any configuration changes and always test in a staging environment before deploying to production. 