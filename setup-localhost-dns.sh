#!/bin/bash

echo "🌐 Setting up localhost DNS for subdomain testing..."

# Check if dnsmasq is running
if ! pgrep -x "dnsmasq" > /dev/null; then
    echo "❌ dnsmasq is not running. Please start it first:"
    echo "   sudo brew services start dnsmasq"
    exit 1
fi

# Create resolver directory if it doesn't exist
sudo mkdir -p /etc/resolver

# Create localhost resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/localhost

echo "✅ DNS resolver configured for localhost"
echo ""
echo "🧪 Test your setup:"
echo "   nslookup acme.localhost"
echo "   nslookup startup.localhost"
echo "   nslookup enterprise.localhost"
echo ""
echo "🌐 Your tenant URLs will now work:"
echo "   http://acme.localhost:3000"
echo "   http://startup.localhost:3000"
echo "   http://enterprise.localhost:3000"
echo "   http://default.localhost:3000"
echo ""
echo "🔄 To flush DNS cache: sudo dscacheutil -flushcache"
echo "🛑 To stop: sudo brew services stop dnsmasq"