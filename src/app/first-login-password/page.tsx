"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FirstLoginPasswordForm } from "@/components/auth/FirstLoginPasswordForm";

export default function FirstLoginPasswordPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]} requirePasswordChange>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <FirstLoginPasswordForm />
      </div>
    </ProtectedRoute>
  );
}
