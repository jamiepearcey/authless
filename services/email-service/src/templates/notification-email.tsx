import React from 'react';

interface NotificationEmailProps {
  title: string;
  description?: string;
  type?: string;
  [key: string]: any; // Allow additional template variables
}

/**
 * Generic notification email template
 * Supports any notification type with customizable content
 */
export function NotificationEmail({ 
  title, 
  description,
  type = 'info',
  ...additionalProps 
}: NotificationEmailProps) {
  const getTypeColor = (notificationType: string) => {
    switch (notificationType.toLowerCase()) {
      case 'error':
      case 'critical':
        return '#dc3545';
      case 'warning':
        return '#fd7e14';
      case 'success':
        return '#198754';
      case 'support':
        return '#0d6efd';
      default:
        return '#6c757d';
    }
  };

  const getTypeIcon = (notificationType: string) => {
    switch (notificationType.toLowerCase()) {
      case 'error':
      case 'critical':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'success':
        return '✅';
      case 'support':
        return '💬';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '600px', 
      margin: '0 auto',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: getTypeColor(type),
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>
          {getTypeIcon(type)}
        </div>
        <h1 style={{ 
          color: '#ffffff',
          margin: '0',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          {title}
        </h1>
      </div>

      {/* Main Content */}
      <div style={{ padding: '30px 20px' }}>
        {description && (
          <div style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#333333',
            marginBottom: '20px'
          }}>
            {description}
          </div>
        )}

        {/* Additional content for specific notification types */}
        {type === 'support' && additionalProps.caseNumber && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <strong>Case Number:</strong> {additionalProps.caseNumber}
          </div>
        )}

        {/* Dynamic content based on additional props */}
        {Object.entries(additionalProps).map(([key, value]) => {
          if (key === 'caseNumber') return null; // Already handled above
          if (typeof value === 'string' || typeof value === 'number') {
            return (
              <div key={key} style={{ marginBottom: '10px' }}>
                <strong style={{ textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                </strong> {value}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        textAlign: 'center',
        borderTop: '1px solid #dee2e6'
      }}>
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}