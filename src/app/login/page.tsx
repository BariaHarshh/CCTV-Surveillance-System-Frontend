import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Access Platform | AI Campus Guardian",
  description: "Secure access to the AI Campus Guardian platform.",
};

export default function LoginPlaceholderPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(56,189,248,0.1),transparent)]" />
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="gradient-border relative max-w-md rounded-3xl bg-surface/80 p-10 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <Shield className="h-8 w-8 text-accent" strokeWidth={1.5} />
        </div>

        <h1 className="mt-8 text-2xl font-bold tracking-tight">Access Platform</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Secure login and authentication will be available in Step 2. The platform access
          system is being prepared for Super Admin, Admin, and Staff roles.
        </p>

        <span className="mt-6 inline-flex rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold tracking-wider text-accent uppercase">
          Coming in Step 2
        </span>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
