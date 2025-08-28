interface ImageUploadResponse {
  success: boolean;
  imageUrl?: string;
  bucketPath?: string;
  error?: string;
}

interface ProfilePhotoUploadData {
  userId: string;
  imageFile: File;
  bucketPath?: string;
}

export class ImageUploadService {
  private uploadEndpoint: string | null = null;
  private defaultBucketPath: string | null = null;

  constructor() {
    this.uploadEndpoint = process.env.IMAGE_UPLOAD_ENDPOINT || null;
    this.defaultBucketPath = process.env.DEFAULT_IMAGE_BUCKET_PATH || 'profile-photos';
  }

  async uploadProfilePhoto(data: ProfilePhotoUploadData): Promise<ImageUploadResponse> {
    if (!this.uploadEndpoint) {
      console.error('📸 No image upload endpoint configured');
      return {
        success: false,
        error: 'Image upload service not configured'
      };
    }

    try {
      console.log('📸 Uploading profile photo:', {
        userId: data.userId,
        fileName: data.imageFile.name,
        fileSize: data.imageFile.size,
        bucketPath: data.bucketPath || this.defaultBucketPath,
      });

      // Create form data
      const formData = new FormData();
      formData.append('image', data.imageFile);
      formData.append('userId', data.userId);
      formData.append('bucketPath', data.bucketPath || this.defaultBucketPath || '');
      formData.append('type', 'profile-photo');

      const response = await fetch(this.uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📸 Image upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`
        };
      }

      const result = await response.json();
      
      console.log('📸 Profile photo uploaded successfully:', {
        userId: data.userId,
        imageUrl: result.imageUrl,
        bucketPath: result.bucketPath,
      });

      return {
        success: true,
        imageUrl: result.imageUrl,
        bucketPath: result.bucketPath,
      };
    } catch (error) {
      console.error('📸 Error uploading profile photo:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async deleteProfilePhoto(userId: string, imageUrl?: string, bucketPath?: string): Promise<boolean> {
    if (!this.uploadEndpoint || !imageUrl) {
      console.log('📸 No image upload endpoint or image URL provided for deletion');
      return false;
    }

    try {
      console.log('📸 Deleting profile photo:', {
        userId,
        imageUrl,
        bucketPath: bucketPath || this.defaultBucketPath,
      });

      const response = await fetch(`${this.uploadEndpoint}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          imageUrl,
          bucketPath: bucketPath || this.defaultBucketPath,
          type: 'profile-photo',
        }),
      });

      if (!response.ok) {
        console.error('📸 Profile photo deletion failed:', {
          status: response.status,
          statusText: response.statusText,
        });
        return false;
      }

      console.log('📸 Profile photo deleted successfully:', { userId });
      return true;
    } catch (error) {
      console.error('📸 Error deleting profile photo:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return false;
    }
  }

  isConfigured(): boolean {
    return !!this.uploadEndpoint;
  }

  getUploadEndpoint(): string | null {
    return this.uploadEndpoint;
  }

  getDefaultBucketPath(): string | null {
    return this.defaultBucketPath;
  }

  // Helper method to generate bucket path for profile photos
  generateProfilePhotoPath(userId: string, fileName: string): string {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop();
    return `${this.defaultBucketPath}/${userId}/${timestamp}.${extension}`;
  }
}

// Export singleton instance
export const imageUploadService = new ImageUploadService();
