---
name: Evento
description: Elegant Romanian event planning — blush rose accent on restrained ivory surfaces
colors:
  rose-primary: "#B8516B"
  rose-light: "#E8748A"
  rose-dark: "#AA3F58"
  blush-light: "#FEF0F3"
  blush-end: "#FCEAEF"
  ivory-canvas: "#F5F4F3"
  warm-gray: "#EEEDEB"
  ink: "#1C1816"
  ink-secondary: "#6B6560"
  ink-muted: "#9A9490"
  sage-success: "#89A293"
  champagne-accent: "#D5B886"
  surface-white: "#FFFFFF"
  border-rose: "#D2AAB9"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  dashboard-display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Sans, Inter, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "18px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.rose-primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.rose-dark}"
    textColor: "#FFFFFF"
  card-panel:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input-default:
    backgroundColor: "#F3F3F5"
    textColor: "{colors.ink}"
    rounded: "10px"
    padding: "8px 12px"
---

## Overview

**Creative north star: The Quiet Atelier**

Evento's visual system should feel like a well-run atelier preparing for an important celebration — ordered, tactile, unhurried. Surfaces are warm but not creamy; accent rose is intentional, not everywhere. The dashboard is a precision tool (Geist, tight hierarchy); public pages may open with editorial serif moments (Playfair) before handing off to calm utility.

This DESIGN.md captures the **current baseline** (pre-rebrand) extracted from `globals.css`, `dashboard-foundation.css`, and Nuntiki variants. Use it as the reference point for the upcoming identity refresh — not as the final target aesthetic.

Mood: elegant, refined, assured. Anti-references: generic SaaS, AI slop (glass blur stacks, gradient text), cliché wedding kitsch.

## Colors

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Primary accent | `--primary` / `--dash-accent-text` | `#B8516B` | CTAs, active nav, links |
| Rose gradient start | `--color-rose-light` | `#E8748A` | Primary button gradients (simplify in rebrand) |
| Canvas | `--dash-ivory` | `#F5F4F3` | Dashboard background |
| Public canvas | `--background` | `~#F6EEEA` | Marketing / auth shells |
| Surface | `--dash-surface` | `#FFFFFF` | Cards, panels |
| Blush tint | `--dash-blush` | `#EEDFE3` | Active chips, soft highlights |
| Ink | `--dash-text` | `#1C1816` | Primary text |
| Secondary ink | `--dash-text-secondary` | `#6B6560` | Descriptions, meta |
| Success | `--dash-sage` | `#89A293` | Confirmed states, positive stats |
| Champagne | `--accent` | `#D5B886` | Sparingly — badges, marketing highlights |

**Rebrand note:** Consolidate legacy hardcoded hex into CSS variables. Reduce reliance on rose gradients for every primary button.

## Typography

- **Public / marketing:** Inter body + Playfair Display headings (`layout.tsx`).
- **Dashboard shell:** Geist Sans overrides Playfair inside `.dashboard-shell`.
- **Scale:** Display 2rem → Title 1.5rem → Heading 1.125rem → Body 0.875rem → Caption 0.6875rem → Micro 0.625rem uppercase.
- **Stat labels:** 9.5–11px uppercase bold (module pattern).
- Use `text-wrap: balance` on page titles; cap prose at ~70ch on public flows.

## Elevation

Layered glass is current default (`.glass-panel`: white ~88%, rose border, blur 20px). Shadows: `--dash-shadow-sm/md/lg` for cards.

**Rebrand direction:** Move from decorative glass to **tonal layering** — solid surfaces + hairline borders (`--dash-hairline`). Reserve blur for modals/overlays only.

## Components

| Component | Pattern | Notes |
|-----------|---------|-------|
| Page shell | `DashboardPage` + `PageHeader` | Nuntiki rhythm; 2.5rem content padding |
| Stats | `StatsCard` in `StatsGrid` | 18px radius glass; uppercase micro labels |
| Section | `SectionCard` | White glass, 18px radius |
| Button | shadcn `Button` + rose gradient overrides | Candidate for single solid primary |
| Input | `Input` — 10px radius, rose focus ring | |
| Sidebar | 240px / 56px collapsed | Mobile: bottom nav pill |
| Category workspace | 4-col grid (Budget, Vendors) | Sticky left sidebar on lg+ |
| Seating planner | Full-viewport canvas | Separate `--ev-*` token set |

Public pages use `.evento-public-page` (`--color-dash-ivory`).

## Do's and Don'ts

**Do**
- Use `--dash-*` tokens in dashboard; shadcn semantic tokens on public surfaces.
- Keep one primary CTA per view; pair status with text + icon.
- Use sage for success, rose for primary action, amber only for warnings.
- Test Romanian copy at mobile widths.

**Don't**
- Gradient text on headings — solid ink or rose only.
- Glass panels on every nested element; avoid cards inside cards.
- Cream/sand body bg as the only brand move.
- Tiny uppercase eyebrows above every section heading.
- Rose gradient on every button.
