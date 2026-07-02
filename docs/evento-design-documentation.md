# Evento — Visual & Interaction Design Documentation

> Generated from source code audit. For brand redesign and onboarding designers who have never seen the codebase.

**App:** Romanian wedding/event planning SaaS | **Stack:** Next.js 15, Tailwind v4, shadcn/ui, Supabase | **Language:** Romanian (`lang="ro"`)

---

## DESIGN SYSTEM SUMMARY

### Colors

#### shadcn semantic tokens (`globals.css`)

| Variable | Hex (approx.) | Usage |
|----------|---------------|-------|
| `--background` | `#F6EEEA` | Page canvas |
| `--foreground` | `#1B0E14` | Primary text |
| `--primary` | `#B8516B` | Rose CTA, links |
| `--secondary` | `#FDFAF9` | Secondary surfaces |
| `--muted-foreground` | `#99808F` | Secondary text |
| `--accent` | `#D5B886` | Champagne gold |
| `--destructive` | `#FF2E31` | Errors |
| `--border` | `#E2CFD6` | Rose-tinted borders |

#### Brand theme colors

| Variable | Value |
|----------|-------|
| `--color-rose-light` | `#E8748A` |
| `--color-rose-dark` | `#AA3F58` |
| `--color-blush-light` | `#FEF0F3` |
| `--color-blush-end` | `#FCEAEF` |
| `--color-dash-ivory` | `#F5F4F3` |
| `--color-dash-warm-gray` | `#EEEDEB` |
| `--color-dash-text` | `#1C1816` |
| `--color-dash-sage` | `#89A293` |
| `--color-confirmed-green` | `#34C759` |
| `--color-pending-orange` | `#FF9F0A` |

#### Dashboard tokens (`dashboard-foundation.css`)

| Variable | Value |
|----------|-------|
| `--dash-ivory` | `#F5F4F3` |
| `--dash-warm-gray` | `#EEEDEB` |
| `--dash-blush` | `#EEDFE3` |
| `--dash-sage` | `#89A293` |
| `--dash-text` | `#1C1816` |
| `--dash-text-secondary` | `#6B6560` |
| `--dash-accent-text` | `#B8516B` |
| `--dash-hairline` | `rgba(28,24,22,0.06)` |

#### Seating planner tokens

| Variable | Value |
|----------|-------|
| `--ev-bg-canvas` | `#F9F4F1` |
| `--ev-rose-500` | `#C84B6E` |
| `--ev-text-primary` | `#2C1A22` |
| `--ev-border-soft` | `rgba(200,155,172,0.22)` |

#### Gradients

- Blush: `#FEF0F3` → `#FCEAEF`
- Primary CTA: `#E8748A` → `#B8516B`
- `.glass-panel`: white 88% + rose border + blur 20px
- `.evento-public-page`: `--color-dash-ivory` background

### Typography

| Context | Font | Variable |
|---------|------|----------|
| Public body | Inter | `--font-inter` |
| Public headings | Playfair Display | `--font-playfair` |
| Dashboard | Geist Sans | `--font-geist-sans` |

**Dashboard scale:** Display 2rem / Title 1.5rem / Heading 1.125rem / Body 0.875rem / Caption 0.6875rem / Micro 0.625rem uppercase.

### Common Components (`src/components/ui/`)

| Component | Description |
|-----------|-------------|
| alert-dialog | Radix confirmation for destructive actions |
| avatar | Circular avatar with initials fallback |
| badge | Pill status/tag badge |
| button | CVA button with variant/size options |
| calendar | react-day-picker date picker |
| card | Glass card 18px radius with slots |
| dialog | Radix modal with rose glass overlay |
| dropdown-menu | Radix dropdown menus |
| emoji-icon | Registry PNG icons with emoji fallback |
| error-boundary | Client error fallback with retry |
| input | Rose-tinted form input 10px radius |
| label | xs semibold form label |
| page-loading | Branded heart + spinner loader |
| popover | Glass floating panel |
| progress | Rose gradient progress bar |
| scroll-area | Custom scrollbar wrapper |
| separator | Rose gradient divider |
| sheet | Slide-out drawer for mobile |
| skeleton | Pulsing loading placeholder |
| table | Composable table primitives |
| tooltip | Radix tooltip |

**Nuntiki layout:** `PageHeader`, `StatsGrid`, `StatsCard`, `SectionCard`.

