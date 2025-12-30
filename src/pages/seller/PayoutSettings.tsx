import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { usePayoutProfile, useSavePayoutProfile, payoutValidation } from '@/hooks/usePayoutProfile';
import { 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  Shield,
  Lock,
  Info
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const payoutSchema = z.object({
  account_holder_name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  bank_name: z.string().min(2, 'Bank name is required').max(100),
  account_number: z.string().refine(payoutValidation.accountNumber, {
    message: 'Account number must be 9-18 digits',
  }),
  confirm_account_number: z.string(),
  ifsc_code: z.string().refine(payoutValidation.ifscCode, {
    message: 'Invalid IFSC code format (e.g., SBIN0001234)',
  }),
  account_type: z.enum(['savings', 'current']),
  upi_id: z.string().optional().refine((val) => !val || payoutValidation.upiId(val), {
    message: 'Invalid UPI ID format (e.g., name@upi)',
  }),
}).refine((data) => data.account_number === data.confirm_account_number, {
  message: 'Account numbers do not match',
  path: ['confirm_account_number'],
});

type PayoutFormData = z.infer<typeof payoutSchema>;

function VerificationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Pending Verification
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          Not Added
        </Badge>
      );
  }
}

export default function PayoutSettings() {
  const { data: profile, isLoading } = usePayoutProfile();
  const saveProfile = useSavePayoutProfile();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      confirm_account_number: '',
      ifsc_code: '',
      account_type: 'savings',
      upi_id: '',
    },
  });

  // Reset form when profile loads
  useEffect(() => {
    if (profile && !isEditing) {
      form.reset({
        account_holder_name: profile.account_holder_name,
        bank_name: profile.bank_name,
        account_number: '',
        confirm_account_number: '',
        ifsc_code: profile.ifsc_code,
        account_type: profile.account_type as 'savings' | 'current',
        upi_id: profile.upi_id || '',
      });
    }
  }, [profile, isEditing, form]);

  const onSubmit = async (data: PayoutFormData) => {
    await saveProfile.mutateAsync({
      account_holder_name: data.account_holder_name,
      bank_name: data.bank_name,
      account_number: data.account_number,
      ifsc_code: data.ifsc_code,
      account_type: data.account_type,
      upi_id: data.upi_id,
    });
    setIsEditing(false);
  };

  const hasProfile = !!profile;
  const isLocked = profile?.is_locked;
  const showForm = !hasProfile || isEditing;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground">
          Add your bank details to receive earnings from license sales
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Account Status
            </CardTitle>
            <VerificationStatusBadge status={profile?.verification_status || 'not_added'} />
          </div>
        </CardHeader>
        <CardContent>
          {!hasProfile ? (
            <p className="text-muted-foreground text-sm">
              You haven't added your bank details yet. Add them below to enable withdrawals.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bank:</span>{' '}
                  <span className="font-medium">{profile.bank_name}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div>
                  <span className="text-muted-foreground">Account:</span>{' '}
                  <span className="font-medium font-mono">****{profile.account_number_last4}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div>
                  <span className="text-muted-foreground">IFSC:</span>{' '}
                  <span className="font-medium font-mono">{profile.ifsc_code}</span>
                </div>
              </div>
              
              {profile.verification_status === 'rejected' && profile.rejection_reason && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Verification Rejected</AlertTitle>
                  <AlertDescription>{profile.rejection_reason}</AlertDescription>
                </Alert>
              )}

              {isLocked && (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Profile Locked</AlertTitle>
                  <AlertDescription>
                    {profile.locked_reason || 'Your payout profile is currently locked. Please contact support.'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert className="bg-primary/5 border-primary/20">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Your data is secure</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Your bank details are encrypted and stored securely. Only the last 4 digits of your account number are visible after saving.
        </AlertDescription>
      </Alert>

      {/* Form Card */}
      {showForm && !isLocked ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {hasProfile ? 'Update Bank Details' : 'Add Bank Details'}
            </CardTitle>
            <CardDescription>
              {hasProfile 
                ? 'Updating your bank details will require re-verification before you can withdraw.'
                : 'Enter your bank account information to receive payouts.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="account_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="As per bank records" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the name exactly as it appears on your bank account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., State Bank of India" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="account_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number *</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter account number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirm_account_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Account Number *</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Re-enter account number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ifsc_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., SBIN0001234" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          11-character bank branch code
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="account_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="savings">Savings Account</SelectItem>
                            <SelectItem value="current">Current Account</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="upi_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., yourname@upi" {...field} />
                      </FormControl>
                      <FormDescription>
                        For faster payouts in India
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? 'Saving...' : 'Save Bank Details'}
                  </Button>
                  {hasProfile && (
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : hasProfile && !isLocked ? (
        <Button 
          variant="outline" 
          onClick={() => setIsEditing(true)}
          className="mt-4"
        >
          Update Bank Details
        </Button>
      ) : null}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>How payouts work:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Earnings accumulate in your wallet as sales are made</li>
                <li>Funds are held for 7 days before becoming available for withdrawal</li>
                <li>Withdrawals are processed within 2-5 business days</li>
                <li>You can request a withdrawal once you meet the minimum threshold</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
