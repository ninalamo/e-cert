"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpdateEmailForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand-700">Update Email</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
          Email updates are managed through the Auth Platform. Please contact your administrator to change your email address.
        </div>
      </CardContent>
    </Card>
  );
}
