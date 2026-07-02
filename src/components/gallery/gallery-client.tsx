"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  QrCode,
  Download,
  Link as LinkIcon,
  Trash2,
  Camera,
  Loader2,
  Heart,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import {
  approveAllPhotos,
  approvePhoto,
  rejectAllPendingPhotos,
  rejectPhoto,
} from "@/app/(dashboard)/dashboard/events/[id]/gallery/actions";
import { Button } from "@/components/ui/button";
import { generateQrSlug, deleteMedia } from "@/lib/gallery/actions";
import { ro } from "@/lib/i18n/ro";
import type { MediaUpload } from "@/types/gallery";
import { cn } from "@/lib/utils";
import { MediaCarousel } from "./media-carousel";
import {
  downloadGalleryQrPrintable,
  galleryQrPrintableFilename,
} from "./download-qr-printable";
import Image from "next/image";

type GalleryClientProps = {
  eventId: string;
  eventTitle: string;
  initialQrSlug: string | null;
  initialMedia: MediaUpload[];
};

export function GalleryClient({
  eventId,
  eventTitle,
  initialQrSlug,
  initialMedia,
}: GalleryClientProps) {
  const [qrSlug, setQrSlug] = useState(initialQrSlug);
  const [media, setMedia] = useState(initialMedia);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [deleteToast, setDeleteToast] = useState(false);
  const [moderationToast, setModerationToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [bulkPending, setBulkPending] = useState(false);
  const [actionMediaId, setActionMediaId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const approvedMedia = useMemo(() => media.filter((item) => item.approved), [media]);
  const pendingMedia = useMemo(() => media.filter((item) => !item.approved), [media]);
  const pendingCount = pendingMedia.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

  const publicUrl =
    qrSlug && typeof window !== "undefined" ? `${window.location.origin}/gallery/${qrSlug}` : "";

  const handleGenerate = async () => {
    setIsGenerating(true);
    const res = await generateQrSlug(eventId);
    if (res.success && res.slug) {
      setQrSlug(res.slug);
    }
    setIsGenerating(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPrintable = async () => {
    if (!printableRef.current || !qrSlug) return;
    setIsPrinting(true);
    try {
      await downloadGalleryQrPrintable(
        printableRef.current,
        galleryQrPrintableFilename(eventTitle)
      );
    } catch (err) {
      console.error("downloadGalleryQrPrintable:", err);
      alert("Nu am putut genera PDF-ul. Încearcă din nou.");
    } finally {
      setIsPrinting(false);
    }
  };

  const showToast = (message: string) => {
    setModerationToast(message);
    setTimeout(() => setModerationToast(null), 2500);
  };

  const handleApprove = async (mediaId: string) => {
    setActionMediaId(mediaId);
    const res = await approvePhoto(eventId, mediaId);
    setActionMediaId(null);
    if (res.error) {
      alert(res.error);
      return;
    }
    setMedia((prev) =>
      prev.map((item) => (item.id === mediaId ? { ...item, approved: true } : item))
    );
    showToast(ro.gallery.moderation.approvedToast);
  };

  const handleReject = async (mediaId: string) => {
    if (!confirm(ro.gallery.moderation.rejectConfirm)) return;
    setActionMediaId(mediaId);
    const res = await rejectPhoto(eventId, mediaId);
    setActionMediaId(null);
    if (res.error) {
      alert(res.error);
      return;
    }
    setMedia((prev) => prev.filter((item) => item.id !== mediaId));
    showToast(ro.gallery.moderation.rejectedToast);
  };

  const handleApproveAll = async () => {
    setBulkPending(true);
    const res = await approveAllPhotos(eventId);
    setBulkPending(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setMedia((prev) => prev.map((item) => ({ ...item, approved: true })));
    setActiveTab("approved");
    showToast(ro.gallery.moderation.approvedAllToast);
  };

  const handleRejectAllPending = async () => {
    if (!confirm(ro.gallery.moderation.rejectAllConfirm)) return;
    setBulkPending(true);
    const res = await rejectAllPendingPhotos(eventId);
    setBulkPending(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setMedia((prev) => prev.filter((item) => item.approved));
    showToast(ro.gallery.moderation.rejectedAllToast);
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm("Sigur vrei să ștergi acest fișier?")) return;

    const res = await deleteMedia(eventId, mediaId);
    if (res.error) {
      alert(res.error);
      return;
    }

    setMedia((prev) => prev.filter((item) => item.id !== mediaId));
    setCarouselIndex(null);
    setDeleteToast(true);
    setTimeout(() => setDeleteToast(false), 2500);
  };

  const handleDownloadAll = async () => {
    if (approvedMedia.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ current: 0, total: approvedMedia.length });

    const canShareFiles =
      typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare;

    if (canShareFiles) {
      try {
        const files: File[] = [];
        for (let i = 0; i < approvedMedia.length; i++) {
          const item = approvedMedia[i];
          const resp = await fetch(item.file_url);
          const blob = await resp.blob();
          const ext =
            item.mime_type?.split("/")[1] || (item.file_type === "video" ? "mp4" : "jpg");
          files.push(new File([blob], `evento_${i + 1}.${ext}`, { type: blob.type }));
          setDownloadProgress({ current: i + 1, total: approvedMedia.length });
        }

        if (navigator.canShare({ files })) {
          await navigator.share({ files });
        } else {
          for (const file of files) {
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file] });
            }
          }
        }
      } catch {
        /* User cancelled share sheet */
      }
    } else {
      for (let i = 0; i < approvedMedia.length; i++) {
        const item = approvedMedia[i];
        try {
          const resp = await fetch(item.file_url);
          const blob = await resp.blob();
          const ext =
            item.mime_type?.split("/")[1] || (item.file_type === "video" ? "mp4" : "jpg");
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `evento_${i + 1}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloadProgress({ current: i + 1, total: approvedMedia.length });
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          console.error("Download error:", err);
        }
      }
    }

    setDownloading(false);
  };

  return (
    <div className="space-y-8">
      {moderationToast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg"
        >
          {moderationToast}
        </div>
      ) : null}

      {deleteToast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg"
        >
          Fotografia a fost ștearsă
        </div>
      ) : null}

      {qrSlug && mounted ? (
        <div
          ref={printableRef}
          aria-hidden
          className="pointer-events-none fixed -left-[10000px] top-0 flex w-[420px] flex-col items-center bg-[#FDF8F5] px-10 py-12 text-center"
        >
          <div className="mb-6 flex items-center gap-2 text-[#B8516B]">
            <Heart className="h-5 w-5 fill-[#FCEAEF]" strokeWidth={2} />
            <span className="font-serif text-xl font-semibold tracking-tight text-[#1A0E14]">
              Evento
            </span>
          </div>
          <h1 className="font-serif text-2xl font-semibold leading-tight text-[#1A0E14]">
            {eventTitle}
          </h1>
          <p className="mt-2 text-sm text-[#7A6270]">Galerie foto eveniment</p>
          <div className="my-8 rounded-2xl border border-[#FCEAEF] bg-white p-5 shadow-sm">
            <QRCodeSVG value={publicUrl} size={200} level="H" includeMargin />
          </div>
          <p className="font-serif text-lg font-medium text-[#1A0E14]">
            Scanează pentru a încărca fotografii
          </p>
          <p className="mt-2 text-xs text-[#9A8A92]">
            Nu este nevoie de cont — încarcă poze și videoclipuri direct de pe telefon.
          </p>
        </div>
      ) : null}

      <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start bg-primary/5">
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-serif font-semibold">Cod QR pentru Invitați</h2>
          <p className="text-muted-foreground">
            {qrSlug
              ? "Printează acest cod QR și pune-l pe mese. Invitații îl pot scana pentru a încărca instantaneu poze și videoclipuri de la eveniment. Nu este nevoie de niciun cont!"
              : "Generează un cod QR unic pentru evenimentul tău pentru a le permite invitaților să încarce poze."}
          </p>

          {!qrSlug ? (
            <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="rounded-xl">
              <QrCode className="mr-2 h-5 w-5" />
              {isGenerating ? "Se generează..." : "Generează Cod QR"}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleCopyLink} variant="outline" className="rounded-xl">
                <LinkIcon className="mr-2 h-4 w-4" />
                {copied ? "Copiat!" : "Copiază Link"}
              </Button>
              <Button
                onClick={handleDownloadPrintable}
                disabled={isPrinting}
                className="rounded-xl"
              >
                {isPrinting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isPrinting ? "Se generează..." : "Descarcă Template Printabil"}
              </Button>
            </div>
          )}
        </div>

        {qrSlug && mounted && (
          <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-border/50">
            <QRCodeSVG value={publicUrl} size={150} level="H" includeMargin />
            <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-medium">
              Scanează și încarcă fotografii
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-serif font-semibold">{ro.gallery.moderation.title}</h2>
          </div>

          {activeTab === "approved" && approvedMedia.length > 0 ? (
            <Button
              onClick={handleDownloadAll}
              disabled={downloading}
              variant="outline"
              className="rounded-xl gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {downloadProgress.current}/{downloadProgress.total}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descarcă Toate
                </>
              )}
            </Button>
          ) : null}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border/50 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === "approved"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {ro.gallery.moderation.tabAll} ({approvedMedia.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "relative rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === "pending"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {ro.gallery.moderation.tabPending.replace("{count}", String(pendingCount))}
            {pendingCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            ) : null}
          </button>
        </div>

        {activeTab === "pending" && pendingCount > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-xl"
              disabled={bulkPending}
              onClick={() => void handleApproveAll()}
            >
              {bulkPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {ro.gallery.moderation.approveAll}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-xl"
              disabled={bulkPending}
              onClick={() => void handleRejectAllPending()}
            >
              {ro.gallery.moderation.rejectAll}
            </Button>
          </div>
        ) : null}

        {activeTab === "approved" ? (
          approvedMedia.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/30 text-center">
              <p className="font-medium text-muted-foreground">
                {ro.gallery.moderation.emptyApproved}
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
              {approvedMedia.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm"
                  onClick={() => setCarouselIndex(index)}
                >
                  {item.file_type === "video" ? (
                    <video
                      src={item.file_url}
                      className="h-auto w-full"
                      muted
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(index);
                      }}
                    />
                  ) : (
                    <Image
                      src={item.file_url}
                      alt="Fotografie eveniment"
                      width={400}
                      height={400}
                      className="h-auto w-full object-cover"
                    />
                  )}

                  <div className="absolute inset-0 flex items-start justify-end bg-black/40 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.uploaded_by ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                      <p className="truncate text-xs font-medium text-white">
                        De la: {item.uploaded_by}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : pendingMedia.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/40 text-center">
            <p className="font-medium text-emerald-800">{ro.gallery.moderation.emptyPending}</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
            {pendingMedia.map((item) => (
              <div
                key={item.id}
                className="group relative break-inside-avoid overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm"
              >
                {item.file_type === "video" ? (
                  <video src={item.file_url} className="h-auto w-full" muted />
                ) : (
                  <Image
                    src={item.file_url}
                    alt="Fotografie în așteptare"
                    width={400}
                    height={400}
                    className="h-auto w-full object-cover"
                  />
                )}

                <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/75 via-black/50 to-transparent p-3 pt-10">
                  <p className="truncate text-xs font-medium text-white">
                    De la: {item.uploaded_by || "Invitat"}
                  </p>
                  <p className="text-[10px] text-white/80">
                    {new Date(item.created_at).toLocaleString("ro-RO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 flex-1 rounded-lg bg-emerald-600 text-xs hover:bg-emerald-700"
                      disabled={actionMediaId === item.id || bulkPending}
                      onClick={() => void handleApprove(item.id)}
                    >
                      {actionMediaId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          {ro.gallery.moderation.approve}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 flex-1 rounded-lg text-xs"
                      disabled={actionMediaId === item.id || bulkPending}
                      onClick={() => void handleReject(item.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {ro.gallery.moderation.reject}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {carouselIndex !== null && approvedMedia.length > 0 ? (
        <MediaCarousel
          media={approvedMedia}
          startIndex={Math.min(carouselIndex, approvedMedia.length - 1)}
          onClose={() => setCarouselIndex(null)}
        />
      ) : null}
    </div>
  );
}
