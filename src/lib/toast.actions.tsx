"use client";

import { toast } from "sonner";

export interface ConfirmToastOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export const showConfirmToast = ({
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
}: ConfirmToastOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const baseClass =
      "border rounded-[var(--radius-sm)] p-4 text-[rgb(243_244_246)] shadow-[var(--shadow-lg)]";

    const toastOptions = {
      class: baseClass,
      duration: Infinity,
    };

    toast(
      <div
        className={`flex items-start gap-4 ${baseClass} ${destructive
          ? "border-[rgb(255_77_77)] bg-[rgb(255_77_77)/10]"
          : "border-[rgb(55_60_78)] bg-[rgb(24_31_49)]"
          }`}
      >
        <div className="flex-shrink-0">
          {destructive ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(255_77_77)]/20">
              <AlertTriangleIcon className="h-5 w-5 text-[rgb(255_77_77)]" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(13_18_107)]/20">
              <InfoIcon className="h-5 w-5 text-[rgb(13_18_107)]" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-[rgb(156_163_175)]">{description}</p>
          )}
        </div>
      </div>,
      {
        ...toastOptions,
        action: (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss();
                resolve(true);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all ${destructive
                ? "bg-[rgb(255_77_77)] text-white hover:bg-[rgb(240_70_70)]"
                : "bg-[rgb(13_18_107)] text-[rgb(17_24_40)] hover:bg-[rgb(13_18_107)]/80"
                }`}
            >
              {confirmLabel}
            </button>
            <button
              onClick={() => {
                toast.dismiss();
                resolve(false);
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] border border-[rgb(55_60_78)] text-[rgb(203_210_224)] hover:bg-[rgb(27_34_52/0.6)] transition-all"
            >
              {cancelLabel}
            </button>
          </div>
        ),
      },
    );
  });
};

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m2.667-7.333L19 12l-4.333 4.333M12 3a9 9 0 100 18 9 9 0 000-18z"
      />
    </svg>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1v4H8l4 4 4-4h-1V7l-1 1z"
      />
    </svg>
  );
}
