import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUpdateSellerDynamicPricing } from '@/hooks/useSellerData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, CheckCircle, Shield, Bell, Globe } from 'lucide-react';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

export default function SellerSettings() {
  const { profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const updateDynamicPricing = useUpdateSellerDynamicPricing();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    website: profile?.website || '',
  });

  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(true);

  const [notifications, setNotifications] = useState({
    email_sales: true,
    email_approvals: true,
    email_withdrawals: true,
  });

  // Initialize dynamic pricing state from profile
  useEffect(() => {
    if (profile?.dynamic_pricing_enabled !== undefined) {
      setDynamicPricingEnabled(profile.dynamic_pricing_enabled);
    }
  }, [profile?.dynamic_pricing_enabled]);

  const handleDynamicPricingToggle = async (checked: boolean) => {
    setDynamicPricingEnabled(checked);
    try {
      await updateDynamicPricing.mutateAsync(checked);
      await refreshProfile();
      toast({ 
        title: checked ? 'Dynamic pricing enabled' : 'Dynamic pricing disabled',
        description: checked 
          ? 'Your songs may be priced higher for buyers in premium markets.' 
          : 'All buyers will see your base price converted to their local currency.'
      });
    } catch (error: any) {
      setDynamicPricingEnabled(!checked); // Revert on error
      toast({ 
        title: 'Error updating pricing preference', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          website: formData.website,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: 'Profile updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
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

      const { error: uploadError } = await supabase.storage
        .from('song-covers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('song-covers')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: 'Avatar updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error uploading avatar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      {/* Profile Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your public profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-lg">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Change Avatar
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 5MB.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Display Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell buyers about yourself..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Verification</p>
              <p className="text-sm text-muted-foreground">
                Verified sellers get a badge and increased trust with buyers.
              </p>
            </div>
            {profile?.is_verified ? (
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                <CheckCircle className="mr-1 h-3 w-3 animate-pulse" /> Verified
              </Badge>
            ) : (
              <Badge variant="outline">Not Verified</Badge>
            )}
          </div>
          {!profile?.is_verified && (
            <Button variant="outline" className="mt-4" disabled>
              Request Verification (Coming Soon)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pricing Preferences */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Pricing Preferences
          </CardTitle>
          <CardDescription>Control how your songs are priced for international buyers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2">
                <p className="font-medium">Country-wise Dynamic Pricing</p>
                <HelpTooltip content="When enabled, your song prices may be adjusted based on the buyer's country (e.g., higher in premium markets like US/EU). Your earnings are calculated from your base INR price, so this can only increase what buyers pay, never decrease it." />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {dynamicPricingEnabled 
                  ? 'Prices may be adjusted higher for buyers in premium markets. Your base earnings are unaffected.'
                  : 'All buyers see your base price converted to their local currency at current exchange rates.'}
              </p>
            </div>
            <Switch
              checked={dynamicPricingEnabled}
              onCheckedChange={handleDynamicPricingToggle}
              disabled={updateDynamicPricing.isPending}
            />
          </div>
          {dynamicPricingEnabled && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>How it works:</strong> Buyers in markets like the US, UK, or EU may see slightly higher prices based on regional pricing zones. Your base price in INR remains the same, and your earnings are calculated from that base price.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose what notifications you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sales Notifications</p>
              <p className="text-sm text-muted-foreground">Get notified when you make a sale.</p>
            </div>
            <Switch
              checked={notifications.email_sales}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_sales: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Approval Updates</p>
              <p className="text-sm text-muted-foreground">Get notified about song approvals.</p>
            </div>
            <Switch
              checked={notifications.email_approvals}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_approvals: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Withdrawal Updates</p>
              <p className="text-sm text-muted-foreground">Get notified about withdrawal status.</p>
            </div>
            <Switch
              checked={notifications.email_withdrawals}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_withdrawals: checked }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
