import { NextRequest, NextResponse } from 'next/server';
import { centrifugoService } from '@trpc/base/centrifugo';

export async function POST(request: NextRequest) {
  try {
    const { channel, message } = await request.json();
    
    if (!channel || !message) {
      return NextResponse.json(
        { error: 'Missing channel or message' },
        { status: 400 }
      );
    }

    console.log('🧪 [test-centrifugo] Publishing message to channel:', channel);
    console.log('🧪 [test-centrifugo] Message:', message);

    const success = await centrifugoService.publish(channel, message);
    
    if (success) {
      console.log('✅ [test-centrifugo] Message published successfully');
      return NextResponse.json({ success: true, message: 'Message published successfully' });
    } else {
      console.log('❌ [test-centrifugo] Failed to publish message');
      return NextResponse.json(
        { error: 'Failed to publish message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [test-centrifugo] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
