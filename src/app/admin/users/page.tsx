"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomTable } from "@/components/ui/custom-table";
import { SearchInput } from "@/components/ui/search-input";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import { showConfirmToast } from "@/lib/toast.actions";
import { getRoleColor } from "@/lib/badge-colors";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { AddButton } from "@/components/ui/add-button";
import { usePdfPreview } from "@/hooks/use-pdf-preview";
import { addSchoolPdfHeader, addSchoolPdfFooter } from "@/lib/pdf-document";
import { useAdminSession } from "@/contexts/session-context";

interface User {
  id: string;
  username: string;
  email: string;
  image: string | null;
  logged: boolean;
  roleId: string | null;
  role?: { id: string; label: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface EnseignantRef {
  id: string;
  nom: string;
  prenom: string;
  hasUser: boolean;
}

export default function AdminUsersPage() {
  const { adminSessionId } = useAdminSession();
  const [users, setUsers] = useState<User[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [enseignantId, setEnseignantId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    image: "",
  });
  const { modePdf, pdfUrl, openPdf, closePdf } = usePdfPreview();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        toast.error("Erreur lors du chargement des utilisateurs");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const loadEnseignants = async () => {
    try {
      const res = await fetch(`/api/admin/enseignants?t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setEnseignants(data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUsers();
    loadEnseignants();
  }, [adminSessionId, search]);

  useEffect(() => {
    if (modalOpen) {
      loadEnseignants();
    }
  }, [modalOpen]);

  const openCreateModal = () => {
    setEditingUser(null);
    setEnseignantId("");
    setImageFile(null);
    setImagePreview("");
    setForm({
      email: "",
      password: "",
      image: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEnseignantId("");
    setImageFile(null);
    setImagePreview(user.image ? `/uploads/users/${user.image}` : "");
    setForm({
      email: user.email,
      password: "",
      image: user.image || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setEnseignantId("");
    setImageFile(null);
    setImagePreview("");
    setForm({
      email: "",
      password: "",
      image: "",
    });
  };

  const closeResetPasswordModal = () => {
    setResetPasswordOpen(false);
    setResetPasswordUser(null);
    setNewPassword("");
  };

  const handleSave = async () => {
    if (!editingUser && !enseignantId) {
      toast.error("Veuillez sélectionner un enseignant");
      return;
    }

    if (!form.email) {
      toast.error("Email requis");
      return;
    }

    if (!editingUser && !form.password) {
      toast.error("Mot de passe requis pour un nouvel utilisateur");
      return;
    }

    setSaving(true);
    try {
      const url = editingUser
        ? `/api/admin/users?id=${editingUser.id}`
        : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(editingUser ? {} : { enseignantId }),
        }),
      });

      if (res.ok) {
        const savedUser = editingUser ? editingUser : await res.json();
        const fd = new FormData();
        if (imageFile) {
          fd.append("image", imageFile);
        } else {
          fd.append(
            "image",
            new File([""], "default.png", { type: "image/png" }),
          );
        }
        await fetch(`/api/admin/users/upload?id=${savedUser.id}`, {
          method: "POST",
          body: fd,
        });
        toast.success(editingUser ? "Utilisateur modifié" : "Utilisateur créé");
        closeModal();
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = await showConfirmToast({
      title: `Supprimer "${user.username}" ?`,
      description: "Cette action est irréversible.",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Utilisateur supprimé");
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleResetPasswordClick = (user: User) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setResetPasswordOpen(true);
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordUser || !newPassword) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetPasswordUser.id, newPassword }),
      });

      if (res.ok) {
        toast.success("Mot de passe réinitialisé");
        closeResetPasswordModal();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("l", "mm", "a4");

      await addSchoolPdfHeader(doc, {
        title: "LISTE DES UTILISATEURS",
        countLabel: `${users.length} UTILISATEURS`,
      });

      const tableColumn = ["#", "Photo", "Username", "Email", "Rôle"];
      const tableRows: string[][] = [];

      users.forEach((user, idx) => {
        const photoSrc = user.image
          ? `/uploads/users/${user.image}`
          : "/uploads/users/default.png";
        tableRows.push([
          String(idx + 1),
          photoSrc,
          user.username,
          user.email,
          user.role?.label || "-",
        ]);
      });

      autoTable(doc, {
        startY: 30,
        head: [tableColumn],
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [130, 130, 130],
          textColor: [255, 255, 255],
          halign: "center",
          cellPadding: { top: 2, bottom: 2, left: 6, right: 6 },
        },
        styles: {
          fontSize: 10,
          cellPadding: { top: 4.5, bottom: 4.5, left: 2, right: 2 },
        },
        showHead: "firstPage",
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: {
            cellWidth: 30,
            halign: "center",
            cellPadding: { top: 4.5, bottom: 4.5, left: 2, right: 2 },
          },
          2: { cellWidth: 78 },
          3: { cellWidth: 100 },
          4: { cellWidth: 40, halign: "center" },
        },
        didParseCell: (data: any) => {
          if (
            data.column.index === 1 &&
            data.cell.raw &&
            typeof data.cell.raw === "string"
          ) {
            data.cell.text = "";
          }
        },
        didDrawCell: (data: any) => {
          if (
            data.column.index === 1 &&
            data.cell.raw &&
            typeof data.cell.raw === "string"
          ) {
            try {
              const imgSize = 10;
              const x = data.cell.x + (data.cell.width - imgSize) / 2;
              const y = data.cell.y + (data.cell.height - imgSize) / 2;
              doc.addImage(data.cell.raw, "JPEG", x, y, imgSize, imgSize);
            } catch {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(
                "Photo",
                data.cell.x + data.cell.width / 2,
                data.cell.y + data.cell.height / 2,
                { align: "center" },
              );
            }
          }
        },
      });

      addSchoolPdfFooter(doc, "HMS-Users");

      openPdf(doc);
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchInput
          value={search}
          onValueChange={(v) => {
            setSearch(v);
          }}
          onClear={() => {
            setSearch("");
          }}
        />
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-50"></div>
          <ExportPdfButton
            onClick={handleExportPdf}
            disabled={users.length === 0}
          >
            <FileText className="h-4 w-4" />
            PDF
          </ExportPdfButton>
          <AddButton onClick={openCreateModal}>Ajouter</AddButton>
        </div>
      </div>

      <Card>
        <CardContent>
          <CustomTable
            columns={[
              {
                header: "#",
                accessor: (user, idx) => (
                  <span className="text-[rgb(243_244_246)] text-center">
                    {idx + 1}
                  </span>
                ),
                width: "40px",
                className: "text-center",
              },
              {
                header: "Photo",
                accessor: (user) => (
                  <img
                    src={
                      user.image
                        ? `/uploads/users/${user.image}`
                        : "/uploads/users/default.png"
                    }
                    alt={user.username}
                    className="h-8 w-8 rounded-full object-cover mx-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/uploads/users/default.png";
                    }}
                  />
                ),
                width: "50px",
                className: "text-center",
              },
              {
                header: "Username",
                accessor: (user) => (
                  <span className="text-[rgb(243_244_246)] truncate">
                    {user.username}
                  </span>
                ),
                width: "200px",
              },
              {
                header: "Email",
                accessor: (user) => (
                  <span className="text-[#94a3b8] truncate">{user.email}</span>
                ),
                width: "310px",
              },
              {
                header: "Rôle",
                accessor: (user) =>
                  user.role ? (
                    <Badge className={getRoleColor(user.role?.label || "")}>
                      {user.role.label}
                    </Badge>
                  ) : (
                    "-"
                  ),
                width: "100px",
              },
              {
                header: "Connecté",
                accessor: (user) => (
                  <span className="text-center text-[#94a3b8]">
                    {user.logged ? "✅" : "❌"}
                  </span>
                ),
                width: "50px",
                className: "text-center",
              },
              {
                header: "Actions",
                accessor: (user) =>
                  !user.logged ? (
                    <RowActions
                      actions={[
                        {
                          label: "Modifier",
                          onClick: () => openEditModal(user),
                        },
                        {
                          label: "Réinitialiser le mot de passe",
                          onClick: () => handleResetPasswordClick(user),
                        },
                        {
                          label: "Supprimer",
                          onClick: () => handleDelete(user),
                          destructive: true,
                        },
                      ]}
                    />
                  ) : null,
                width: "80px",
                className: "text-right",
              },
            ]}
            data={users}
          />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[rgb(243_244_246)]">
              {editingUser
                ? "Modifier l'utilisateur"
                : "Ajouter un utilisateur"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-xs text-[#94a3b8]">Enseignant</Label>
                <Select
                  value={enseignantId}
                  onValueChange={(v) => setEnseignantId(v)}
                >
                  <SelectTrigger className="bg-[#1e1e21] border-[#1e293b] text-[rgb(203_210_224)]">
                    <SelectValue placeholder="Sélectionner un enseignant" />
                  </SelectTrigger>
                  <SelectContent>
                    {enseignants
                      .filter((e) => !e.hasUser)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.prenom} {e.nom}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#94a3b8]">
                  Seuls les enseignants non encore inscrits sont disponibles
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-[#94a3b8]">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemple.com"
                className="bg-[#1e1e21] border-[#1e293b] text-[rgb(203_210_224)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#94a3b8]">
                {editingUser
                  ? "Nouveau mot de passe (laisser vide pour ne pas changer)"
                  : "Mot de passe"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="bg-[#1e1e21] border-[#1e293b] text-[rgb(203_210_224)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#94a3b8]">Photo</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImageFile(f);
                  setImagePreview(f ? URL.createObjectURL(f) : "");
                }}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[rgb(45_54_78)] file:text-[rgb(203_210_224)] file:cursor-pointer file:hover:bg-[rgb(55_65_95)] text-sm text-[#94a3b8]"
              />
              {(imagePreview || (editingUser && form.image)) && (
                <img
                  src={imagePreview || `/uploads/users/${form.image}`}
                  alt="Preview"
                  className="mt-2 h-20 w-20 rounded-full object-cover"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeModal}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetPasswordOpen}
        onOpenChange={(open) => !open && closeResetPasswordModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[rgb(243_244_246)]">
              Réinitialiser le mot de passe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#94a3b8]">
                Nouveau mot de passe pour {resetPasswordUser?.username}
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[#1e1e21] border-[#1e293b] text-[rgb(203_210_224)]"
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={closeResetPasswordModal}>
                Annuler
              </Button>
              <Button
                onClick={handleResetPasswordSubmit}
                disabled={saving || !newPassword}
              >
                {saving ? "Enregistrement..." : "Réinitialiser"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {modePdf && pdfUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="relative flex-1 overflow-hidden bg-white">
            <button
              onClick={closePdf}
              className="absolute top-1 right-1 z-10 rounded bg-black/60 text-red-500 hover:bg-black/80 w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              X
            </button>
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Prévisualisation PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
}
