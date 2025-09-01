import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@db/base';

const TrackLeadSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  event: z.enum(['page_visit', 'plan_selection', 'checkout_started', 'payment_attempted', 'payment_completed', 'payment_failed']),
  metadata: z.record(z.string()).optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
});

// In a real implementation, you'd store this in a database
// For now, we'll simulate with in-memory storage (this will reset on server restart)
const leads: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = TrackLeadSchema.parse(body);
    
    // Get session for authenticated users
    const session = await getServerSession();
    
    // Get IP address from headers
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown';
    
    // Get User Agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const leadData = {
      id: Date.now().toString(), // Simple ID generation
      timestamp: new Date().toISOString(),
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || validatedData.email || null,
      userName: session?.user?.name || validatedData.name || null,
      event: validatedData.event,
      metadata: validatedData.metadata || {},
      ip: validatedData.ip || ip,
      userAgent: validatedData.userAgent || userAgent,
      isAuthenticated: !!session?.user,
    };

    // Store the lead (in a real app, this would go to a database)
    leads.push(leadData);

    console.log('Lead tracked:', {
      event: leadData.event,
      userId: leadData.userId,
      email: leadData.userEmail,
      metadata: leadData.metadata,
    });

    // Send admin notification for payment failures
    if (leadData.event === 'payment_failed') {
      await sendPaymentFailureNotification(leadData);
    }

    return NextResponse.json({
      success: true,
      leadId: leadData.id,
    });

  } catch (error: any) {
    console.error('Lead tracking error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid request data',
            details: error.errors,
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: error.message || 'Failed to track lead',
        } 
      },
      { status: 500 }
    );
  }
}

// Get leads for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    // Check if user is admin (you'll need to implement admin check logic)
    // For now, we'll just check if they're authenticated
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // In a real implementation, you'd check if the user has admin privileges
    // const isAdmin = await checkUserIsAdmin(session.user.id);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { success: false, error: { message: 'Forbidden' } },
    //     { status: 403 }
    //   );
    // }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const event = searchParams.get('event');

    let filteredLeads = [...leads];

    // Filter by event if specified
    if (event) {
      filteredLeads = filteredLeads.filter(lead => lead.event === event);
    }

    // Sort by timestamp (newest first)
    filteredLeads.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const paginatedLeads = filteredLeads.slice(offset, offset + limit);

    // Calculate summary stats
    const summary = {
      totalLeads: leads.length,
      pageVisits: leads.filter(l => l.event === 'page_visit').length,
      checkoutsStarted: leads.filter(l => l.event === 'checkout_started').length,
      paymentsAttempted: leads.filter(l => l.event === 'payment_attempted').length,
      paymentsCompleted: leads.filter(l => l.event === 'payment_completed').length,
      paymentsFailed: leads.filter(l => l.event === 'payment_failed').length,
      conversionRate: leads.length > 0 ? 
        (leads.filter(l => l.event === 'payment_completed').length / leads.filter(l => l.event === 'page_visit').length * 100).toFixed(2) 
        : '0.00'
    };

    return NextResponse.json({
      success: true,
      data: {
        leads: paginatedLeads,
        summary,
        pagination: {
          limit,
          offset,
          total: filteredLeads.length,
          hasMore: offset + limit < filteredLeads.length,
        }
      }
    });

  } catch (error: any) {
    console.error('Lead fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: error.message || 'Failed to fetch leads',
        } 
      },
      { status: 500 }
    );
  }
}

// Send payment failure notification to admins
async function sendPaymentFailureNotification(leadData: any) {
  try {
    // Create admin notification for payment failure
    const notification = await db.notification.create({
      data: {
        title: 'Payment Failed',
        description: `A payment attempt failed for ${leadData.userEmail || leadData.userName || 'Anonymous user'}. Plan: ${leadData.metadata.plan || 'Unknown'}, Amount: £${leadData.metadata.amount ? (parseInt(leadData.metadata.amount) / 100).toFixed(2) : 'Unknown'}, Error: ${leadData.metadata.error || 'Unknown error'}`,
        type: 'error',
        priority: 'high',
        role: 'admin', // Send to all admins
        metadata: JSON.stringify({
          leadId: leadData.id,
          event: 'payment_failed',
          customerEmail: leadData.userEmail,
          customerName: leadData.userName,
          plan: leadData.metadata.plan,
          amount: leadData.metadata.amount,
          error: leadData.metadata.error,
          paymentMethod: leadData.metadata.paymentMethod,
          timestamp: leadData.timestamp,
          ip: leadData.ip,
        }),
      },
    });

    // Find all admin users and create recipient records
    const adminMemberships = await db.membership.findMany({
      where: {
        role: 'admin',
        status: 'active',
      },
      select: { userId: true },
    });

    if (adminMemberships.length > 0) {
      const recipientData = adminMemberships.map(membership => ({
        notificationId: notification.id,
        userId: membership.userId,
      }));

      await db.notificationRecipient.createMany({
        data: recipientData,
      });

      console.log('📨 Payment failure notification sent to', adminMemberships.length, 'admins');
    }

    // Also check for users who have email notifications enabled for payment failures
    const adminUsers = await db.user.findMany({
      where: {
        id: { in: adminMemberships.map(m => m.userId) },
        emailNotifications: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log('💰 Payment failure notification created:', {
      notificationId: notification.id,
      customerEmail: leadData.userEmail,
      plan: leadData.metadata.plan,
      amount: leadData.metadata.amount,
      error: leadData.metadata.error,
      adminRecipients: adminUsers.length,
    });

  } catch (error) {
    console.error('❌ Failed to send payment failure notification:', error);
  }
}