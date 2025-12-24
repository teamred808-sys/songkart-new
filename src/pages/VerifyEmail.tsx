import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided. Please check your email link.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-seller-email", {
          body: { token },
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus("error");
          setMessage(error.message || "Failed to verify email. Please try again.");
          return;
        }

        if (data?.error) {
          setStatus("error");
          setMessage(data.error);
          return;
        }

        if (data?.success) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified successfully!");
          // Refresh the profile to update is_verified status
          await refreshProfile();
        }
      } catch (err) {
        console.error("Verification exception:", err);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    verifyToken();
  }, [searchParams, refreshProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying your email...</CardTitle>
              <CardDescription>Please wait while we verify your email address.</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-green-600">Email Verified!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Verification Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {status === "success" && (
            <Button onClick={() => navigate("/seller")} className="w-full">
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {status === "error" && (
            <>
              <Button onClick={() => navigate("/seller")} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                You can request a new verification email from your dashboard.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
