"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LoginVisual } from "@/components/auth/LoginVisual";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginFormFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label="Loading" />
    </div>
  );
}

export function LoginPageContent() {
  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="relative grid min-h-screen w-full lg:grid-cols-2">
        <LoginVisual />
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
