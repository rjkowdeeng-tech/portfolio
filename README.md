# IN.DI.GIT.AL. — Personal Portfolio

The portfolio site of **Ross John Dela Rosa** — a junior developer and AI-assisted builder from the Philippines. A single-page, editorial-style site with custom animations, a neural-network background, and no frameworks or templates.

🔗 **Live:** deployed on [Vercel](https://portfolio-nu-mauve-71.vercel.app/) (project: `portfolio`)

---

## Overview

This is a hand-built single-page site. The front-end is plain **HTML, CSS, and JavaScript** — no build step, no bundler, no framework. The only backend is a single **Vercel serverless function** (`api/contact.js`) that powers the contact form. The site doubles as its own case study: it's both the portfolio and the first project listed in it.

The page is organized into five sections:

| # | Section | What it covers |
|---|-----------|----------------|
| 01 | **Hero** | Name, title, animated ticker, and headline intro |
| 02 | **About** | The journey + the person behind the work |
| — | **Expertise** | Four focus areas: AI Building, Vibe Coding, Automation, Websites |
| 03 | **Projects** | Personal builds and learning experiments |
| 04 | **Process** | A seven-step "how I build" timeline |
| 05 | **Contact** | Channels and a message form |

## Features

- **Neural-network background** — animated canvas of connected nodes (`background-neurons.js`)
- **Rotating neural orb** — a slowly turning constellation in the hero (`neural-orb.js`)
- **Interactive focus cards** — cursor-linked neural connections (`focus-neural.js`)
- **Custom cursor**, preloader, noise overlay, and scroll-reveal animations
- **Accessible by default** — skip link, ARIA attributes, and graceful `noscript` / `prefers-reduced-motion` fallbacks
- **Responsive** with a dedicated mobile nav overlay

## Tech Stack

- **HTML5** — semantic single-page markup (`index.html`)
- **CSS3** — split across `main.css`, `components.css`, and `animations.css`
- **Vanilla JavaScript** — no frameworks
- **Google Fonts** — Instrument Serif, Outfit, Space Grotesk, Space Mono
- **Vercel** — static hosting + serverless function for the contact form
- **Resend** — transactional email API for contact-form delivery

## Project Structure

```
website 2/
├── index.html              # The entire page
├── css/
│   ├── main.css            # Base styles, layout, typography
│   ├── components.css      # Section & component styles
│   └── animations.css      # Keyframes & transitions
├── js/
│   ├── app.js              # Bootstrap, preloader, hero intro
│   ├── interactions.js     # Scroll reveals, nav, form, cursor
│   ├── background-neurons.js  # Animated neural-net backdrop
│   ├── neural-orb.js       # Rotating constellation orb
│   └── focus-neural.js     # Interactive focus-card links
├── static/
│   ├── me.png              # Portrait
│   └── me-original.png
├── api/
│   └── contact.js          # Serverless function: POST /api/contact (sends email via Resend)
├── docs/                   # Design & system reference notes
├── test-email.js           # Local diagnostic for the Resend mailer
├── vercel.json             # Vercel function config
└── README.md
```

## Contact form / email

The contact form POSTs to `/api/contact`, a Vercel serverless function (`api/contact.js`)
that sends the message via the [Resend](https://resend.com) HTTPS API. SMTP isn't used —
Vercel (like many hosts) blocks outbound SMTP, so email goes over HTTPS instead.

Set these environment variables in **Vercel → project → Settings → Environment Variables**:

| Var | Required | Notes |
|-----|----------|-------|
| `RESEND_API_KEY` | yes | From <https://resend.com/api-keys> (starts `re_…`) |
| `CONTACT_TO` | yes | Where messages land. On Resend's free tier (no verified domain) this **must** be the email you signed up to Resend with. |
| `MAIL_FROM` | no | From address. Defaults to `IN.DI.GIT.AL. <onboarding@resend.dev>`. Set to your own once you verify a domain in Resend. |

Spam guard: a hidden honeypot field silently drops bots. (No per-IP rate limiter — an
in-memory one wouldn't persist across serverless invocations; add Upstash/Vercel KV if needed.)

## Running Locally

The front-end is static, so for **layout/visual work** any static server is enough:

```bash
python -m http.server 8000   # then visit http://localhost:8000
# or: npx serve  /  the VS Code Live Server extension
```

To also run the **contact-form function** locally, use the Vercel CLI (it serves the
static files *and* `api/contact.js` together, with env vars pulled from the project):

```bash
npm i -g vercel
vercel env pull        # fetches RESEND_API_KEY, CONTACT_TO, MAIL_FROM into .env.local
npm run dev            # = vercel dev
```

You can also test the Resend path on its own with a local `.env` (see `.env.example`):

```bash
npm run test:email     # = node test-email.js
```

## Deployment

The site is configured for **Vercel**. Pushing to the repository deploys automatically. To deploy manually:

```bash
npm i -g vercel
vercel
```

## Documentation

The `docs/` folder holds the design and quality system notes that guide the build:

- `design-system.md` — visual quality and editorial principles
- `brand-system.md` — brand voice and identity
- `ux-system.md` — user experience guidelines
- `motion.md` — animation and motion language
- `seo-system.md` — SEO conventions
- `review-system.md` / `efficiency.md` — review and performance notes

## Contact

**Ross John Dela Rosa**

- ✉️  [rjkowdeeng@gmail.com](mailto:rjkowdeeng@gmail.com)
- 💼  [LinkedIn](https://www.linkedin.com/in/rjohn2026)
- 🐙  [GitHub](https://github.com/rjkowdeeng-tech)
- 🐦  [@rjkowdeeng](https://twitter.com/rjkowdeeng)

---

© 2026 IN.DI.GIT.AL. · Code & design by Ross John Dela Rosa