### Layout Patterns

1. **Public shell** — gradient bg, `max-w-6xl`, Playfair headings, glass panels
2. **Dashboard shell** — sidebar 240px + ivory main + mobile bottom nav
3. **Category workspace** — 4-col grid: stats + sticky sidebar + workspace (Budget, Vendors)
4. **Immersive planner** — full viewport seating canvas, no page header

### Spacing & Radius

- Global radius: 10px base; dashboard panels 18px; modals 22px
- Inputs: `rounded-[10px]`; pills: `rounded-full`
- Glass recipe: `border-border-rose-18 bg-white/70 shadow-card backdrop-blur-md`

---

## Landing Page — `/`

**Purpose:** Marketing homepage converting visitors to signup; showcases featured vendors and product features.

**Layout:** Full-width gradient; header + main `max-w-6xl`; no sidebar.

**Sections:**
- Header: Heart logo, Marketplace, Sign in / Dashboard, Get started
- Hero: badge, serif headline, subtitle, dual CTAs
- Marketplace preview: 3 VendorCards or skeleton placeholders
- Features: 3 glass-panel articles
- Vendor CTA band

**Key UI Elements:**
- Buttons: ghost Marketplace/Sign in; primary signup; outline hero secondary; vendor signup
- Cards: VendorCard, feature glass panels

**Design Tokens Used:**
- Background: `from-background via-[hsl(350,28%,97%)] to-secondary/40`
- Accents: `primary` rose, `accent` gold
- Typography: Playfair `text-5xl md:text-6xl` hero

**Interactions:** CTAs to signup/login/marketplace; auth-aware dashboard link; card hover shadows.

**Empty State:** MarketplacePlaceholderCards when no featured vendors.

**Loading State:** No route loading; global TopLoader.

**Mobile:** Hero CTAs stack; features 1→3 cols; no hamburger.

**Component Dependencies:** VendorCard, Button, getFeaturedVendors, getServerUser

---

## Login — `/login`

**Purpose:** Email/password and Google OAuth sign-in.

**Layout:** Centered column on blush gradient; logo + glass card max-w-md.

**Sections:** Logo link; SupabaseEnvBanner (dev); AuthForm

**Key UI Elements:**
- Buttons: Google outline; primary submit; signup footer link
- Forms: email, password (min 8)

**Design Tokens Used:** Blush gradient bg; glass-panel; text-primary links; Playfair text-3xl title

**Interactions:** signIn action; Google OAuth; ?error=google banner; redirect on success.

**Empty State:** N/A | **Loading State:** Button pending | **Mobile:** Full-width card px-4

**Component Dependencies:** AuthForm, SupabaseEnvBanner, Card, Input, Button

---

## Signup — `/signup`

**Purpose:** Two-step registration with role selection (planner / vendor / both).

**Layout:** Auth shell; card max-w-lg.

**Sections:** Step 1 identity + Google; Step 2 role cards; footer to login

**Key UI Elements:** Google, Continue, role cards, Back, Create account; name/email/password forms

**Design Tokens Used:** Selected role border-primary/40 bg-primary/10

**Interactions:** ?role=vendor|both skips to step 2; signUp action; email confirmation or redirect.

**Loading State:** Submit pending | **Mobile:** Role cards stack

**Component Dependencies:** SignupForm, signUp, signInWithGoogle

---

## Role Select — `/signup/role-select`

**Purpose:** Post-OAuth role picker for users without account_role.

**Layout:** Auth shell. **Sections:** 3 role cards + Continuă în Evento submit.

**Interactions:** selectSignupRole; redirects if unauthenticated or role set.

**Component Dependencies:** RoleSelectForm, selectSignupRole

---

## Dashboard Home — `/dashboard`

**Purpose:** Planner hub: welcome, stats, quick actions, planning progress, recent events.

**Layout:** Sidebar + main max-w-6xl; DashboardPage rhythm.

**Sections:** PageHeader; StatsGrid (3–5); OnboardingChecklist OR QuickActions + PlanningProgress + EventCards

**Key UI Elements:** StatsCard with progress; quick-action chips; EventCard with active pulse; 6-step onboarding

**Design Tokens Used:** --dash-ivory, --dash-accent-text, --dash-blush, --dash-sage

**Interactions:** Stats link to modules; event cards navigate; onboarding → new event.

