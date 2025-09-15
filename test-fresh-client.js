#!/usr/bin/env node

// Test with the exact same import path the TRPC app uses
const { db } = require('./packages/db/src/client');

async function testFreshClient() {
  try {
    console.log('🔍 Testing with the same db import path as TRPC...');
    
    // This is the exact query that was failing in getAuditFilterOptions
    const userIds = await db.auditLog.findMany({
      select: { 
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      distinct: ['userId'],
      orderBy: { userId: 'asc' },
      take: 5,
    });
    
    console.log(`✅ Successfully queried ${userIds.length} distinct userIds`);
    
    userIds.forEach((item, index) => {
      console.log(`📝 Item ${index + 1}:`, {
        userId: item.userId,
        userName: item.user?.name || 'N/A',
        userEmail: item.user?.email || 'N/A'
      });
    });
    
    console.log('✅ Fresh client works correctly with nullable userId!');
    
  } catch (error) {
    console.error('❌ Fresh client test failed:', error.message);
    
    if (error.message.includes('non-nullable')) {
      console.error('🚨 Still getting non-nullable error - client cache not cleared');
    }
  } finally {
    await db.$disconnect();
  }
}

testFreshClient();