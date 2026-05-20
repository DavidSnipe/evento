# Configurare Supabase pentru Evento (Română)

## 1. Fișier `.env.local` (în rădăcina proiectului)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

**Unde găsești valorile:** Supabase Dashboard → **Project Settings** → **API**

- Folosește cheia **`anon` `public`** — NU `service_role`
- Repornește `npm run dev` după ce salvezi fișierul

---

## 2. URL-uri de redirect (obligatoriu)

Supabase Dashboard → **Authentication** → **URL Configuration**

| Câmp | Valoare (local) |
|------|-----------------|
| **Site URL** | `http://localhost:3000` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |

Pentru producție, adaugă și URL-ul Vercel, ex: `https://evento.vercel.app/auth/callback`

---

## 3. Autentificare cu email + parolă

**Authentication** → **Providers** → **Email**

- ✅ **Enable Email provider**
- Pentru dezvoltare rapidă: dezactivează **Confirm email** (utilizatorul intră imediat după înregistrare)
- Pentru producție: lasă **Confirm email** activat — utilizatorul primește link pe email

---

## 4. Autentificare Google

### Pas A — Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com)
2. Creează proiect (sau folosește unul existent)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Tip: **Web application**
5. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - (producție) `https://domeniul-tau.vercel.app`
6. **Authorized redirect URIs** — copiază exact din Supabase:
   - Supabase → **Authentication** → **Providers** → **Google** → vezi **Callback URL**
   - Arată ca: `https://xxxx.supabase.co/auth/v1/callback`

### Pas B — Supabase

1. **Authentication** → **Providers** → **Google**
2. Activează **Enable Google provider**
3. Lipește **Client ID** și **Client Secret** din Google Console
4. Salvează

### Pas C — Test

1. `npm run dev`
2. Mergi la `/login`
3. Apasă **Continuă cu Google**

---

## 5. Tabel evenimente (modul Events)

Rulează migrarea SQL în **SQL Editor**:

Fișier: `supabase/migrations/001_events.sql`

Aceasta creează tabelul `events` cu politici RLS (fiecare utilizator vede doar evenimentele proprii).

### Migrare invitați + mese

Fișier: `supabase/migrations/002_guests_seating.sql`

Creează tabelele `guests` și `seating_tables`, legate de `events`.

---

## 6. Verificare rapidă

| Verificare | Cum |
|------------|-----|
| Env vars | Banner galben pe `/login` dacă lipsesc |
| Email signup | `/signup` → cont nou |
| Email login | `/login` → autentificare |
| Google | Buton Google pe login/signup |
| Protecție rute | `/dashboard` fără login → redirect la `/login` |

---

## Probleme frecvente

**„Invalid API key”** — cheie greșită în `.env.local` sau nu ai repornit serverul.

**Google nu funcționează** — redirect URI din Google trebuie să fie exact callback-ul Supabase, nu `localhost/auth/callback`.

**Email confirm nu merge** — adaugă `http://localhost:3000/auth/callback` la Redirect URLs.

**Cont creat dar nu pot intra** — confirmă emailul sau dezactivează „Confirm email” în Supabase.
