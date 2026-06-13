---
name: The Gilded Verdict
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#d0c5b2'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#99907e'
  outline-variant: '#4d4637'
  surface-tint: '#e6c364'
  primary: '#e6c364'
  on-primary: '#3d2e00'
  primary-container: '#c9a84c'
  on-primary-container: '#503d00'
  inverse-primary: '#755b00'
  secondary: '#c2c6db'
  on-secondary: '#2b3040'
  secondary-container: '#414658'
  on-secondary-container: '#b0b4c9'
  tertiary: '#c0c6df'
  on-tertiary: '#293043'
  tertiary-container: '#a4abc3'
  on-tertiary-container: '#383f53'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe08f'
  primary-fixed-dim: '#e6c364'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#584400'
  secondary-fixed: '#dee1f7'
  secondary-fixed-dim: '#c2c6db'
  on-secondary-fixed: '#161b2b'
  on-secondary-fixed-variant: '#414658'
  tertiary-fixed: '#dbe2fb'
  tertiary-fixed-dim: '#bfc6de'
  on-tertiary-fixed: '#141b2d'
  on-tertiary-fixed-variant: '#3f465a'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-rt:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  quote-italic:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '300'
    lineHeight: '1.5'
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  container-max: 1280px
---

## Brand & Style
This design system establishes a digital environment that commands respect, blending the gravity of a physical courtroom with the precision of artificial intelligence. The aesthetic is "Technological Neoclassicism"—a fusion of high-contrast modernism and traditional judicial weight. 

The visual style leans into a refined **Tactile-Minimalism**. It uses deep, atmospheric foundations and high-contrast accents to signify authority. Surface textures are not literal images but are evoked through complex CSS linear and radial gradients that mimic the sheen of polished mahogany and dark marble. The emotional response is one of serious deliberation, clarity, and unyielding objectivity.

## Colors
The palette is rooted in a deep navy foundation, providing a "void" that allows functional elements to emerge with clarity. 

- **Foundation**: The primary background is a deep navy (#0a0f1e). Layered surfaces use a slightly lighter "Midnight Slate" (#161d2f) to create structural depth.
- **Accent**: Gold (#c9a84c) is reserved for "The Gavel"—actions of finality, primary navigation, and high-level branding. It should be treated as a precious metal, used sparingly to maintain its impact.
- **Functional Roles**: The "Advocate" (Green) and "Opposer" (Red) colors are never flat. They are applied as luminous glows and strokes to represent the active presence of opposing forces within the digital chamber.
- **Typography**: Primary text uses a high-contrast Off-White (#f8fafc) to ensure maximum readability against the dark substrate.

## Typography
The typography system utilizes Inter to maintain a modern, systematic feel that balances the "classical" color palette. 

Hierarchy is established through extreme weight variance and letter spacing. Headings are tight and bold to feel like etched inscriptions. Body text maintains a generous line height for legibility during long periods of legal review. Labels and metadata utilize uppercase tracking to evoke the feeling of official document stamping.

## Layout & Spacing
The design system follows a **Fixed-Fluid Hybrid** model. Content is housed within a 12-column grid that centers on large displays but scales to 4 columns on mobile. 

The rhythm is generous; white space (or in this case, "dark space") is used to separate evidence from argument. A 4px baseline grid ensures vertical alignment. Elements like the "Judge's Bench" (the main header) and "The Dock" (sidebars) are pinned to the edges of the viewport to create a sense of architectural enclosure.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Luminous Outlines** rather than traditional drop shadows.

1.  **Base Layer**: #0a0f1e (The Chamber).
2.  **Raised Surfaces**: #161d2f with a 1px border of 10% white (The Lectern).
3.  **Active Elements**: Surfaces gain a subtle inner glow (box-shadow: inset) and a 1px solid border using the accent color (Gold, Green, or Red).
4.  **Shadows**: When used, shadows are "Cold Shadows"—large blur radius (30px+), low opacity (40%), using a navy-tinted black rather than pure grey.

Texture is applied to containers using a CSS background-image gradient: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)`.

## Shapes
The shape language is "Architectural." This design system avoids excessive roundness to maintain a sense of precision and formality. 

Standard components use a 4px (Soft) radius, suggesting the corners of cut stone or polished wood. Large containers like cards or "Evidence Blocks" may use 8px for a slightly more modern feel, but pill-shaped elements are strictly forbidden except for specific toggle states or status indicators.

## Components
- **The Verdict Button (Primary)**: Solid Gold background, black text, with a 2px outer glow of the same color that appears on hover.
- **Advocate/Opposer Chips**: Transparent backgrounds with 1px borders in Green or Red. On active state, the background fills with a 10% opacity version of the functional color.
- **Evidence Cards**: Dark wood texture (diagonal linear gradient), subtle 1px top-border (highlight), and bottom-heavy shadow.
- **The Transcript (List)**: Alternating row backgrounds using #0a0f1e and #111827. Active lines of text are highlighted with a vertical Gold bar on the left margin.
- **Input Fields**: Underline-only style with a Gold focus state to mimic official ledger lines, or fully enclosed boxes with #161d2f backgrounds for modern search inputs.
- **Gavel Toggle**: A custom switch component that uses a sliding Gold square rather than a circle.
