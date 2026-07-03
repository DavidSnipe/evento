"use client";

import { MotionStaggerGrid, MotionStaggerItem } from "@/components/motion/fade-up";
import { cn } from "@/lib/utils";

type Feature = {
  title: string;
  body: string;
};

type LandingFeatureCardsProps = {
  features: Feature[];
  images: string[];
  className?: string;
};

export function LandingFeatureCards({ features, images, className }: LandingFeatureCardsProps) {
  return (
    <MotionStaggerGrid className={cn("grid gap-6 md:grid-cols-3", className)}>
      {features.map((feature, index) => (
        <MotionStaggerItem key={feature.title} index={index}>
          <article className="evento-card motion-lift-card flex flex-col overflow-hidden">
            <div
              className="aspect-[16/10] bg-cover bg-center"
              style={{ backgroundImage: `url(${images[index]})` }}
              role="img"
              aria-label={feature.title}
            />
            <div className="flex flex-1 flex-col p-6">
              <h2 className="text-lg font-bold text-[var(--color-dash-text)]">{feature.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {feature.body}
              </p>
            </div>
          </article>
        </MotionStaggerItem>
      ))}
    </MotionStaggerGrid>
  );
}
