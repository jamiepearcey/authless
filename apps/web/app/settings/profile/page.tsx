"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { User, Camera, Save, toast } from "lucide-react";
import { t } from "@i18n-core";
import { trpc } from "@/lib/trpc";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    website: "",
    timezone: "UTC",
    locale: "en",
  });

  // Get current user data
  const { data: userData, refetch: refetchUser } = trpc.getCurrentUser.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Update user mutation
  const updateUser = trpc.updateUser.useMutation({
    onSuccess: (updatedUser) => {
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

  // Initialize form data when user data loads
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        bio: userData.bio || "",
        location: userData.location || "",
        website: userData.website || "",
        timezone: userData.timezone || "UTC",
        locale: userData.locale || "en",
      });
    }
  }, [userData]);

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
        website: formData.website,
        timezone: formData.timezone,
        locale: formData.locale,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Profile Information
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-gray-600" />
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Profile Photo
              </h4>
              <p className="text-sm text-gray-500">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="mt-1"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className="mt-1 bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address cannot be changed
            </p>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="mt-1"
              placeholder="City, Country"
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website" className="block text-sm font-medium text-gray-700">
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
          </div>

          {/* Timezone and Locale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </Label>
              <Select value={formData.timezone} onValueChange={(value) => handleInputChange("timezone", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="locale" className="block text-sm font-medium text-gray-700">
                Language
              </Label>
              <Select value={formData.locale} onValueChange={(value) => handleInputChange("locale", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
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
  );
}
