import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Zap } from "lucide-react";

const OUT_OF_CREDITS_EVENT = "dla:out-of-credits";

export function showOutOfCreditsModal() {
  window.dispatchEvent(new CustomEvent(OUT_OF_CREDITS_EVENT));
}

export function OutOfCreditsModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OUT_OF_CREDITS_EVENT, handler);
    return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, handler);
  }, []);

  // Auto-show when credits hit zero (only if user is loaded)
  useEffect(() => {
    if (user && user.credits === 0) {
      // do nothing; we only show on action attempt
    }
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle>You've used all your credits</DialogTitle>
          <DialogDescription>
            Upgrade to continue using AI-powered features. (Upgrade flow coming soon.)
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} data-testid="button-close-credits-modal">Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
