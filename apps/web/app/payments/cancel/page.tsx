"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { 
  XCircle, 
  ArrowLeft, 
  RefreshCw,
  HelpCircle,
  CreditCard
} from 'lucide-react';

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto ">
        
        {/* Cancel Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <XCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600">
            Your payment was cancelled and no charges were made to your account.
          </p>
        </div>

        {/* Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What happened?</CardTitle>
            <CardDescription>
              You cancelled the payment process before it was completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">No charges were made</h3>
                    <p className="text-blue-800 text-sm">
                      Since you cancelled the payment, your card or account has not been charged. 
                      You can safely try again when you're ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button onClick={() => router.push('/payments')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Payment Again
          </Button>
          
          <Button onClick={() => router.push('/payments')} variant="outline">
            <CreditCard className="h-4 w-4 mr-2" />
            Choose Different Method
          </Button>
          
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Help Section */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <HelpCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-600 text-sm mb-4">
                If you're having trouble with payments or have questions, our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={() => router.push('/contact')} 
                  variant="outline" 
                  size="sm"
                >
                  Contact Support
                </Button>
                <Button 
                  onClick={() => router.push('/faq')} 
                  variant="outline" 
                  size="sm"
                >
                  View FAQ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <div className="mt-6 text-center">
          <details className="text-left">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900 mb-2">
              Common reasons for payment cancellation
            </summary>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
              <ul className="space-y-2">
                <li>• You clicked the back button or closed the browser tab</li>
                <li>• You decided not to complete the purchase</li>
                <li>• You wanted to use a different payment method</li>
                <li>• You needed to check your account balance first</li>
                <li>• The payment session timed out due to inactivity</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}