import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

const MAX_CREDITS = 100;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

function getCreditColor(pct: number): string {
  if (pct > 50) return "bg-green-500";
  if (pct > 20) return "bg-yellow-500";
  return "bg-red-500";
}

function getCreditDotColor(pct: number): string {
  if (pct > 50) return "bg-green-500";
  if (pct > 20) return "bg-yellow-500";
  return "bg-red-500";
}

export function UserPanel() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!user) return null;

  const creditPct = Math.max(0, Math.min(100, (user.credits / MAX_CREDITS) * 100));

  const handleLogout = async () => {
    setConfirmOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40">
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="relative w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shadow-lg hover:scale-105 transition-transform overflow-hidden"
            data-testid="button-expand-user-panel"
            aria-label="Open user panel"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              getInitials(user.fullName)
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${getCreditDotColor(creditPct)}`}
              aria-label={`${user.credits} credits remaining`}
            />
          </button>
        ) : (
          <div
            className="w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            data-testid="user-panel-expanded"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user.fullName)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" data-testid="text-user-name">{user.fullName}</div>
                  <div className="text-sm text-muted-foreground truncate" data-testid="text-user-email">{user.email}</div>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
                  aria-label="Collapse"
                  data-testid="button-collapse-user-panel"
                >
                  <ChevronUp className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">🔋 {user.credits} / {MAX_CREDITS} credits</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${getCreditColor(creditPct)} transition-all`}
                  style={{ width: `${creditPct}%` }}
                  data-testid="bar-credits"
                />
              </div>
              {user.credits === 0 && (
                <p className="text-xs text-destructive mt-2">Out of credits. Upgrade to continue.</p>
              )}
            </div>

            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>You'll need to login again to continue.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-logout">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} data-testid="button-confirm-logout">Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
