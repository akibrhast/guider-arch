# GUIDER Architecture Deployment Guide

## Portainer Deployment via Git Repository

### Prerequisites
1. Build the project: `yarn build`
2. Commit the `dist/` folder to your repository
3. Push to GitHub

### Step 1: Check Available Ports

Before deploying, SSH into your Synology and check for port conflicts:

```bash
sudo netstat -tulpn | grep LISTEN | sort -n -k4
```

Pick an unused port (recommended: **8090**, 8091, 8092, 9090, etc.)

### Step 2: Portainer Setup

1. **In Portainer**, go to: Stacks → Add Stack → Git Repository

2. **Fill in the form:**
   - **Name**: `guider-arch`
   - **Repository URL**: `https://github.com/YOUR_USERNAME/guider-architecture`
   - **Repository reference**: `main` (or your branch name)
   - **Compose path**: `docker-compose.yml`

3. **Environment Variables** (IMPORTANT - Set your port here):
   ```
   PORT=8090
   ```
   *(Change 8090 to whatever unused port you found)*

4. **Click**: "Deploy the stack"

### Step 3: Verify Local Access
After deployment, test locally: `http://your-synology-ip:8090`

### Step 4: Setup Synology Reverse Proxy (Expose to Internet)

1. **In Synology DSM**, go to: Control Panel → Login Portal → Advanced → Reverse Proxy

2. **Click "Create"** and fill in:

   **General:**
   - **Reverse Proxy Name**: `guider-arch`
   - **Protocol**: HTTPS (if you have a certificate) or HTTP
   - **Hostname**: `guider.yourdomain.com` (your subdomain)
   - **Port**: 443 (HTTPS) or 80 (HTTP)
   - **Enable HSTS**: ✓ (recommended if using HTTPS)

   **Destination:**
   - **Protocol**: HTTP
   - **Hostname**: `localhost`
   - **Port**: `8090` (the port you set in Portainer)

3. **Custom Headers** (Optional but recommended):
   - Go to the "Custom Header" tab
   - Click "Create" → "WebSocket"
   - This ensures proper handling of any WebSocket connections

4. **Access Externally:**
   - `https://guider.yourdomain.com`

### Port Conflict Prevention

**Default port**: 8090 (set via environment variable in Portainer)

**To change the port:**
- In Portainer, edit the stack's environment variables
- Or set `PORT=9090` (or any unused port)

**Common ports to avoid** (likely used by your Plex services):
- 80, 443, 5000, 5001 (Synology)
- 32400 (Plex)
- 8080, 8096 (Media servers)
- 8989, 7878, 9091, 6767, 8686, 5055 (*arr apps, Transmission, Overseerr)

### Updating the Deployment
1. Build: `yarn build`
2. Commit and push changes
3. In Portainer, go to the stack and click "Pull and redeploy"

### Synology Volume Mount (Alternative)
If you want to use your existing `/volume1/docker_ssd/guider_arch/` directory instead:

1. Copy dist files to Synology:
   ```bash
   scp -r dist/ user@synology:/volume1/docker_ssd/guider_arch/
   scp nginx.conf user@synology:/volume1/docker_ssd/guider_arch/
   ```

2. Modify `docker-compose.yml` volumes:
   ```yaml
   volumes:
     - /volume1/docker_ssd/guider_arch/dist:/usr/share/nginx/html:ro
     - /volume1/docker_ssd/guider_arch/nginx.conf:/etc/nginx/conf.d/default.conf:ro
   ```
