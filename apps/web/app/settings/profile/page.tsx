"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Label, Textarea, toast, Badge } from "@ui/base";
import { User, Camera, Save, MapPin, Globe, FileText, AlertCircle, Shield, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProfilePhotoUploadDialog } from "@/components/ProfilePhotoUploadDialog";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    website: ""
  });

  // Get current user data
  const { data: userData, refetch: refetchUser } = trpc.getCurrentUser.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Update user mutation
  const updateUser = trpc.updateUser.useMutation({
    onSuccess: (updatedUser) => {
      setHasUnsavedChanges(false);
      toast.success("Profile updated successfully!");
      // Update session with new data
      update({
        ...session,
        user: {
          ...session?.user,
          name: updatedUser.name,
        },
      });
      refetchUser();
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });



  // Update profile photo mutation
  const updateProfilePhoto = trpc.updateProfilePhoto.useMutation({
    onSuccess: (updatedUser) => {
      // Update session with new image
      update({
        ...session,
        user: {
          ...session?.user,
          email: updatedUser.email,
          image: updatedUser.image,
        },
      });
      refetchUser();
    },
    onError: (error) => {
      toast.error(`Failed to update profile photo: ${error.message}`);
    },
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        bio: userData.bio || "",
        location: userData.location || "",
        website: userData.website || ""
      });
    }
  }, [userData]);

  const handleProfilePhotoUpload = async (imageFile: File) => {
    if (!session?.user?.id) return;
    
    await updateProfilePhoto.mutateAsync({
      userId: session.user.id,
      imageFile,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      await updateUser.mutateAsync({
        id: session.user.id,
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        website: formData.website
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };
      setHasUnsavedChanges(true);
      return newData;
    });
  };

  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-start space-x-6">
            {/* Avatar Section with Upload */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                  {session?.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-500 flex items-center justify-center">
                      <User className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>
                
                <ProfilePhotoUploadDialog
                  currentImageUrl={session?.user?.image}
                  onImageUpload={handleProfilePhotoUpload}
                  trigger={
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 truncate">
                  {session.user.name || 'User Profile'}
                </h2>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{session.user.email}</p>
                    <p className="text-xs text-gray-500">Primary email address</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile Status</p>
                    <p className="text-xs text-gray-500">Complete your profile information</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Member since</p>
                    <p className="text-xs text-gray-500">January 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Completion Status */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Profile Photo</p>
                  <p className="text-xs text-gray-500">{session.user.image ? 'Uploaded' : 'Not set'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Bio Information</p>
                  <p className="text-xs text-gray-500">{formData.bio ? 'Complete' : 'Incomplete'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-xs text-gray-500">{formData.location ? 'Set' : 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-indigo-600" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Profile Information
              </h3>
            </div>
            
            {/* Save Status */}
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Unsaved changes</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                  placeholder="Enter your full name"
                />
                <p className="text-xs text-gray-500">This will be displayed on your profile</p>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="mt-1"
                  placeholder="City, Country"
                />
                <p className="text-xs text-gray-500">Help others find you</p>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" />
                Bio
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="Tell us about yourself, your interests, or what you're working on..."
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">Share a bit about yourself</p>
                <p className="text-xs text-gray-400">{formData.bio.length}/500</p>
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="mt-1"
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500">Link to your personal website or portfolio</p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                type="submit"
                disabled={isLoading || !hasUnsavedChanges}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
