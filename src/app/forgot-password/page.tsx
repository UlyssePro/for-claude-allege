"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }

      setSent(true);
      toast.success("Token généré. Vérifiez la console ou utilisez-le pour réinitialiser votre mot de passe.");
      console.log("Reset token:", data.resetToken);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[rgb(27_34_52)] via-[rgb(17_24_40)] to-[rgb(17_24_40)] -z-10" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Vérifiez votre email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[rgb(156_163_175)]">
              Si un compte existe avec cet email, un token de réinitialisation a été généré.
            </p>
            <p className="text-xs text-[rgb(156_163_175)]">
              En mode développement, consultez la console du serveur pour récupérer le token.
            </p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[rgb(27_34_52)] via-[rgb(17_24_40)] to-[rgb(17_24_40)] -z-10" />

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Mot de passe oublié</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi..." : "Réinitialiser le mot de passe"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/login")}
              className="w-full"
            >
              Annuler
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
