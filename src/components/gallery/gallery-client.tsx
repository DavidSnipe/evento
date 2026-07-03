"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  bulkDeleteMedia,
  rejectAllPendingPhotos,
  rejectPhoto,
  toggleFavorite,
} from "@/app/(dashboard)/dashboard/events/[id]/gallery/actions";
import { ConfirmDialog } from "@/components/nuntiki/confirm-dialog";
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

type GalleryTab = "approved" | "pending" | "favorites";

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
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<GalleryTab>("approved");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [heartPulseId, setHeartPulseId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [actionMediaId, setActionMediaId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  const approvedMedia = useMemo(() => media.filter((item) => item.approved), [media]);
  const pendingMedia = useMemo(() => media.filter((item) => !item.approved), [media]);
  const favoriteMedia = useMemo(
    () => approvedMedia.filter((item) => item.is_favorite),
    [approvedMedia]
  );
  const gridMedia = activeTab === "favorites" ? favoriteMedia : approvedMedia;
  const pendingCount = pendingMedia.length;
  const selectedCount = selectedIds.size;

  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(gridMedia.map((item) => item.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [gridMedia]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setIsSelecting(false);
    }
  }, [selectedIds.size]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMedia(initialMedia.filter((item) => !deletedIdsRef.current.has(item.id)));
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

  const toggleSelection = (mediaId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
    setIsSelecting(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(gridMedia.map((item) => item.id)));
    setIsSelecting(true);
  };

  const handleToggleFavorite = async (mediaId: string) => {
    const previous = media.find((item) => item.id === mediaId)?.is_favorite ?? false;
    setMedia((prev) =>
      prev.map((item) =>
        item.id === mediaId ? { ...item, is_favorite: !previous } : item
      )
    );
    setHeartPulseId(mediaId);
    setTimeout(() => setHeartPulseId(null), 200);

    const res = await toggleFavorite(eventId, mediaId);
    if (res.error || res.is_favorite == null) {
      setMedia((prev) =>
        prev.map((item) =>
          item.id === mediaId ? { ...item, is_favorite: previous } : item
        )
      );
      alert(res.error ?? "Nu am putut actualiza favoritul.");
      return;
    }

    setMedia((prev) =>
      prev.map((item) =>
        item.id === mediaId ? { ...item, is_favorite: res.is_favorite! } : item
      )
    );
  };

  const downloadMediaItems = async (items: MediaUpload[]) => {
    if (items.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ current: 0, total: items.length });

    const canShareFiles =
      typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare;

    if (canShareFiles) {
      try {
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const resp = await fetch(item.file_url);
          const blob = await resp.blob();
          const ext =
            item.mime_type?.split("/")[1] || (item.file_type === "video" ? "mp4" : "jpg");
          files.push(new File([blob], `evento_${i + 1}.${ext}`, { type: blob.type }));
          setDownloadProgress({ current: i + 1, total: items.length });
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
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
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
          setDownloadProgress({ current: i + 1, total: items.length });
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          console.error("Download error:", err);
        }
      }
    }

    setDownloading(false);
  };

  const handleDownloadSelected = async () => {
    const items = gridMedia.filter((item) => selectedIds.has(item.id));
    if (items.length === 0) return;
    showToast(ro.gallery.selection.downloading.replace("{count}", String(items.length)));
    await downloadMediaItems(items);
    showToast(ro.gallery.selection.downloadComplete);
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setBulkDeleting(true);
    ids.forEach((id) => deletedIdsRef.current.add(id));
    setMedia((prev) => prev.filter((item) => !ids.includes(item.id)));
    const count = ids.length;
    clearSelection();
    setCarouselIndex(null);
    setBulkDeleteOpen(false);

    const res = await bulkDeleteMedia(eventId, ids);
    setBulkDeleting(false);

    if (res.error) {
      ids.forEach((id) => deletedIdsRef.current.delete(id));
      alert(res.error);
      router.refresh();
      return;
    }

    showToast(ro.gallery.selection.deleteSuccess.replace("{count}", String(count)));
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

    deletedIdsRef.current.add(mediaId);
    setMedia((prev) => prev.filter((item) => item.id !== mediaId));
    setCarouselIndex(null);
    setDeleteToast(true);
    setTimeout(() => setDeleteToast(false), 2500);
  };

  const handleDownloadAll = async () => {
    if (approvedMedia.length === 0) return;
    await downloadMediaItems(approvedMedia);
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

      <div className="flex flex-col items-center gap-8 rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-6 shadow-[var(--dash-shadow-card)] sm:p-8 md:flex-row md:items-start">
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-semibold text-[var(--dash-text)]">Cod QR pentru Invitați</h2>
          <p className="text-[var(--dash-text-secondary)]">
            {qrSlug
              ? "Printează acest cod QR și pune-l pe mese. Invitații îl pot scana pentru a încărca instantaneu poze și videoclipuri de la eveniment. Nu este nevoie de niciun cont!"
              : "Generează un cod QR unic pentru evenimentul tău pentru a le permite invitaților să încarce poze."}
          </p>

          {!qrSlug ? (
            <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="min-h-11 rounded-xl">
              <QrCode className="mr-2 h-5 w-5" />
              {isGenerating ? "Se generează..." : "Generează Cod QR"}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleCopyLink} variant="outline" className="min-h-11 rounded-xl">
                <LinkIcon className="mr-2 h-4 w-4" />
                {copied ? "Copiat!" : "Copiază Link"}
              </Button>
              <Button
                onClick={handleDownloadPrintable}
                disabled={isPrinting}
                className="min-h-11 rounded-xl"
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
          <div className="flex flex-col items-center rounded-[16px] border border-[var(--dash-hairline)] bg-[var(--dash-surface)] p-4 shadow-[var(--dash-shadow-sm)]">
            <QRCodeSVG value={publicUrl} size={150} level="H" includeMargin />
            <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-[var(--dash-text-muted)]">
              Scanează și încarcă fotografii
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[var(--dash-accent-text)]" />
            <h2 className="text-xl font-semibold text-[var(--dash-text)]">{ro.gallery.moderation.title}</h2>
          </div>

          {activeTab === "approved" && approvedMedia.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {!isSelecting ? (
                <Button
                  onClick={handleSelectAll}
                  variant="ghost"
                  className="rounded-xl gap-2"
                >
                  {ro.gallery.selection.selectAll}
                </Button>
              ) : null}
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
            </div>
          ) : activeTab === "favorites" && favoriteMedia.length > 0 ? (
            !isSelecting ? (
              <Button onClick={handleSelectAll} variant="ghost" className="rounded-xl gap-2">
                {ro.gallery.selection.selectAll}
              </Button>
            ) : null
          ) : null}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--dash-hairline)] pb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("approved");
              clearSelection();
            }}
            className={cn(
              "min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === "approved"
                ? "border border-[var(--dash-accent)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-[var(--dash-shadow-sm)]"
                : "border border-transparent text-[var(--dash-text-secondary)] hover:bg-[var(--dash-ivory)]"
            )}
          >
            {ro.gallery.moderation.tabAll} ({approvedMedia.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("favorites");
              clearSelection();
            }}
            className={cn(
              "min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === "favorites"
                ? "border border-[var(--dash-accent)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-[var(--dash-shadow-sm)]"
                : "border border-transparent text-[var(--dash-text-secondary)] hover:bg-[var(--dash-ivory)]"
            )}
          >
            {ro.gallery.favorites.tab} ({favoriteMedia.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("pending");
              clearSelection();
            }}
            className={cn(
              "relative min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === "pending"
                ? "border border-[var(--dash-accent)] bg-[var(--dash-accent-soft)] text-[var(--dash-accent-text)] shadow-[var(--dash-shadow-sm)]"
                : "border border-transparent text-[var(--dash-text-secondary)] hover:bg-[var(--dash-ivory)]"
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

        {activeTab === "approved" || activeTab === "favorites" ? (
          gridMedia.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/30 text-center">
              <p className="font-medium text-muted-foreground">
                {activeTab === "favorites"
                  ? ro.gallery.favorites.empty
                  : ro.gallery.moderation.emptyApproved}
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
              {gridMedia.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const selectionActive = isSelecting || selectedCount > 0;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative cursor-pointer break-inside-avoid overflow-hidden rounded-xl border bg-white shadow-sm transition-all",
                      isSelected
                        ? "border-[var(--dash-accent-text)] ring-2 ring-[var(--dash-accent-text)]"
                        : "border-border/50"
                    )}
                    onClick={() => {
                      if (selectionActive) {
                        toggleSelection(item.id);
                        return;
                      }
                      setCarouselIndex(index);
                    }}
                  >
                    {isSelected ? (
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-primary/10" />
                    ) : null}

                    <button
                      type="button"
                      aria-label={isSelected ? "Deselectează" : "Selectează"}
                      className={cn(
                        "absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border shadow-sm transition-opacity",
                        isSelected
                          ? "border-[var(--dash-accent-text)] bg-[var(--dash-accent-text)] text-white opacity-100"
                          : "border-white/80 bg-white/90 text-[var(--dash-text-secondary)] max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100",
                        (selectionActive || isSelected) && "opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(item.id);
                      }}
                    >
                      {isSelected ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                    </button>

                    <button
                      type="button"
                      aria-label={item.is_favorite ? "Elimină din favorite" : "Adaugă la favorite"}
                      className={cn(
                        "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-md transition-opacity max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100",
                        selectionActive && "opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleFavorite(item.id);
                      }}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          item.is_favorite
                            ? "fill-[#B8516B] text-[#B8516B]"
                            : "text-[var(--dash-text-secondary)]",
                          heartPulseId === item.id && "scale-[1.3]"
                        )}
                      />
                    </button>

                    {item.file_type === "video" ? (
                      <video
                        src={item.file_url}
                        className="h-auto w-full"
                        muted
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectionActive) {
                            toggleSelection(item.id);
                          } else {
                            setCarouselIndex(index);
                          }
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
                );
              })}
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

      {carouselIndex !== null && gridMedia.length > 0 && (activeTab === "approved" || activeTab === "favorites") ? (
        <MediaCarousel
          media={gridMedia}
          startIndex={Math.min(carouselIndex, gridMedia.length - 1)}
          onClose={() => setCarouselIndex(null)}
        />
      ) : null}

      {selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-14 z-[60] animate-in slide-in-from-bottom-full duration-200 md:bottom-0">
          <div className="border-t border-[var(--dash-hairline)] bg-white px-6 py-4 shadow-[var(--dash-shadow-card)] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-5xl items-center gap-3">
              <p className="text-sm font-medium text-[var(--dash-text)]">
                {ro.gallery.selection.selected.replace("{count}", String(selectedCount))}
              </p>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={clearSelection} className="rounded-xl">
                {ro.gallery.selection.deselectAll}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={downloading}
                onClick={() => void handleDownloadSelected()}
                className="rounded-xl gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {ro.gallery.selection.downloadSelected.replace("{count}", String(selectedCount))}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="rounded-xl gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {ro.gallery.selection.deleteSelected.replace("{count}", String(selectedCount))}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={ro.gallery.selection.deleteTitle.replace("{count}", String(selectedCount))}
        description={ro.gallery.selection.deleteBody}
        cancelLabel={ro.gallery.selection.cancel}
        confirmLabel={ro.gallery.selection.deleteConfirm}
        variant="destructive"
        loading={bulkDeleting}
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
}
