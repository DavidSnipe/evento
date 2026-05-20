import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ro } from "@/lib/i18n/ro";

export default function EventNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold">{ro.events.errors.notFound}</h1>
      <Button asChild className="mt-6">
        <Link href="/dashboard/events">{ro.events.title}</Link>
      </Button>
    </div>
  );
}
