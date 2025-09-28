import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@db/index';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.orderId;

    // Get order with all related data
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: session.user.id },
          { tenant: { users: { some: { id: session.user.id } } } },
          // Admin can access any order
          ...(session.user.platformRole === 'admin' ? [{}] : [])
        ]
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
        invoices: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        subscription: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate PDF content
    const pdfContent = generateOrderPDF(order);

    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="order-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateOrderPDF(order: any): string {
  // This is a simplified PDF generation using HTML/CSS that can be converted to PDF
  // In a real implementation, you'd use a library like puppeteer, jsPDF, or @react-pdf/renderer
  
  const formatCurrency = (amount: number, currency: string = 'gbp') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { text: string; color: string } } = {
      'PENDING': { text: 'Pending', color: '#f59e0b' },
      'PROCESSING': { text: 'Processing', color: '#3b82f6' },
      'COMPLETED': { text: 'Completed', color: '#10b981' },
      'CANCELLED': { text: 'Cancelled', color: '#ef4444' },
      'REFUNDED': { text: 'Refunded', color: '#8b5cf6' },
    };
    return statusMap[status] || { text: status, color: '#6b7280' };
  };

  const statusInfo = getStatusBadge(order.status);

  // Generate HTML content that can be converted to PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order ${order.orderNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .order-title {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          margin: 0;
        }
        .order-number {
          font-size: 18px;
          color: #6b7280;
          margin: 5px 0 0 0;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          background-color: ${statusInfo.color};
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: 500;
          color: #6b7280;
          font-size: 14px;
        }
        .info-value {
          color: #1f2937;
          font-size: 16px;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .invoice-table th,
        .invoice-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .invoice-table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .amount {
          text-align: right;
          font-weight: 600;
        }
        .paid {
          color: #10b981;
        }
        .pending {
          color: #f59e0b;
        }
        .billing-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="order-title">Order Details</h1>
        <p class="order-number">Order #${order.orderNumber}</p>
        <span class="status-badge">${statusInfo.text}</span>
      </div>

      <div class="section">
        <h2 class="section-title">Order Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Order Date</div>
            <div class="info-value">${formatDate(order.createdAt)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Amount</div>
            <div class="info-value">${formatCurrency(order.totalAmount, order.currency)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Currency</div>
            <div class="info-value">${order.currency.toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Description</div>
            <div class="info-value">${order.description || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Customer Information</h2>
        <div class="info-grid">
          ${order.user ? `
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${order.user.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${order.user.email || 'N/A'}</div>
            </div>
          ` : order.tenant ? `
            <div class="info-item">
              <div class="info-label">Organization</div>
              <div class="info-value">${order.tenant.name || 'N/A'}</div>
            </div>
          ` : order.guestName ? `
            <div class="info-item">
              <div class="info-label">Guest Name</div>
              <div class="info-value">${order.guestName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Guest Email</div>
              <div class="info-value">${order.guestEmail || 'N/A'}</div>
            </div>
          ` : `
            <div class="info-item">
              <div class="info-value">No customer information available</div>
            </div>
          `}
        </div>
      </div>

      ${(order.billingCompanyName || order.billingVatNumber || order.billingAddressLine1) ? `
        <div class="section">
          <h2 class="section-title">Billing Information</h2>
          <div class="billing-section">
            <div class="info-grid">
              ${order.billingCompanyName ? `
                <div class="info-item">
                  <div class="info-label">Company Name</div>
                  <div class="info-value">${order.billingCompanyName}</div>
                </div>
              ` : ''}
              ${order.billingVatNumber ? `
                <div class="info-item">
                  <div class="info-label">VAT Number</div>
                  <div class="info-value">${order.billingVatNumber}</div>
                </div>
              ` : ''}
              ${order.billingAddressLine1 ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                  <div class="info-label">Billing Address</div>
                  <div class="info-value">
                    ${order.billingAddressLine1}<br>
                    ${order.billingAddressLine2 ? order.billingAddressLine2 + '<br>' : ''}
                    ${order.billingCity}${order.billingState ? ', ' + order.billingState : ''} ${order.billingPostalCode || ''}<br>
                    ${order.billingCountry || ''}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="section">
        <h2 class="section-title">Invoices & Payments</h2>
        ${order.invoices && order.invoices.length > 0 ? `
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Payments</th>
              </tr>
            </thead>
            <tbody>
              ${order.invoices.map((invoice: any) => `
                <tr>
                  <td>${invoice.invoiceNumber}</td>
                  <td class="amount">${formatCurrency(invoice.amount, invoice.currency)}</td>
                  <td>
                    <span class="${invoice.status === 'PAID' ? 'paid' : 'pending'}">
                      ${invoice.status}
                    </span>
                  </td>
                  <td>${formatDate(invoice.dueDate)}</td>
                  <td>
                    ${invoice.payments && invoice.payments.length > 0 ? 
                      invoice.payments.map((payment: any) => 
                        `${formatCurrency(payment.amount, payment.currency)} (${payment.status})`
                      ).join(', ') : 'No payments'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <p>No invoices found for this order.</p>
        `}
      </div>

      ${order.isSubscription && order.subscription ? `
        <div class="section">
          <h2 class="section-title">Subscription Details</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">${order.subscription.status}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Frequency</div>
              <div class="info-value">${order.subscription.frequency}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Next Billing Date</div>
              <div class="info-value">${formatDate(order.subscription.nextBillingDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Amount</div>
              <div class="info-value">${formatCurrency(order.subscription.amount, order.subscription.currency)}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p>Generated on ${formatDate(new Date())}</p>
        <p>This is an automated invoice. Please contact support if you have any questions.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}