**Empty State:** OnboardingChecklist when zero events.

**Loading State:** Yes — shimmer header + stats + event skeletons.

**Mobile:** Stats 2→5 cols; bottom nav from layout.

**Component Dependencies:** DashboardPage, PageHeader, StatsGrid, DashboardQuickActions, PlanningProgress, OnboardingChecklist, EventCard

---

## Event Overview — `/dashboard/events/[id]`

**Purpose:** Event hub: metadata, metrics, actions, navigation to guests/seating.

**Layout:** Sidebar + main; header, stats, overview, 2 nav tiles.

**Sections:** Header actions (active, edit, calendar, collaborators, delete); stats; EventNextSteps; overview card; guests/seating tiles

**Key UI Elements:** set active, edit, settings, delete; StatsCard ×3; SectionCard; 18px nav tiles

**Design Tokens Used:** --dash-blush, --dash-accent-text, sage guest stat

**Interactions:** Server actions; next-step pills; nav tiles.

**Empty State:** Placeholders for missing fields; EventNextSteps for new events.

**Loading State:** Yes — overview skeleton.

**Mobile:** Actions wrap; stats 1→3 cols.

**Component Dependencies:** PageHeader, StatsGrid, EventNextSteps, DeleteEventButton

---

## Guests Module — `/dashboard/events/[id]/guests`

**Purpose:** Guest CRUD, RSVP, tags, import, bulk actions, sub-guests.

**Layout:** Stats, insights, toolbar, table/card view, overlays.

**Sections:** Stats; insight pills; toolbar; GuestTableView/CardView; detail panel; import modal; bulk bar; mobile FAB

**Key UI Elements:** Import, Adaugă, 9 tag filter chips, RSVP/table filters, bulk actions; quick-add; detail panel

**Design Tokens Used:** Rose gradient CTAs; blush active filters; dark bulk bar #1A0E14/95

**Interactions:** Search/filter/sort; optimistic CRUD; import with undo; bulk select.

**Empty State:** Centered card with import + add CTAs.

**Loading State:** Yes — detailed table shimmer + dynamic skeleton.

**Mobile:** FAB; tag filters horizontal scroll; bulk bar offset.

**Component Dependencies:** GuestDatabase, GuestTableView, GuestDetailPanel, ImportModal, useGuestOptimistic

---

## Seating Module — `/dashboard/events/[id]/seating`

**Purpose:** Interactive floor plan: drag tables/guests, auto-seat, layouts, export, AI.

**Layout:** Full-height planner — no page header. Left sidebar + canvas/list + right panel.

**Sections:** Toolbar; read-only banner; canvas OR list; guest sidebar; layout sidebar; dialogs

**Key UI Elements:** Auto-Așezare, Nou, Export, Print, zoom, lock; TableVisual canvas; mini-map

**Design Tokens Used:** --ev-bg-canvas #F9F4F1; toolbar white blur; amber read-only banner

**Interactions:** Drag/drop; pan/zoom; auto-seat; layout snapshots; read-only for viewers.

**Empty State:** Works with zero tables; template wizard on first visit.

**Loading State:** Yes — sidebar + canvas mock skeleton.

**Mobile:** Guest drawer; bottom sheet inspector; touch pan/zoom.

**Component Dependencies:** SeatingPlanner, SeatingToolbar, GuestSidebar, LayoutSidebar, TableVisual

---

## Budget Module — `/dashboard/events/[id]/budget`

**Purpose:** Budget by vendor category: target, estimated/actual/remaining.

**Layout:** Category workspace grid (stats + sidebar + workspace).

**Sections:** Migration/read-only banners; stats; category sidebar; workspace; expense table

**Key UI Elements:** edit target, add category; category expense tables RON formatted

**Design Tokens Used:** #B8516B actual; --dash-sage remaining; rose gradient CTAs

**Interactions:** Category nav; target dialog; vendor category picker.

**Empty State:** PiggyBank empty + CTA to vendors.

**Loading State:** Yes — stats + list shimmer.

**Mobile:** Stats 2 cols; sidebar stacks.

**Component Dependencies:** BudgetClient, BudgetCategorySidebar, BudgetOverviewWorkspace, VendorCategoryPicker

---

## Vendors Module — `/dashboard/events/[id]/vendors`

**Purpose:** Vendor/service/offer management by category; quote comparison.

**Layout:** Category workspace; vendors-theme.css.

