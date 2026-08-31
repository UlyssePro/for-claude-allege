"use client";



interface CardProfilProps {
  nom: string;
  prenom: string;
  photo: string | null;
  contact: string | null;
  adresse: string | null;
  dpservice: string | null;
  profSess: string | null;
  matiere?: string | undefined;
  id: string;
}

export function CardProfil({
  nom,
  prenom,
  photo,
  contact,
  adresse,
  dpservice,
  profSess,
  matiere,
  id,
}: CardProfilProps) {
  return (
    <div className="w-full max-w-[270px] bg-[#111827] rounded-2xl overflow-hidden shadow-lg">
      <div className="relative bg-[#1e3a8a] px-6 pt-6 pb-16"></div>

      <div className="flex justify-center -mt-16 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden">
          <img
            src={
              photo
                ? `/uploads/enseignants/${photo}`
                : "/uploads/enseignants/default.png"
            }
            alt={`${nom} ${prenom}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/uploads/enseignants/default.png";
            }}
          />
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 text-center">
        <h2 className="text-white text-[13px] font-bold uppercase tracking-wide">
          {nom} {prenom}
        </h2>
        <p className="text-gray-400 text-sm mt-1">Enseignant</p>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Matière</span>
          <span className="text-white font-medium">{matiere || "-"}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Phone</span>
          <span className="text-white font-medium">{contact || "-"}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Adresse</span>
          <span className="text-white font-medium">{adresse}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Session</span>
          <span className="text-white font-medium">{profSess || "-"}</span>
        </div>
      </div>
    </div>
  );
}
