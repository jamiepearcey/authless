#!/bin/bash

# Backup original hosts file
sudo cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d%H%M%S)

# Remove previous tenant entries if they exist
sudo sed -i '' '/# Localhost subdomains for tenant testing/,/default.localhost/d' /etc/hosts
sudo sed -i '' '/# Tenant subdomains for testing/,/default.test/d' /etc/hosts

echo "🌐 Setting up /etc/hosts for localhost subdomain testing..."

# Add new tenant entries
echo "" | sudo tee -a /etc/hosts
echo "# Tenant subdomains for testing" | sudo tee -a /etc/hosts
echo "127.0.0.1 acme.test" | sudo tee -a /etc/hosts
echo "127.0.0.1 startup.test" | sudo tee -a /etc/hosts
echo "127.0.0.1 enterprise.test" | sudo tee -a /etc/hosts
echo "127.0.0.1 default.test" | sudo tee -a /etc/hosts
echo "✅ /etc/hosts updated with tenant subdomains"

# Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

echo ""
echo "🧪 Test your setup:"
echo "   ping acme.test"
echo "   ping startup.test"
echo ""
echo "🌐 Your tenant URLs will now work:"
echo "   http://acme.test:3000 (or whatever port Next.js is using)"
echo "   http://startup.test:3000"
echo "   http://enterprise.test:3000"
echo "   http://default.test:3000"
echo ""
echo "📝 Note: Check your terminal for the actual port Next.js is using!"
echo ""
echo "🔄 To flush DNS cache: sudo dscacheutil -flushcache"
echo "🛑 To restore: sudo cp /etc/hosts.backup.* /etc/hosts"
