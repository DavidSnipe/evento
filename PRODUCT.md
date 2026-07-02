# Product

## Register

product

## Users

Romanian couples planning their own wedding or family event (nunta, botez, aniversare). They use Evento in the months before the event: building the guest list, assigning seating, tracking budget and vendors, collecting RSVPs, and sharing a photo gallery with guests. Context is emotional and time-pressured — they need calm, trustworthy tools that feel as considered as the event itself.

Secondary users (not the primary design focus): professional coordinators, marketplace vendors, and platform admins.

## Product Purpose

Evento is an all-in-one event planning workspace for Romanian-speaking hosts. It replaces scattered spreadsheets, WhatsApp threads, and ad-hoc tools with a single place to manage guests, seating, budget, vendors, RSVP, timeline, and guest-uploaded photos.

Success looks like: a couple completes core planning (guests seated, budget tracked, RSVPs collected) with confidence, without fighting the UI. The product should feel like a quiet professional atelier, not a generic SaaS dashboard or a cliché wedding template.

## Brand Personality

**Elegant · Refined · Assured**

Quiet luxury and editorial restraint. Warm enough for celebration, never saccharine. Confident typography and spacing over decoration. Romanian copy is direct and respectful — formal tone as already used in `ro.ts`, not corporate jargon.

Emotional goal: **calm competence** — the user feels their event is in good hands.

## Anti-references

- **Generic SaaS**: navy dashboards, hero metric templates, identical icon+heading+text card grids, tiny uppercase eyebrows on every section.
- **AI slop**: cream/sand body backgrounds as default, glassmorphism everywhere, gradient text, rose gradient CTAs on every button, numbered section markers (01/02/03) as scaffolding.
- **Cliché wedding**: script fonts, lace textures, heart overload, pink-on-pink, Pinterest-template aesthetics.

Evento should never look like it was generated from a "wedding SaaS" prompt.

## Design Principles

1. **Serve the task** — Every screen optimizes for the job on that screen (seat guests, confirm RSVP, compare vendor quotes). Decoration is earned, not default.
2. **Editorial hierarchy** — One clear primary action and one typographic voice per view. Density when data demands it; breathing room when decisions are emotional.
3. **Restraint over theme** — Color and motion signal state and brand, not fill empty space. If removing an element doesn't hurt comprehension, remove it.
4. **Coherent registers** — Public/marketing surfaces may use Playfair and warmer storytelling; dashboard uses Geist and tool clarity. Transitions between them should feel like the same brand, not two apps.
5. **Romanian-first** — Layout, labels, and empty states assume Romanian copy lengths and cultural context (nunta, nași, lei, civil/religious/party segments).

## Accessibility & Inclusion

**Pragmatic WCAG 2.1 AA** on body text, labels, and primary CTAs (≥4.5:1 contrast). Best effort on charts, decorative elements, and dense data tables.

- Respect `prefers-reduced-motion` for all animations.
- Touch targets ≥44px on mobile planning flows (RSVP public pages, guest FAB, seating mobile drawer).
- Do not rely on color alone for RSVP status — pair with text/icons.
