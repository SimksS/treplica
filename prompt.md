Create a dark-themed, scroll-driven product landing page for a premium tech product (XR/AR glasses). The design should be cinematic, minimal, and immersive — inspired by Apple-level product storytelling. Use Next.js 14 with Tailwind CSS. All animations should use Lenis for smooth scroll and GSAP ScrollTrigger for scroll-based reveals.

---

## 🎨 Visual Identity

- Background: pure black (#000000)
- Text: white (#FFFFFF) with occasional muted gray (#888888) for subtitles
- Accent: electric white glow effects, subtle blue/purple gradient glows on key product moments
- Typography: large, bold, display-level headings (use "Inter" or "Syne" from Google Fonts). Letter-spacing tight on big titles. Mix of italic and uppercase styles.
- No borders. No cards with radius. Everything floats in black space.
- Buttons: white outlined with hover fill transition, or solid white with black text.

---

## 📐 Layout & Sections (in order)

### 1. HERO SECTION
- Full-screen dark background with a large product image (glasses) centered
- Big bold heading split into two lines, one in normal weight, one in italic
- Subtitle: small, spaced uppercase label above the title (e.g., "LUMA SERIES")
- Smooth entrance animation: heading slides up on load, image fades in
- No CTA button on hero — purely visual impact

### 2. FEATURE HIGHLIGHT — DISPLAY
- Full-width dark section
- Left side: large stat number (e.g., "1200p") with label below
- Right side: looping background video (use a `<video autoPlay muted loop playsInline>` tag with a dark overlay)
- Three sub-features listed with icon + title + description, revealed one by one on scroll
- Section heading: "A 4K-Like Display / You'll Never Forget" — large, centered, revealed character by character (GSAP SplitText or manual span technique)

### 3. PRODUCT IMAGE FEATURE — FULL WIDTH
- Section with a full-bleed image of the glasses from below/side
- Overlaid text: "Pioneering Sony's / Newest Innovation" — large white text with a gradient highlight on one word
- Four specs listed in a horizontal row below with icon + value + label:
  - "Sharper Than Ever" / "Bright Visuals: Up to 1500 nits" / "DeltaE < 2" / "Up to -6.0D Myopia Adjustment"

### 4. AUDIO SECTION
- Full-screen dark section with centered text
- Heading: "Next-Gen Audio / Powered by HARMAN"
- Background: abstract dark wave animation (CSS or canvas, not an image)
- Smooth parallax scroll effect on the heading

### 5. SCROLL-TRIGGERED COUNTER
- "46° Field Of View" — the number counts up from 0 when scrolled into view
- Tagline below: "15% Larger Than Previous Gen"
- Minimal, centered, nothing else on screen

### 6. FLEXIBILITY FEATURES — SCROLL TABS
- Horizontal sticky section (pin on scroll) with 3 items switching on scroll:
  1. Electrochromic Film (video loop)
  2. Myopia Adjustment (image + text)
  3. Anti-Reflective Lens (image + CTA)
- Each item: left side description, right side media
- Progress bar at the top indicating current step

### 7. LIGHT EFFECTS / DYNAMIC LED SECTION
- 6 interactive buttons (Power On, Take Off, Tune Up, Tune Down, 3D Switch, Electrochromic)
- Each button swaps a centered product video to show the corresponding LED animation
- Active button: white text + bottom border
- Inactive: muted gray

### 8. SOFTWARE / SPACEWALKER SECTION
- Dark section with two large media panels side by side
- Left: static screenshot or illustration
- Right: looping video of software interface
- Sub-feature callout: "World's First Real-Time 2D-to-3D Conversion"
- Subtle "want more?" CTA linking to a different product

### 9. MARQUEE / GAME IMAGES
- Auto-scrolling horizontal ticker (infinite loop) with game screenshots
- Use CSS `animation: marquee linear infinite` — no JS needed
- Two rows scrolling in opposite directions for visual depth

### 10. COMPATIBILITY GRID
- 5 platform blocks in a horizontal row:
  - Android & iOS / Remote Play / Cloud Gaming / Switch 2 / Mac & Windows
- Each block: platform icons + label + "Learn More" link
- Subtle hover: white border appears

### 11. PRODUCT SELECTOR — 3 VARIANTS
- Three product cards side by side:
  - Luma ($399 — Essential)
  - Luma Pro ($499 — All-Around)
  - Luma Ultra ($599 — Power Users)
- Each card: product image, name, price badge, short description, "Order Now" button
- Middle card ("Pro") is slightly larger/highlighted by default
- Cards animate in from below on scroll

### 12. PARTNER LOGOS
- Dark section with heading: "Proudly Partnering With Leading Innovators"
- Logos: NVIDIA, Stanford, Harvard, Bertelsmann (use placeholder SVG icons if needed)
- Fade-in stagger animation

### 13. FINAL CTA
- Full-screen dark section
- Bold centered headline: "Your Perfect Pick Awaits"
- Two buttons: "Order Now" (white filled) + "Compare Models" (outlined)
- Background: subtle dark gradient or particle effect

---

## ⚙️ Technical Requirements

- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Smooth scroll: Lenis (`@studio-freight/lenis`)
- Scroll animations: GSAP + ScrollTrigger
- Video: native HTML5 `<video>` tags, no external players
- All sections must be full-width (`w-full`) and section-level (`<section>`)
- Responsive: mobile-first, but the desktop version is the hero experience
- No third-party UI libraries (no shadcn, no MUI) — raw Tailwind only
- Font: Google Fonts — "Syne" for headings, "Inter" for body

---

## 📁 Suggested File Structure

/app
  /page.tsx              ← Main landing page
  /layout.tsx            ← Lenis smooth scroll provider
/components
  /sections
    Hero.tsx
    DisplaySection.tsx
    AudioSection.tsx
    FovCounter.tsx
    FlexibilityScroll.tsx
    LightEffects.tsx
    SoftwareSection.tsx
    Marquee.tsx
    Compatibility.tsx
    ProductSelector.tsx
    Partners.tsx
    FinalCTA.tsx
  /ui
    Button.tsx
    VideoBlock.tsx
    StatCard.tsx

---

## 🧠 Tone & Copy Direction

Use cinematic, confident product copy. Short phrases. Impact over explanation.
Examples:
- "Illuminate Your Victory"
- "The Brightest. The Sharpest. The Best."
- "Built for those who refuse to settle."

Replace all VITURE-specific product names and specs with your own product placeholder data.