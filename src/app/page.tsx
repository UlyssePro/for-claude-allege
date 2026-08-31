"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full" hover>
        <CardHeader>
          <CardTitle>HMS-GS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[rgb(156_163_175)]">
            Redirection vers la page de connexion...
          </p>
          <Button className="w-full" variant="outline" disabled>
            Veuillez patienter
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
