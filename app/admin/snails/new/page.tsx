"use client";

import { useSession } from "next-auth/react";
import SnailForm from "@/components/SnailForm";

export default function NewSnailPage() {
  const { data: session } = useSession();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Snail</h1>
      <SnailForm
        userRole={session?.user?.role}
        userId={session?.user?.id}
      />
    </div>
  );
}
