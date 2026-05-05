import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Calendar, RotateCcw, Sparkles, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-primary" />
            <span className="font-bold text-xl tracking-tight">Digital Life Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" data-testid="link-login">Login</Button>
            </Link>
            <Link href="/register">
              <Button data-testid="link-register-header">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI-powered productivity
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
            Dump your chaos.<br />
            <span className="text-primary">Get your life organized. Instantly.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Digital Life Admin is an AI-powered personal assistant that turns your scattered thoughts,
            tasks, and deadlines into a clean, prioritized daily plan. Built for people who are tired
            of juggling 10 apps just to remember what to do next.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base px-8" data-testid="button-cta-register">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-cta-login">
                Login
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">100 free credits to start. No credit card required.</p>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                <BrainCircuit className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Task Extraction</h3>
              <p className="text-muted-foreground">
                Paste meeting notes, emails, or random thoughts — AI pulls out every action item with a deadline.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Daily Planner</h3>
              <p className="text-muted-foreground">
                Get a focused, time-blocked schedule generated just for you, every single day.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                <RotateCcw className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto Missed Task Recovery</h3>
              <p className="text-muted-foreground">
                Missed something? AI reschedules overdue tasks intelligently so nothing falls through the cracks.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop juggling 10 apps.</h2>
          <p className="text-lg text-muted-foreground mb-8">
            One brain dump. One AI. One clear plan for today.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-base px-8" data-testid="button-cta-register-bottom">
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Digital Life Admin
        </div>
      </footer>
    </div>
  );
}
