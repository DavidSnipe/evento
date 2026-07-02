import { Heart, Loader2 } from "lucide-react";

import { ro } from "@/lib/i18n/ro";

type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = ro.common.loading }: PageLoadingProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-16">
      <div className="flex items-center gap-2 text-[#B8516B]">
        <Heart className="h-5 w-5 fill-[#FCEAEF] animate-pulse" strokeWidth={2} />
        <span className="font-serif text-lg font-semibold tracking-tight text-[#1A0E14]">
          Evento
        </span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-[#B8516B]" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default PageLoading;
