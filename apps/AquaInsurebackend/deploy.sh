#!/bin/bash

# ==============================================================================
# AQUAINSURE AUTOMATED DEPLOYMENT SCRIPT (Ubuntu/Debian)
# ==============================================================================
# This script automates the deployment steps documented in APACHE_DEPLOYMENT_GUIDE.txt

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting AquaInsure Deployment..."

# 1. Update and install dependencies
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y apache2 mongodb-org
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install 25.8.2
nvm use 25.8.2 
nvm current

# 2. Enable Apache modules
echo "🔧 Enabling Apache modules..."
sudo a2enmod proxy proxy_http rewrite

# 3. Setup global NPM packages (PM2)
echo "📦 Installing PM2 globally..."
sudo npm install -g pm2

# Define paths
APP_DIR="/home/jaswant/aquafiles/aqua"
FRONTEND_DIR="$APP_DIR/AquaInsure"
BACKEND_DIR="$APP_DIR/back_insure"
ADMIN_DIR="$APP_DIR/recorddashboard"
APACHE_WEB_ROOT="/var/www/html/aquainsure"

# 4. Install backend dependencies and start PM2 service
echo "⚙️ Setting up back_insure API..."
cd "$BACKEND_DIR"
npm install
pm2 stop back_insure 2>/dev/null || true
pm2 start server.js --name back_insure

# 5. Install AdminJS dependencies, build, and start PM2 service
echo "📊 Setting up recorddashboard AdminJS..."
cd "$ADMIN_DIR"
npm install
npm run build
pm2 stop recorddashboard 2>/dev/null || true
pm2 start "npm start" --name recorddashboard --cwd "$ADMIN_DIR"

# 6. Install frontend dependencies and build
echo "⚛️ Building AquaInsure frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build

# 7. Copy frontend to Apache web root
echo "📂 Copying frontend build to Apache web root..."
sudo mkdir -p "$APACHE_WEB_ROOT"
sudo cp -r dist/. "$APACHE_WEB_ROOT/"
sudo chown -R www-data:www-data "$APACHE_WEB_ROOT"

# 8. Create .htaccess for React client-side routing
echo "📝 Creating .htaccess for React Router..."
sudo tee "$APACHE_WEB_ROOT/.htaccess" > /dev/null << 'EOF'
Options -MultiViews
RewriteEngine On
RewriteBase /aquainsure/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
EOF

# 9. Configure Apache
echo "📝 Configuring Apache..."

# 9a. Check and append Alias block to apache2.conf if it doesn't exist
if ! grep -q "Alias /aquainsure" /etc/apache2/apache2.conf; then
    sudo tee -a /etc/apache2/apache2.conf > /dev/null << 'EOF'

# AquaInsure SPA Alias
Alias /aquainsure "/var/www/html/aquainsure"

<Directory /var/www/html/aquainsure>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
</Directory>
EOF
    echo "   Added Alias block to apache2.conf."
else
    echo "   Alias block already exists in apache2.conf."
fi

# 9b. Ensure AllowOverride All in /var/www/
sudo sed -i 's/<Directory \/var\/www\/>\n        Options Indexes FollowSymLinks\n        AllowOverride None/<Directory \/var\/www\/>\n        Options Indexes FollowSymLinks\n        AllowOverride All/g' /etc/apache2/apache2.conf

# 9c. Update 000-default.conf proxy settings
CONF_FILE="/etc/apache2/sites-enabled/000-default.conf"

if ! grep -q "ProxyPass /api" "$CONF_FILE"; then
    # Insert before the closing </VirtualHost> tag
    sudo sed -i '/<\/VirtualHost>/i \
\
        # AquaInsure Proxy config \
        <Directory /var/www/html/aquainsure> \
                Options Indexes FollowSymLinks \
                AllowOverride All \
                Require all granted \
        </Directory> \
\
        ProxyPass /api http://localhost:5001/api \
        ProxyPassReverse /api http://localhost:5001/api \
' "$CONF_FILE"
    echo "   Added ProxyPass configuration to 000-default.conf."
else
     # Fix incorrect port 3000 to 5001 if it exists
     sudo sed -i 's/ProxyPass \/api http:\/\/localhost:3000\/api/ProxyPass \/api http:\/\/localhost:5001\/api/g' "$CONF_FILE"
     sudo sed -i 's/ProxyPassReverse \/api http:\/\/localhost:3000\/api/ProxyPassReverse \/api http:\/\/localhost:5001\/api/g' "$CONF_FILE"
     echo "   ProxyPass already configured (updated to port 5001 if necessary)."
fi


# 10. Restart PM2 and Apache
echo "🔄 Restarting services..."
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true
sudo systemctl restart apache2

echo "✅ Deployment complete!"
echo "➡️ AquaInsure Frontend: http://<server-ip>/aquainsure/"
echo "➡️ AquaInsure API:      http://<server-ip>/api/"
echo "➡️ Admin Dashboard:     http://<server-ip>:8081/admin"
