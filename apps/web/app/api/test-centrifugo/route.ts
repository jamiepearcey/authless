import { NextRequest, NextResponse } from 'next/server';
// import { centrifugoService } from '@trpc/base/centrifugo';

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

    // const success = await centrifugoService.publish(channel, message);
    
    // Temporary mock response since centrifugoService is not available
    console.log('✅ [test-centrifugo] Mock: Message would be published successfully');
    return NextResponse.json({ success: true, message: 'Mock: Message published successfully' });
  } catch (error) {
    console.error('❌ [test-centrifugo] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
