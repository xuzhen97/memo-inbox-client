# Design System Document: The Editorial Archive

 

## 1. Overview & Creative North Star

The North Star for this design system is **"The Digital Curator."** 

 

Moving away from the frantic, high-density nature of modern productivity tools, this system treats digital information with the reverence of a physical archive or a high-end literary journal. It is a "Desktop-First" experience designed for reflection and deep work. 

 

To break the "SaaS Template" feel, we prioritize **intentional asymmetry** and **tonal depth**. We avoid rigid, boxed-in grids in favor of an organic, "light misty paper" layout where content breathes within **normal spacing**. The interface should feel less like a software application and more like a curated desk where every object is placed with purpose.

 

---

 

## 2. Colors: Tonal Atmosphere

The palette is rooted in nature and ink, moving away from synthetic "digital" colors.

 

### The "No-Line" Rule

**Explicit Instruction:** Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined through:

1.  **Background Color Shifts:** Placing a `surface-container-low` component on a `surface` background.

2.  **Vertical Whitespace:** Using space as a structural element rather than a line.

3.  **Tonal Transitions:** Subtle shifts in container values to denote separation.

 

### Surface Hierarchy & Nesting

Treat the UI as a series of layered, fine-paper sheets. Use the surface tiers to create "nested" depth:

-   **Base Layer (`surface` / `#fcf9f4`):** The primary canvas.

-   **Level 1 (`surface-container-low` / `#f6f3ee`):** Subtle sections or sidebars.

-   **Level 2 (`surface-container` / `#f0ede9`):** Secondary interactive zones.

-   **High Point (`surface-container-lowest` / `#ffffff`):** Reserved for the most important active content (e.g., the current memory being edited).

 

### The "Glass & Gradient" Rule

To add visual "soul," use subtle gradients. For example, a CTA should transition softly from `primary` (`#0d2225`) to `primary-container` (`#23373a`). For floating overlays, apply a **Glassmorphic effect**: use a semi-transparent `surface` color with a `20px` backdrop-blur to allow underlying content to bleed through softly.

 

---

 

## 3. Typography: The Editorial Voice

Typography is the cornerstone of this system. We utilize a high-contrast scale to differentiate between "Reading" and "Utility."

 

*   **Display & Headline (Newsreader):** Use for titles and archival headers. These should feel like a broadsheet newspaper—authoritative yet elegant.

    *   *Headline-LG:* 2rem, Serif.

*   **Title & Body (Manrope):** Use for metadata, navigation, and input. Manrope provides a clean, modern contrast to the serif headings.

    *   *Body-LG:* 1rem, Sans-Serif.

*   **Chinese Typeface Strategy:** Pair a high-quality Songti (serif) for headlines with a clean Heiti (sans-serif) for body text to maintain the "editorial" feel in CJK environments.

 

---

 

## 4. Elevation & Depth: Atmospheric Layering

We reject the heavy drop-shadows of traditional Material Design.

 

### The Layering Principle

Depth is achieved by "stacking." A `surface-container-lowest` card placed atop a `surface-container-low` section provides a natural, soft lift without a single pixel of shadow.

 

### Ambient Shadows

When an element must "float" (e.g., a context menu), use **Ambient Shadows**:

-   **Color:** Tinted with `on-surface` (`#1c1c19`) at 4-6% opacity.

-   **Blur:** Extra-diffused (20px to 40px). 

-   **Offset:** Small Y-offset (4px) to mimic soft overhead studio lighting.

 

### The "Ghost Border" Fallback

If accessibility requires a border, use a **Ghost Border**: `outline-variant` (`#c2c7c8`) at **15% opacity**. Never use 100% opaque borders.

 

---

 

## 5. Components

 

### Buttons

-   **Primary:** `primary` background with `on-primary` text. **Moderately rounded** (`md` scale). No shadow.

-   **Secondary:** `surface-container-high` background. No border.

-   **Tertiary:** Text-only in `primary` with a `Cloud Blue Gray` (#D9E4E8) underline on hover.

 

### Input Fields

-   **Style:** Minimalist. No bottom line or box. Use a subtle `surface-container` background.

-   **Focus:** Transition the background to `Input Focus` (`#D9E4E8`) with a soft glow.

-   **Typography:** Labels use `label-md` in `on-surface-variant`.

 

### Cards & Lists

-   **Separation:** Forbid divider lines. Use `1.5rem` to `2rem` of vertical padding between list items.

-   **Interaction:** On hover, a card should shift from `surface` to `surface-container-low`.

 

### Chips (Tags)

-   **Visuals:** Pill-shaped (`full` roundedness). Use `Moss Green` (#738A72) for "Success/Archived" states and `Warm Amber` (#C9A46A) for "Review" states. Use 10% opacity backgrounds with 100% opacity text for a "tinted" look.

 

### The "Memory Thread" (Custom Component)

Instead of a chat UI, use a vertical "thread" where entries are connected by a faint, 0.5px `outline-variant` dashed line, ending in a `secondary` dot. This feels like a timeline rather than a conversation.

 

---

 

## 6. Do’s and Don’ts

 

### Do:

-   **Embrace the "Empty":** Allow whitespace to be larger than the content it surrounds.

-   **Use Tonal Shifts:** Define layout through color, not lines.

-   **Moderate Rounding:** Use `md` (0.375rem) for most containers to maintain a friendly but professional character.

 

### Don’t:

-   **No "Dashboarditis":** Avoid dense grids of widgets. Show only one primary focus at a time.

-   **No Purple/SaaS Blue:** Avoid the standard "Startup" palette. Stick to the Ink, Mist, and Moss tones.

-   **No Tables:** If data must be shown, use an editorial list or a descriptive card stack instead of a rigid data table.

-   **No Hover "Pop":** Elements shouldn't "pop" out at the user; they should gently "fade" or "shift" into focus.