# UI Design Specification

This interface follows the design philosophy observed from https://getdesign.md/: design is treated as an executable system, not as decoration. The UI should feel like a precise design artifact rendered from a clear `DESIGN.md`: compact, tokenized, inspection-friendly, and deliberately restrained.

## Core Philosophy

- Build from explicit tokens: colors, spacing, radii, borders, shadows, and motion should be named and reused.
- Prefer a dense workbench over a marketing layout. The first screen is the usable product.
- Use contrast and structure instead of decorative gradients, oversized cards, or ornamental illustration.
- Make every interactive element feel engineered: clear state, tight alignment, predictable hover/focus behavior.
- Keep copy concise and interface-like. Avoid explanatory text that describes obvious controls.

## Visual Language

### Color

- Base canvas: near-black `#08090a`.
- Primary panels: charcoal surfaces from `#0f1113` to `#1b1f22`.
- Borders: low-contrast hairlines, usually `rgba(255,255,255,0.08)`.
- Text: warm off-white for primary text, muted gray for secondary text.
- Accent: electric green `#c7ff4a` for active states, focus rings, range inputs, and selected controls.
- Semantic 3D annotation colors may keep distinct hues, but should be slightly softened so they sit inside the dark system.

### Typography

- Use a modern sans stack for UI text: Geist, Inter, Segoe UI, Arial.
- Use mono text for product labels, status, badges, and technical metadata.
- Keep toolbar and panel text compact: 11-13px for dense controls, 14px only for higher priority labels.
- Letter spacing stays neutral, except for small uppercase mono labels where slight tracking is acceptable.

### Layout

- Treat the app as a workstation: top command bar, left view rail, central viewport, right inspector, bottom status bar.
- Use 4px/8px rhythm for internal spacing.
- Panels should align to a grid and avoid floating decorative card treatment.
- Preserve fixed dimensions for tool buttons and viewport overlays to prevent layout shift.

### Surfaces

- Avoid heavy shadows. Prefer inset borders and subtle surface differences.
- Cards are only for repeated control groups or actual panels. Do not nest cards visually.
- Dropdowns should feel like command palettes: dark, compact, bordered, and high z-index.
- Viewport overlays should be translucent, crisp, and non-distracting.

### Controls

- Buttons: 6px radius, compact padding, text/icon aligned center.
- Active states: green accent background with black text where possible.
- Hover states: brighten the local surface, not the whole region.
- Focus states: visible green ring with a small offset.
- Range inputs and checkboxes use the accent color.
- Color inputs should appear as small swatches.

### Motion

- Motion is functional and short: 140-220ms transitions for hover, focus, menus, and active states.
- Avoid large entrance animations or decorative motion in the workbench UI.

## Implementation Rules

- Define token values in `:root` and consume them in component CSS.
- Keep the 3D canvas as the dominant visual object.
- Do not introduce new visual assets unless they reveal actual product or data state.
- Keep responsive behavior operational: on narrower screens, the inspector may overlay the viewport, but it must remain readable and bounded.
- Verify after changes with build and browser inspection.
