# Design System

All tokens are defined in `src/app/globals.css`. Do not use raw hex values in components
when a token or CSS class already exists. This keeps the design consistent across all AI-generated code.

---

## Color Tokens

| Token                   | Value                    | Usage                            |
|------------------------|--------------------------|----------------------------------|
| `#001A2B`              | nebius-bg                | Page background, TopNav bg       |
| `#0D1117`              | nebius-surface           | Sidebar, cards, input bg         |
| `#1F2937`              | nebius-border            | All borders, dividers            |
| `#6B4EFF`              | brand-primary (purple)   | Primary buttons, active states, slider thumb |
| `#E0FF4F`              | brand-success (yellow-green) | Optimal/recommended highlight, status pulse |
| `rgba(224,255,79,0.15)` | brand-glow              | Glow shadow on recommended card  |
| `#e5e7eb` / gray-200   | Text primary             | Headlines, body                  |
| `gray-400`             | Text secondary           | Labels, descriptions             |
| `gray-500`             | Text muted               | Placeholders, nav section headers|

---

## Component Classes (globals.css)

### `.decision-card`
Glassmorphism card. Use for all metric/comparison panels.
```html
<div class="decision-card">...</div>
```
- Background: `rgba(13,17,23,0.7)` with `backdrop-filter: blur(10px)`
- Border: `1px solid #1F2937`
- Border radius: `12px`
- Padding: `1.5rem`

### `.decision-card.recommended`
Add `recommended` class when this card is the optimal/winning choice.
```html
<div class="decision-card recommended">...</div>
```
- Border becomes `#E0FF4F`
- Box shadow: yellow-green glow

### `.custom-slider`
Styled `<input type="range">`. Always pair with a `font-mono` value display.
```html
<input type="range" class="custom-slider" min="0" max="100" />
```

### `.btn-lift`
Add to any button for hover lift effect.
```html
<button class="bg-[#6B4EFF] ... btn-lift">Action</button>
```

### `.status-pulse`
Inline animated green dot. Use to signal "live" or "active".
```html
<span class="status-pulse"></span>
```

### `.empty-dropzone`
Dashed border empty state. Use when content hasn't loaded or been configured.
```html
<div class="empty-dropzone">...</div>
```

---

## Typography

| Use Case          | Class / Font           | Example                      |
|------------------|----------------------|------------------------------|
| Page title        | `text-2xl font-bold text-white tracking-tight` | "Inferomics" |
| Section heading   | `text-lg font-semibold text-white` | "Optimization Weights" |
| Card title        | `font-semibold text-white`         | "Accuracy"              |
| Body / description| `text-sm text-gray-400`            | Descriptive copy        |
| Muted label       | `text-xs text-gray-500 uppercase tracking-wider` | "OPTIMAL" badge |
| Breadcrumb        | `text-sm text-gray-500 font-mono`  | "Project / Inference"   |
| Numeric values    | `font-mono text-[#E0FF4F]`         | "$0.45 / 1M tokens"     |

---

## Icon Usage
- Library: `lucide-react` only. Do not install other icon libraries.
- Inline icons (within text/buttons): `size={16}`
- Navigation icons (sidebar): `size={18}`
- Hero/empty state icons: `size={32}` or `w-8 h-8` via className

---

## Layout Constraints
- TopNav height: `h-14` (56px) — sticky top-0 z-50
- Sidebar width: `w-[240px]` — fixed, do not change
- Page content: `p-8 max-w-7xl mx-auto`
- Grid: use `grid grid-cols-1 md:grid-cols-3 gap-6` for 3-column card layouts

---

## Dos and Don'ts

**Do:**
- Use existing CSS classes from globals.css
- Use Tailwind utility classes for spacing, layout, and typography
- Use `cn()` (clsx + twMerge) for conditional class logic
- Keep animations subtle — only `btn-lift`, `status-pulse`, `transition-colors` are pre-approved

**Do Not:**
- Add new CSS classes to globals.css without a clear reuse reason
- Use inline `style={{}}` props for colors or typography
- Install new UI libraries (shadcn, radix, etc.) — this is a focused POC
- Change the TopNav or Sidebar structure
- Use colors outside the design token set
