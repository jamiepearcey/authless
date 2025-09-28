"use client";

import { useState } from 'react';
import { Button } from '@ui/base';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { 
  AlertTriangle, 
  X, 
  Loader2,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';

interface SubscriptionCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, feedback?: string) => Promise<void>;
  subscription: {
    id: string;
    status: string;
    frequency: string;
    nextBillingDate: string;
  };
  order: {
    orderNumber: string;
    totalAmount: number;
    currency: string;
  };
  isLoading?: boolean;
}

const cancellationReasons = [
  { 
    value: 'too_expensive', 
    label: 'Too expensive',
    description: 'The service costs more than I can afford'
  },
  { 
    value: 'not_using', 
    label: 'Not using the service',
    description: 'I\'m not actively using the features'
  },
  { 
    value: 'switching_provider', 
    label: 'Switching to another provider',
    description: 'Found a better alternative solution'
  },
  { 
    value: 'business_closure', 
    label: 'Business closure/change',
    description: 'Closing business or significant business changes'
  },
  { 
    value: 'other', 
    label: 'Other reason',
    description: 'Different reason not listed above'
  }
];

export function SubscriptionCancellationModal({
  isOpen,
  onClose,
  onConfirm,
  subscription,
  order,
  isLoading = false
}: SubscriptionCancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState<'reason' | 'confirmation' | 'processing'>('reason');

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const selectedReasonData = cancellationReasons.find(r => r.value === selectedReason);
  const confirmationPhrase = `cancel subscription ${order.orderNumber}`;
  const isConfirmationValid = confirmationText.toLowerCase() === confirmationPhrase.toLowerCase();

  const handleReasonSubmit = () => {
    if (selectedReason) {
      setStep('confirmation');
    }
  };

  const handleCancel = () => {
    setStep('reason');
    setSelectedReason('');
    setFeedback('');
    setConfirmationText('');
    onClose();
  };

  const handleConfirmCancellation = async () => {
    if (!isConfirmationValid) return;
    
    setStep('processing');
    try {
      await onConfirm(selectedReason, feedback);
      handleCancel(); // Reset and close
    } catch (error) {
      setStep('confirmation'); // Go back to confirmation on error
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {step === 'reason' && (
          <Card className="border-0 shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Cancel Subscription</CardTitle>
                    <CardDescription>
                      We're sorry to see you go. Help us understand why you're cancelling.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              {/* Subscription Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3">Subscription Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Order #{order.orderNumber}</p>
                      <p className="text-blue-700">{formatCurrency(order.totalAmount, order.currency)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Billing Frequency</p>
                      <p className="text-blue-700 capitalize">{subscription.frequency.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Next Billing Date</p>
                      <p className="text-blue-700">{formatDate(subscription.nextBillingDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation Impact Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">What happens when you cancel?</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Your subscription will be cancelled immediately</li>
                  <li>• No future payments will be charged</li>
                  <li>• Access will continue until {formatDate(subscription.nextBillingDate)}</li>
                  <li>• You can resubscribe at any time</li>
                </ul>
              </div>

              {/* Reason Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Why are you cancelling?</h3>
                <div className="space-y-2">
                  {cancellationReasons.map((reason) => (
                    <label
                      key={reason.value}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedReason === reason.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancellation-reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{reason.label}</div>
                        <div className="text-sm text-gray-600">{reason.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Additional Feedback */}
                {selectedReason && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional feedback (optional)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Help us improve by sharing more details..."
                    />
                  </div>
                )}
              </div>
            </CardContent>

            <div className="border-t p-6 flex justify-between">
              <Button variant="outline" onClick={handleCancel}>
                Keep Subscription
              </Button>
              <Button
                onClick={handleReasonSubmit}
                disabled={!selectedReason}
                className="bg-red-600 hover:bg-red-700"
              >
                Continue Cancellation
              </Button>
            </div>
          </Card>
        )}

        {step === 'confirmation' && (
          <Card className="border-0 shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Confirm Cancellation</CardTitle>
                    <CardDescription>
                      This action cannot be undone. Please confirm you want to cancel.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('reason')}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              {/* Confirmation Summary */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-900 mb-3">Cancellation Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-700">Order:</span>
                    <span className="font-medium text-red-900">#{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Reason:</span>
                    <span className="font-medium text-red-900">{selectedReasonData?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Status after cancellation:</span>
                    <span className="font-medium text-red-900">Cancelled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Future billing:</span>
                    <span className="font-medium text-red-900">Stopped</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To confirm cancellation, type "{confirmationPhrase}" below:
                  </label>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      confirmationText && !isConfirmationValid
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder={confirmationPhrase}
                  />
                  {confirmationText && !isConfirmationValid && (
                    <p className="text-sm text-red-600 mt-1">
                      Please type the exact phrase to confirm cancellation.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>

            <div className="border-t p-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep('reason')}>
                Back
              </Button>
              <Button
                onClick={handleConfirmCancellation}
                disabled={!isConfirmationValid || isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </div>
          </Card>
        )}

        {step === 'processing' && (
          <Card className="border-0 shadow-none">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold">Cancelling Subscription</h3>
                <p className="text-gray-600">
                  Please wait while we process your cancellation...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}