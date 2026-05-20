"use client";

import { useState } from "react";
import { QrCode, Download, Link as LinkIcon, Trash2, Camera, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { generateQrSlug, deleteMedia } from "@/lib/gallery/actions";
import type { MediaUpload } from "@/types/gallery";
import { MediaCarousel } from "./media-carousel";
import Image from "next/image";

export function GalleryClient({
  eventId,
  initialQrSlug,
  initialMedia,
}: {
  eventId: string;
  initialQrSlug: string | null;
  initialMedia: MediaUpload[];
}) {
  const [qrSlug, setQrSlug] = useState(initialQrSlug);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  const publicUrl = qrSlug ? `${window.location.origin}/gallery/${qrSlug}` : "";

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

  const handleDelete = async (mediaId: string) => {
    if (confirm("Sigur vrei să ștergi acest fișier?")) {
      await deleteMedia(eventId, mediaId);
    }
  };

  // Download all photos individually (not as zip)
  const handleDownloadAll = async () => {
    if (initialMedia.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ current: 0, total: initialMedia.length });

    // Check if Web Share API is available (mobile - saves to gallery like AirDrop)
    const canShareFiles = typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare;

    if (canShareFiles) {
      // Mobile: batch share all files at once -> appears in gallery / AirDrop sheet
      try {
        const files: File[] = [];
        for (let i = 0; i < initialMedia.length; i++) {
          const media = initialMedia[i];
          const resp = await fetch(media.file_url);
          const blob = await resp.blob();
          const ext = media.mime_type?.split("/")[1] || (media.file_type === "video" ? "mp4" : "jpg");
          files.push(new File([blob], `evento_${i + 1}.${ext}`, { type: blob.type }));
          setDownloadProgress({ current: i + 1, total: initialMedia.length });
        }

        if (navigator.canShare({ files })) {
          await navigator.share({ files });
        } else {
          // Fallback if can't share all at once
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
      // Desktop: download files one by one into Downloads folder
      for (let i = 0; i < initialMedia.length; i++) {
        const media = initialMedia[i];
        try {
          const resp = await fetch(media.file_url);
          const blob = await resp.blob();
          const ext = media.mime_type?.split("/")[1] || (media.file_type === "video" ? "mp4" : "jpg");
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `evento_${i + 1}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloadProgress({ current: i + 1, total: initialMedia.length });
          // Small delay between downloads so browser doesn't block them
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
      {/* QR Code Section */}
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
              <Button className="rounded-xl">
                <Download className="mr-2 h-4 w-4" />
                Descarcă Template Printabil
              </Button>
            </div>
          )}
        </div>

        {qrSlug && (
          <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-border/50">
            <QRCodeSVG value={publicUrl} size={150} level="H" includeMargin />
            <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-medium">Scanează pentru Upload</p>
          </div>
        )}
      </div>

      {/* Gallery Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-serif font-semibold">Fotografii Recente ({initialMedia.length})</h2>
          </div>
          
          {initialMedia.length > 0 && (
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
          )}
        </div>

        {initialMedia.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/30 text-center">
            <p className="font-medium text-muted-foreground">Nicio fotografie încărcată încă.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {initialMedia.map((media, index) => (
              <div 
                key={media.id} 
                className="relative group rounded-xl overflow-hidden break-inside-avoid shadow-sm border border-border/50 bg-white cursor-pointer"
                onClick={() => setCarouselIndex(index)}
              >
                {media.file_type === 'video' ? (
                  <video 
                    src={media.file_url} 
                    className="w-full h-auto" 
                    muted 
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex(index); }}
                  />
                ) : (
                  <Image 
                    src={media.file_url} 
                    alt="Event Photo" 
                    width={400} 
                    height={400} 
                    className="w-full h-auto object-cover"
                  />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => { e.stopPropagation(); handleDelete(media.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {media.uploaded_by && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                    <p className="text-white text-xs font-medium truncate">De la: {media.uploaded_by}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carousel Overlay */}
      {carouselIndex !== null && (
        <MediaCarousel
          media={initialMedia}
          startIndex={carouselIndex}
          onClose={() => setCarouselIndex(null)}
        />
      )}
    </div>
  );
}
