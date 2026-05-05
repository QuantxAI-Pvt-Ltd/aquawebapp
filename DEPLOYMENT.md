# Server Deployment Guide

Follow this guide to deploy the Aqua Web App onto your Linux server. This streamlined guide focuses on the core setup steps: installing MongoDB, authenticating, fetching the code, pulling the Docker images, and configuring the web server.

## 1. Install MongoDB (`mongod` & `mongosh`)

Install the official MongoDB Community Edition (adjust the version `7.0` and codename `jammy` if using an OS other than Ubuntu 22.04). The `mongodb-org` package will install both the `mongod` server and the `mongosh` shell.

```bash
# Import the public key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Create a list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database and install mongod and mongosh
sudo apt update
sudo apt install -y mongodb-org

# Start and enable the MongoDB service to run on boot
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 2. Authenticate with GitHub Container Registry (GHCR)

To pull the private Docker images, authenticate with GitHub using your Personal Access Token (PAT). Ensure your PAT has the `read:packages` scope.

```bash
# Replace YOUR_GITHUB_PAT and YOUR_GITHUB_USERNAME with your actual details
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## 3. Clone the Repository

Clone the project repository to your server to get the necessary deployment files (like `docker-compose.yml`).

```bash
# Replace <YOUR_REPO_URL> with the actual Git URL
git clone <YOUR_REPO_URL>
cd aqua/aquawebapp
```
*(Note: If the repository is private, you may need to use SSH keys or your PAT for cloning).*

## 4. Setup Environment Variables

Before starting the containers, set up your backend environment variables:

```bash
# Ensure you are inside the cloned aquawebapp directory
nano AquaInsurebackend/.env
```
Add all necessary production environment variables (e.g., Database URIs, API keys, JWT secrets).

## 5. Pull & Start Docker Containers

Pull the latest images from GHCR and start the application in detached mode:

```bash
docker compose pull
docker compose up -d
```

Verify that the services are running correctly:
```bash
docker compose ps
```

## 6. Configure Apache Reverse Proxy

To expose your frontend, backend, and dashboard via standard web ports (HTTP/HTTPS) using domains, you need to modify your Apache configuration.

First, ensure the necessary Apache proxy modules are enabled:
```bash
sudo a2enmod proxy proxy_http headers rewrite
sudo systemctl restart apache2
```

Create or modify your VirtualHost configuration:
```bash
sudo nano /etc/apache2/sites-available/aqua.conf
```

Add the following configuration (replace the `ServerName` values with your actual domains):

```apache
<VirtualHost *:80>
    ServerName app.yourdomain.com
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
</VirtualHost>

<VirtualHost *:80>
    ServerName api.yourdomain.com
    ProxyPass / http://localhost:5001/
    ProxyPassReverse / http://localhost:5001/
</VirtualHost>

<VirtualHost *:80>
    ServerName admin.yourdomain.com
    ProxyPass / http://localhost:5002/
    ProxyPassReverse / http://localhost:5002/
</VirtualHost>
```

Enable the site and reload Apache to apply changes:
```bash
sudo a2ensite aqua.conf
sudo systemctl reload apache2
```

*(To secure your site with HTTPS, you can run `sudo certbot --apache` after this step).*
