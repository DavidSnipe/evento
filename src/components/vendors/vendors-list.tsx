"use client";

import { useTransition } from "react";
import { Trash2, Phone, Mail, User } from "lucide-react";

import type { Vendor } from "@/types/vendors";
import { Button } from "@/components/ui/button";
import { deleteVendor } from "@/app/(dashboard)/dashboard/events/[id]/vendors/actions";

export function VendorsList({ items, eventId }: { items: Vendor[], eventId: string }) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/30 text-center">
        <p className="font-medium text-muted-foreground">Nu ai adăugat niciun furnizor încă.</p>
      </div>
    );
  }

  const handleDelete = (itemId: string) => {
    if (confirm("Sigur vrei să ștergi acest furnizor?")) {
      startTransition(() => {
        deleteVendor(eventId, itemId);
      });
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="glass-panel p-5 rounded-2xl flex flex-col group relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isPending}
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
              {item.category}
            </span>
            <h3 className="font-medium mt-2 text-lg">{item.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
              item.status === 'confirmat' ? 'bg-emerald-100 text-emerald-700' : 
              item.status === 'avans_platit' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {item.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="space-y-2 mt-auto text-sm text-muted-foreground">
            {item.contact_person && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{item.contact_person}</span>
              </div>
            )}
            {item.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href={`tel:${item.phone}`} className="hover:text-primary transition-colors">{item.phone}</a>
              </div>
            )}
            {item.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${item.email}`} className="hover:text-primary transition-colors truncate">{item.email}</a>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
