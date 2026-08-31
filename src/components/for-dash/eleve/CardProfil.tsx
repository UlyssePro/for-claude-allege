"use client";



interface CardProfilProps {
  firstname: string;
  lastname: string;
  photo: string | null;
  classe?: { label?: string } | null;
  contact?: string | null;
  numero?: string | null;
  genre?: { label?: string } | null;
}

export function CardProfil({
  firstname,
  lastname,
  photo,
  classe,
  contact,
  numero,
  genre,
}: CardProfilProps) {
  const fullName = `${firstname ?? ""} ${lastname ?? ""}`.trim();

  return (
    <div className="w-full max-w-[540px] bg-[#111827] rounded-2xl overflow-hidden shadow-lg">
      <div className="relative bg-[#1e3a8a] px-6 pt-6 pb-16"></div>

      <div className="flex justify-center -mt-16 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden">
          <img
            src={
              photo
                ? `/uploads/eleves/${photo}`
                : "/uploads/eleves/default-badge-g.png"
            }
            alt={fullName}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/uploads/eleves/default-badge-g.png";
            }}
          />
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 text-center">
        <h2 className="text-white text-[13px] font-bold uppercase tracking-wide">
          {fullName || "Élève"}
        </h2>
        <p className="text-gray-400 text-sm mt-1">Élève</p>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Classe</span>
          <span className="text-white font-medium">{classe?.label || "-"}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Genre</span>
          <span className="text-white font-medium">{genre?.label || "-"}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">N°</span>
          <span className="text-white font-medium">{numero || "-"}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Contact</span>
          <span className="text-white font-medium">{contact || "-"}</span>
        </div>
      </div>
    </div>
  );
}
