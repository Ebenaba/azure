"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Shield, Info } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Account Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2E7D32] flex items-center justify-center text-white text-2xl font-bold">
              {user?.displayName?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {user?.displayName ?? "Admin User"}
              </p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-1">
                <Badge variant="default" className="text-xs capitalize">
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.role ?? "admin"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium mb-1">UID</p>
            <p className="font-mono text-xs break-all text-gray-500">{user?.uid}</p>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Application</span>
            <span className="font-medium">CleanGo Admin Dashboard</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Region</span>
            <span className="font-medium">Kaduna State, Northern Nigeria</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">API Endpoint</span>
            <span className="font-mono text-xs text-gray-500">
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Currency</span>
            <span className="font-medium">Nigerian Naira (₦ NGN)</span>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <Shield className="w-4 h-4" />
            Security Note
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700">
          <p>
            This is an internal admin-only tool. Admin accounts are managed directly in Firebase
            Authentication. To add or remove admin access, update the user&apos;s custom claims
            via the Firebase Admin SDK or the backend&apos;s admin management endpoint.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
