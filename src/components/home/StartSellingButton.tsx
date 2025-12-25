import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface StartSellingButtonProps {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children: React.ReactNode;
}

const StartSellingButton = ({ 
  variant = "default", 
  size = "default", 
  className, 
  children 
}: StartSellingButtonProps) => {
  const { user, isSeller, isLoading: authLoading, becomeSeller } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    // If auth is still loading, wait
    if (authLoading) return;

    // Not logged in → go to signup with seller role pre-selected
    if (!user) {
      navigate('/auth?mode=signup&role=seller');
      return;
    }

    // Already a seller → go to seller dashboard
    if (isSeller) {
      navigate('/seller');
      return;
    }

    // Logged in as buyer only → become a seller
    setIsProcessing(true);
    try {
      const { error } = await becomeSeller();
      if (error) {
        toast.error("Failed to become a seller. Please try again.");
        console.error("Error becoming seller:", error);
      } else {
        toast.success("Welcome! You're now a seller.");
        navigate('/seller');
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error("Error becoming seller:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = authLoading || isProcessing;

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default StartSellingButton;
