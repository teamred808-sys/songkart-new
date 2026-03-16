import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch, API_BASE } from '@/lib/api';
import { useDisplayNameAvailability, checkDisplayNameAvailable } from '@/hooks/useDisplayNameCheck';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Camera, User, Bell, Shield, Check, X } from 'lucide-react';

export default function BuyerSettings() {
  const { profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    website: profile?.website || '',
  });
  const [notifications, setNotifications] = useState({
    purchaseConfirmation: true,
    newReleases: true,
    promotions: false,
  });

  // Check if display name is different from original and available
  const nameChanged = formData.full_name !== (profile?.full_name || '');
  const { isAvailable: isNameAvailable, isChecking: isCheckingName } = useDisplayNameAvailability(
    nameChanged ? formData.full_name : '',
    profile?.id
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // Check name availability if changed
      if (formData.full_name !== profile.full_name && formData.full_name.trim()) {
        const available = await checkDisplayNameAvailable(formData.full_name.trim(), profile.id);
        if (!available) {
          toast.error('This display name is already taken by another user.');
          setIsLoading(false);
          return;
        }
      }

      await apiFetch(`/profiles/${profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: formData.full_name,
          bio: formData.bio,
          website: formData.website,
        }),
      });

      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const formData2 = new FormData();
      formData2.append('file', file);
      formData2.append('path', filePath);

      const token = localStorage.getItem('auth_token');
      const uploadRes = await fetch(`${API_BASE}/storage/song-covers/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData2,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const publicUrl = uploadData.public_url;

      await apiFetch(`/profiles/${profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      await refreshProfile();
      toast.success('Avatar updated successfully');
    } catch (error: any) {
      toast.error('Failed to upload avatar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-2xl">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isLoading}
              />
            </div>
            <div>
              <p className="font-medium">{profile?.full_name || 'Your Name'}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={`pr-10 ${
                    nameChanged && formData.full_name.trim().length >= 2
                      ? isNameAvailable === true 
                        ? 'border-green-500 focus-visible:ring-green-500' 
                        : isNameAvailable === false 
                          ? 'border-destructive focus-visible:ring-destructive' 
                          : ''
                      : ''
                  }`}
                />
                {nameChanged && formData.full_name.trim().length >= 2 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingName ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isNameAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : isNameAvailable === false ? (
                      <X className="h-4 w-4 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>
              {nameChanged && formData.full_name.trim().length >= 2 && isNameAvailable === false && (
                <p className="text-xs text-destructive">This name is already taken</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Purchase Confirmations</p>
              <p className="text-sm text-muted-foreground">
                Receive emails when you make a purchase
              </p>
            </div>
            <Switch
              checked={notifications.purchaseConfirmation}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, purchaseConfirmation: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Releases</p>
              <p className="text-sm text-muted-foreground">
                Get notified about new songs from artists you follow
              </p>
            </div>
            <Switch
              checked={notifications.newReleases}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, newReleases: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Promotional Emails</p>
              <p className="text-sm text-muted-foreground">
                Receive special offers and promotions
              </p>
            </div>
            <Switch
              checked={notifications.promotions}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, promotions: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Change
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">Last changed: Never</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
