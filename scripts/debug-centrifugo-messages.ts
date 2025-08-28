import { centrifugoService } from "../packages/trpc/src/centrifugo";
import { Centrifuge } from "centrifuge";

async function debugCentrifugoMessages() {
  console.log("🔍 Debugging Centrifugo Message Flow...");
  
  try {
    const testUserId = "test-user-debug";
    const testChannel = `notifications:user:${testUserId}`;
    
    // Step 1: Test server-side publishing
    console.log("\n1️⃣ Testing server-side publishing...");
    
    const publishResult = await centrifugoService.publish(testChannel, {
      type: 'test_message',
      message: 'Debug test message',
      timestamp: new Date().toISOString()
    });
    
    console.log(`Server-side publish result: ${publishResult ? "✅ SUCCESS" : "❌ FAILED"}`);
    
    // Step 2: Test client-side connection and subscription
    console.log("\n2️⃣ Testing client-side connection...");
    
    const token = centrifugoService.generateToken(testUserId, 3600);
    const centrifugoUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
    const wsUrl = centrifugoUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/connection/websocket';
    
    console.log(`WebSocket URL: ${wsUrl}`);
    console.log(`Token generated: ${!!token}`);
    
    return new Promise((resolve, reject) => {
      const centrifuge = new Centrifuge(wsUrl, { 
        token,
        debug: true 
      });
      
      let connected = false;
      let subscribed = false;
      let messageReceived = false;
      
      // Connection timeout
      const timeout = setTimeout(() => {
        if (!connected) {
          reject(new Error("Connection timeout"));
        } else if (!subscribed) {
          reject(new Error("Subscription timeout"));
        } else {
          resolve({
            connected,
            subscribed,
            messageReceived,
            status: "Timeout waiting for message"
          });
        }
        centrifuge.disconnect();
      }, 10000);
      
      centrifuge.on('connecting', (ctx) => {
        console.log("🔄 Connecting...", ctx);
      });
      
      centrifuge.on('connected', (ctx) => {
        connected = true;
        console.log("✅ Connected successfully!", ctx);
        
        // Create subscription
        const sub = centrifuge.newSubscription(testChannel);
        
        sub.on('subscribing', (ctx) => {
          console.log("🔄 Subscribing to channel...", testChannel, ctx);
        });
        
        sub.on('subscribed', async (ctx) => {
          subscribed = true;
          console.log("✅ Subscribed successfully!", testChannel, ctx);
          
          // Wait a moment, then publish a test message
          setTimeout(async () => {
            console.log("📤 Publishing test message...");
            
            const publishResult2 = await centrifugoService.publish(testChannel, {
              type: 'test_message_after_subscription',
              message: 'This message was sent after subscription',
              timestamp: new Date().toISOString()
            });
            
            console.log(`Second publish result: ${publishResult2 ? "✅ SUCCESS" : "❌ FAILED"}`);
          }, 1000);
        });
        
        sub.on('publication', (ctx) => {
          messageReceived = true;
          console.log("📨 Message received!", ctx);
          
          clearTimeout(timeout);
          centrifuge.disconnect();
          resolve({
            connected,
            subscribed,
            messageReceived,
            messageData: ctx.data,
            status: "SUCCESS - Message received!"
          });
        });
        
        sub.on('error', (ctx) => {
          console.error("❌ Subscription error:", ctx);
          clearTimeout(timeout);
          centrifuge.disconnect();
          reject(new Error(`Subscription error: ${ctx.error?.message}`));
        });
        
        // Start subscription
        sub.subscribe();
      });
      
      centrifuge.on('disconnected', (ctx) => {
        console.log("🔌 Disconnected", ctx);
      });
      
      centrifuge.on('error', (ctx) => {
        console.error("❌ Connection error:", ctx);
        clearTimeout(timeout);
        reject(new Error(`Connection error: ${ctx.error?.message}`));
      });
      
      // Start connection
      centrifuge.connect();
    });
    
  } catch (error) {
    console.error("❌ Debug test failed:", error);
    throw error;
  }
}

// Run the debug test
debugCentrifugoMessages()
  .then((result) => {
    console.log("\n🎉 Debug test completed:");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Debug test failed!");
    process.exit(1);
  });
