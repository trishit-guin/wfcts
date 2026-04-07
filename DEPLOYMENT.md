# WFCTS Deployment Guide - AWS EC2

This guide outlines the process for deploying the WFCTS (Teacher Workload Fairness Tracking & Substitution System) on an AWS EC2 instance.

## 🏗️ Deployment Options

You have two main ways to deploy this project:
1. **Docker Compose (Recommended)**: Best for isolated environments and easy orchestration.
2. **PM2 & Nginx (Manual)**: Best for performance on low-resource EC2 instances.

---

## 🐳 Option 1: Docker Compose (Recommended)
This is the fastest way to get the project running.

1. Ensure Docker and Docker Compose are installed on your EC2.
2. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo.git /var/www/wfcts
   cd /var/www/wfcts
   ```
3. Update `backend/.env` with your production secrets (especially `MONGODB_URI`).
4. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```
   *The frontend will be available on port 80 and backend on port 3000.*

---

## 🛠️ Option 2: PM2 & Nginx (Manual)
Best for performance on low-resource EC2 instances.

### Configure the Backend with PM2:
1. Navigate to the root directory.
2. Ensure `backend/.env` is correctly configured.
3. Start the process:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

### Configure the Frontend:
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the frontend assets:
   ```bash
   npm run build
   ```
   *This creates a `dist` directory with optimized production files.*

---

## 🌐 4. Nginx Reverse Proxy Setup
Configure Nginx to serve the frontend and proxy requests to the backend API.

1. Create a new Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/wfcts
   ```

2. Add the following configuration (replace `your-domain-or-ip` with your actual domain or IP address):
   ```nginx
   server {
       listen 80;
       server_name your-domain-or-ip;

       # Frontend: Serve static files
       location / {
           root /var/www/wfcts/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Backend: Proxy API requests
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Enable the configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/wfcts /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 🛡️ 5. SSL (Optional, but Recommended)
Use Let's Encrypt (Certbot) to secure your site with HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 📊 6. Post-Deployment Checklist
- [ ] Check if the frontend is accessible via browser.
- [ ] Verify if API requests are reaching the backend (check `/api/health`).
- [ ] Ensure MongoDB Atlas IP Whitelisting includes your EC2 instance IP.
- [ ] Verify PM2 logs for any backend errors: `pm2 logs wfcts-backend`.