**Sections:** Migration/empty/main; stats; sidebar; category workspace

**Key UI Elements:** add category, add vendor/package, select offer, delete; inline tables

**Design Tokens Used:** --vk-* tokens; rose CTAs; amber migration

**Interactions:** Optimistic CRUD; confirm dialogs; select winning offer.

**Empty State:** Store icon + add category CTA.

**Loading State:** Yes — sidebar + workspace skeleton.

**Mobile:** Stacked layout.

**Component Dependencies:** VendorsWorkspace, VendorCategorySidebar, VendorCategoryWorkspace

---

## RSVP Module — `/dashboard/events/[id]/rsvp`

**Purpose:** Public RSVP link, household sync, invitation editor, response overview.

**Layout:** Vertical card stack.

**Sections:** Migration banner; sync alert; invitation card; public link; guest prep; stats; responses table

**Key UI Elements:** generate slug, copy, sync, preview; household response table

**Design Tokens Used:** Blush hero from-[#FEF8F9]; rose icons; amber alerts

**Interactions:** Server actions; clipboard copy; links to public /rsvp/[slug].

**Empty State:** Migration-only; sync CTA; empty table message.

**Loading State:** Yes — PageLoading.

**Mobile:** Grids stack; table overflow-x-auto.

**Component Dependencies:** RsvpDashboard, Card, Button

---

## Timeline Module — `/dashboard/events/[id]/timeline`

**Purpose:** Planning checklist: milestones, kanban/timeline views, AI generate, calendar subscribe.

**Layout:** Mode nav + overview + tabs + task views.

**Sections:** TimelineModeNav; migration; overview; segment tabs; create form; milestone/kanban views

**Key UI Elements:** generate checklist, view toggle, task complete/delete; TimelineTaskCard

**Design Tokens Used:** Blush tabs #FEF0F3; rose active; multi-color stat accents

**Interactions:** Optimistic task CRUD; segment filter; AI generate (needs date).

**Empty State:** Generate CTA; date warning.

**Loading State:** Yes — minimal pulse.

**Mobile:** Controls wrap; stats 2→5 cols.

**Component Dependencies:** TimelinePlanner, TimelineOverview, TimelineKanbanView, CalendarSubscribeButton

---

## Gallery Module — `/dashboard/events/[id]/gallery`

**Purpose:** QR guest uploads, moderation, download/share approved media.

**Layout:** max-w-5xl; custom serif header.

**Sections:** QR generate/print; moderation tabs; masonry grid; lightbox

**Key UI Elements:** generate QR, copy, printable PDF, approve/reject bulk; masonry photos/videos

**Design Tokens Used:** glass-panel bg-primary/5; #B8516B; amber pending borders

**Interactions:** Moderation; lightbox; Web Share download all.

**Empty State:** Dashed placeholders per tab.

**Loading State:** Yes — PageLoading.

**Mobile:** QR stacks; 2-col masonry.

**Component Dependencies:** GalleryClient, MediaCarousel, QRCodeSVG

---

## Marketplace Public — `/marketplace`

**Purpose:** Public vendor directory with search, filters, pagination, featured row.

**Layout:** Header + main + footer; max-w-6xl; Playfair headings.

**Sections:** Hero search; featured scroll; category pills; filters + grid + pagination

**Key UI Elements:** search form; VendorCard grid; mobile filter Sheet

**Design Tokens Used:** bg-background; primary rose; peach hero gradients

**Interactions:** URL query navigation; cards → profile.

**Empty State:** Dashed empty message.

**Loading State:** Yes — PageLoading.

**Mobile:** Filter sheet; 1-col grid.

**Component Dependencies:** MarketplaceListing, MarketplaceHeader, VendorCard, MarketplaceFilters

---

## Marketplace Vendor Profile — `/marketplace/[slug]`

**Purpose:** Public vendor detail: cover, packages, portfolio, availability, reviews, quotes.

**Layout:** Marketplace chrome; max-w-6xl.

**Sections:** Cover + identity; sticky section nav; about/packages/portfolio/calendar/reviews/location

**Key UI Elements:** request quote, availability, website; QuoteRequestModal; ReviewFormModal; lightbox

**Design Tokens Used:** Serif H1; text-primary prices; rose gradients

**Interactions:** Scroll spy nav; modals; external website.

**Empty State:** Dashed section placeholders.

**Loading State:** Yes — PageLoading.

**Mobile:** Full-bleed cover; horizontal section nav.

**Component Dependencies:** VendorPublicProfile, QuoteRequestModal, PublicAvailabilityCalendar

---

## Vendor Dashboard — `/vendor/dashboard`

**Purpose:** Vendor portal home: onboarding or stats + recent quote requests.

**Layout:** Vendor sidebar + main; Geist + dash tokens.

**Sections:** Onboarding OR stats (4) + completeness + recent requests

**Key UI Elements:** onboarding form; StatsCard; Progress; request list

**Design Tokens Used:** --dash-ivory, --dash-accent-text, white 16px cards

**Interactions:** Onboarding submit; request row links.

**Empty State:** Dashed recent requests empty.

**Loading State:** Yes — PageLoading.

**Mobile:** Sidebar hidden; header strip only.

**Component Dependencies:** VendorOnboardingForm, StatsGrid, VendorSidebar

---

## Admin Dashboard — `/admin`

**Purpose:** Platform stats, add vendor CTA, publish unpublished vendors.

**Layout:** Admin sidebar + main max-w-7xl; shell #faf8f6.

**Sections:** PageHeader + Add vendor; 5 stat cards; unpublished vendor list

**Key UI Elements:** Add vendor; per-row Publish; StatsCard

**Design Tokens Used:** Admin warm grays #f4f2ef; shield badge #3d3835

**Interactions:** publishVendor + refresh; requireAdmin gate.

**Empty State:** Text when no unpublished vendors.

**Loading State:** Yes — PageLoading.

**Mobile:** Sidebar hidden; stats wrap.

**Component Dependencies:** AdminUnpublishedVendorsList, AdminSidebar, requireAdmin

---

## Profile Page — `/dashboard/profile`

**Purpose:** Account identity, profile edit, password, session, admin link.

**Layout:** Sidebar + stacked SectionCards.

**Sections:** Identity; profile edit; security; session; admin card (if admin)

**Key UI Elements:** name, phone, passwords; save, sign out, copy ID; role badges

**Design Tokens Used:** --dash-accent-text primary; sage success; destructive errors

**Interactions:** Server actions; clipboard copy; redirect if logged out.

**Loading State:** Yes — PageLoading.

**Mobile:** Identity stacks on small screens.

**Component Dependencies:** ProfilePageContent, SectionCard, Avatar, Input

---

## PUBLIC PAGES (redesign consistency)

| Route | Purpose | Tokens |
|-------|---------|--------|
| /gallery/[qr_slug] | Guest photo upload | .evento-public-page, --color-dash-ivory, blush blobs |
| /rsvp/[slug] | Public RSVP flow | Same shell + PublicInvitationTemplate + PublicRsvpFlow |
| /invite/[token] | Collaboration invite | InvitePageShell ivory→blush gradient |

---

## LOADING STATE INDEX

| Route | Style |
|-------|-------|
| Dashboard home, event overview, guests, seating, budget, vendors | Custom shimmer skeletons |
| RSVP, gallery, profile, marketplace, vendor, admin | PageLoading (heart + spinner) |
| Timeline | Minimal pulse blocks |
| Auth | Form pending only |

Global TopLoader on all client navigations.

---

## MOBILE BEHAVIOR SUMMARY

| Area | Desktop | Mobile |
|------|---------|--------|
| Planner dashboard | Sidebar 240px | Top bar + bottom nav + sheet |
| Vendor portal | Sidebar 240px | Sidebar hidden; strip only |
| Admin | Sidebar 240px | Sidebar hidden |
| Marketplace | Full nav | Filter Sheet; nav hidden |
| Guests | Full toolbar | FAB; bulk bar offset |
| Seating | Sidebars visible | Guest drawer; bottom sheet |
| Budget/Vendors | Sticky sidebar | Stacked column |

---

## REDESIGN NOTES

1. Dual fonts: Playfair (public) vs Geist (dashboard) — unify or keep split.
2. Hex drift (#1A0E14, #B8516B) vs CSS vars (--dash-*) — consolidate.
3. Glass morphism + rose borders are core visual language.
4. Primary CTAs: rose gradient #E8748A → #B8516B.
5. All copy in src/lib/i18n/ro.ts.
6. Collaborator permissions show read-only amber banners.

*Generated from Evento source code.*
