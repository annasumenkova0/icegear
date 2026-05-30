---
name: IceGear Arctic
colors:
  ice-gradient-start: '#F9F9F9'
  ice-gradient-end: '#D7E4EC'
  frost-navy: '#111D23'
  arctic-blue: '#CAE6FF'
  warning-red: '#BA1A1A'
  sale-container: '#FFDAD6'
  glass-border: rgba(17, 29, 35, 0.1)
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1200px
---

## Brand & Style

IceGear Arctic embodies a "Premium Tech-Alpine" aesthetic, blending the clinical precision of high-performance outdoor gear with a sophisticated, modern retail experience. The brand personality is professional, resilient, and cold-weather focused, evoking a sense of reliability in extreme conditions.

The design style is a hybrid of **Glassmorphism** and **Minimalism**. It uses translucent, blurred surfaces to mimic ice and frost, paired with a rigid, high-contrast typographic hierarchy. The visual language emphasizes clarity and technical data (specs, history charts, availability) to appeal to serious adventurers who value both form and function.

## Colors

The palette is rooted in an "Arctic Industrial" theme. The primary **Frost Navy** (#111D23) provides deep, readable contrast against a background of **Ice White** (#F9F9F9). 

- **Primary:** Used for headlines, heavy UI elements, and active states.
- **Secondary:** A muted teal used for soft backgrounds and subtle containers.
- **Tertiary:** A bright, technical blue for accents and secondary indicators.
- **Functional:** Red is reserved for urgent statuses (Sold Out) or price reductions.
- **Gradients:** Use the "Ice Gradient" (135deg from #F9F9F9 to #D7E4EC) to provide subtle depth to full-screen sections or large canvas areas.

## Typography

The system relies exclusively on **Inter** to maintain a utilitarian, Swiss-inspired clarity. 

Hierarchy is established through extreme weight variations. Headlines use Bold (700) or ExtraBold (800) to feel like architectural pillars. Body text remains at Regular (400) for high legibility in dense technical descriptions. Labels and metadata use SemiBold (600) with slight letter spacing to differentiate them from standard body copy. A specialized 10px caption size is utilized for data visualization and micro-labels within charts.

## Layout & Spacing

The system uses a **Fixed Grid** approach for desktop, centering a 1200px container with generous side margins (64px). On mobile, the system transitions to a fluid single-column layout with 16px horizontal margins.

Spacing follows a strict 4px base unit. Internal card padding is typically 24px (lg) to allow the "Glassmorphism" effects breathing room. Section vertical rhythm is controlled by the `xl` (48px) spacing token to create a clean, editorial flow between disparate content types (e.g., Hero to Technical Specs).

## Elevation & Depth

Depth is primarily achieved through **Glassmorphism** and material layering rather than traditional drop shadows.

- **Surface 0 (Background):** Solid #F9F9F9 or the Ice Gradient.
- **Surface 1 (Glass Cards):** White at 70% opacity with a 12px backdrop blur and a subtle 1px border at 10% opacity of the primary color.
- **Surface 2 (Overlays/Floating):** Use a `shadow-lg` for elements like maps or sticky headers that need to pop significantly from the background.
- **Tonal Depth:** Use semi-transparent overlays (e.g., Primary/10%) to indicate interactive areas like map buttons or selected states.

## Shapes

The shape language is highly varied to create visual interest. 
- **Standard Containers:** Use `rounded-xl` (1.5rem) for technical spec blocks and product lists.
- **Hero/Featured Elements:** Use full rounding (`rounded-full`) for central visual anchors like product canvases to create a soft, lens-like focus.
- **Interactive Micro-elements:** Small badges, tags, and status indicators use `rounded-full` for a pill-shaped appearance, contrasting with the structural grid.

## Components

### Buttons & Navigation
- **Top App Bar:** Fixed, translucent glass effect with 70% opacity. Use thin 1px bottom border. Icons should be light-weight (Material Symbols Outlined, wght 200).
- **Action Buttons:** Large rounded pill-shapes with centered icons and labels.

### Cards
- **Glass Card:** The signature container. Must include `backdrop-blur-md` and a thin primary-colored border at low opacity.
- **Availability Card:** Bordered (`outline-variant`) with a white background. Internal layout uses a "Split-Justified" pattern: Left side for location details, right side for stock status.

### Data Visualization
- **Bar Charts:** Vertical bars with `rounded-t-lg`. Use `primary-fixed-dim/40` for historical data and the solid `primary` color for the current/highlighted data point.

### Badges & Tags
- **Status Tags:** Pill-shaped with background colors matching the semantic role (e.g., `tertiary-fixed` for new items, `error-container` for discounts). Text should be `label-sm`.

### Technical Specs
- **Data Rows:** Use a simple horizontal line divider (`on-surface/10`). Key on the left (neutral/variant), value on the right (bold/primary).