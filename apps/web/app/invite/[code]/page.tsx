"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label } from "@ui/base";
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const invitationCode = params.code as string;
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const validateInvitation = trpc.validateInvitation.useMutation({
    onSuccess: (data) => {
      setInvitation(data.invitation);
      setIsValidating(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsValidating(false);
    },
  });

  const acceptInvitation = trpc.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully! You can now sign in.");
      router.push("/signin");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (invitationCode) {
      setIsValidating(true);
      validateInvitation.mutate({ token: invitationCode });
    }
  }, [invitationCode]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Clear previous errors
    setValidationErrors([]);
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setValidationErrors(["Passwords do not match"]);
      return;
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }
    
    try {
      await acceptInvitation.mutateAsync({
        token: invitationCode,
        password: formData.password,
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation code is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/signin")} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            Welcome to {invitation.tenantName}! Please set a secure password to complete your account setup.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pr-10"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {/* show passwords must match hint */}
                <li className={`flex items-center gap-2 ${formData.password === formData.confirmPassword ? 'text-green-600' : submitted ? 'text-red-600' : ''}`}>
                  {
                      submitted && formData.password != formData.confirmPassword ? (<>
                        <AlertCircle className={`h-3 w-3 text-red-600`} />
                        Passwords do not match
                      </>) : (<>
                        <CheckCircle className={`h-3 w-3 ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-gray-400'}`} />
                        Passwords must match
                      </>)

                  }
                </li>
                <li className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600' : submitted ? 'text-red-600' : ''}`}>
                  <CheckCircle className={`h-3 w-3 ${formData.password.length >= 8 ? 'text-green-600' : submitted ? 'text-red-600' : 'text-gray-400'}`} />
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : ''}`}>
                  <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : 'text-gray-400'}`} />
                  One uppercase letter
                </li>
                <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : ''}`}>
                  <CheckCircle className={`h-3 w-3 ${/[a-z]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : 'text-gray-400'}`} />
                  One lowercase letter
                </li>
                <li className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : ''}`}>
                  <CheckCircle className={`h-3 w-3 ${/[0-9]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : 'text-gray-400'}`} />
                  One number
                </li>
                <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : ''}`}>
                  <CheckCircle className={`h-3 w-3 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : submitted ? 'text-red-600' : 'text-gray-400'}`} />
                  One special character
                </li>
              </ul>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                  <div className="ml-2">
                    <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={acceptInvitation.isPending || !formData.password || !formData.confirmPassword}
            >
              {acceptInvitation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
