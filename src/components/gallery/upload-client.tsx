"use client";

import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, CheckCircle2, Loader2, X, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Limite: 20MB poze, 150MB video (în bytes)
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 150 * 1024 * 1024;
const MAX_FILES = 20;

export function UploadClient({ eventId }: { eventId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);
    if (fileRejections.length > 0) {
      setError("Unele fișiere sunt prea mari sau au format nepermis.");
    }
    if (files.length + acceptedFiles.length > MAX_FILES) {
      setError(`Poți adăuga maxim ${MAX_FILES} fișiere odată.`);
      return;
    }
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'],
      'video/*': ['.mp4', '.mov']
    },
    maxSize: MAX_VIDEO_SIZE, // Accept up to max video size, but we validate images manually
    validator: (file) => {
      if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
        return { code: 'image-too-large', message: 'Poza depășește limita de 20MB.' };
      }
      return null;
    }
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    let uploadedCount = 0;

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${eventId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 1. Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
          .from("event_media")
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (storageError) throw storageError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from("event_media")
          .getPublicUrl(fileName);

        // 3. Save to database
        const { error: dbError } = await supabase
          .from("media_uploads")
          .insert({
            event_id: eventId,
            file_url: publicUrl,
            file_type: file.type.startsWith('video/') ? 'video' : 'image',
            mime_type: file.type,
            size: file.size,
            uploaded_by: guestName.trim() || "Invitat Anomin",
          });

        if (dbError) throw dbError;

        uploadedCount++;
        setProgress(Math.round((uploadedCount / files.length) * 100));

      } catch (err) {
        console.error("Upload error:", err);
        setError("A apărut o eroare la încărcare. Încearcă din nou.");
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setSuccess(true);
    setFiles([]);
  };

  if (success) {
    return (
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/40 text-center animate-in zoom-in duration-500">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Amintiri Salvate!</h2>
        <p className="text-muted-foreground mb-8">
          Îți mulțumim că ai contribuit la albumul acestui eveniment!
        </p>
        <Button onClick={() => setSuccess(false)} variant="outline" className="rounded-xl w-full h-12 text-base shadow-sm">
          Încarcă Mai Multe
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div 
        {...getRootProps()} 
        className={`relative overflow-hidden bg-white/60 backdrop-blur-md border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg' : 'border-primary/20 hover:border-primary/50 hover:bg-white/80'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              {isDragActive ? "Lasă fișierele aici..." : "Apasă pentru a alege poze / video"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sau fă o poză chiar acum! (Max {MAX_FILES} fișiere)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center border border-red-100 animate-in fade-in">
          {error}
        </div>
      )}

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/40 animate-in slide-in-from-bottom-4">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">
            {files.length} Fișiere Selectate
          </h3>
          
          <div className="space-y-3 mb-6 max-h-[30vh] overflow-y-auto pr-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 bg-background/50 p-2 rounded-xl border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ImagePlus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                {!uploading && (
                  <button onClick={() => removeFile(index)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Numele tău (Opțional)</label>
              <input 
                type="text" 
                placeholder="ex: Familia Popescu" 
                className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={uploading}
              />
            </div>

            <Button 
              className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/20 relative overflow-hidden" 
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300" style={{ width: `${progress}%` }} />
                  <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                  <span className="relative z-10">Se încarcă {progress}%</span>
                </>
              ) : (
                "Trimite Amintirile"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
