# DESIGN.md: Inventory Management System (Material 3, Clean)

Simple, calm, data-first. Light theme, blue primary, lots of white space, tonal surfaces instead of heavy shadows. Font: **Google Sans**.

---

## 1. Principles

1. **Clarity over decoration.** One primary action per screen, tables that scan easily.
2. **Tonal surfaces, not borders.** Separate areas with `surface-container-*` levels; use `outline-variant` only for dividers and inputs.
3. **Color means status.** Blue = action, green = healthy stock, yellow = low stock, red = out of stock or error.
4. **Tenant always visible.** The active Organization and sub-account are shown in the top bar on every screen.
5. **Accessible by default.** Every `*` color is paired with its `on-*` color; minimum 4.5:1 text contrast; 48px touch targets.

---

## 2. Color System

```css
:root {
  /* Base */
  --sys-background: #fff;
  --sys-on-background: #1f1f1f;
  --sys-scrim: #000;
  --sys-shadow: #000;

  /* Error */
  --sys-error: #b3261e;
  --sys-on-error: #fff;
  --sys-error-container: #f9dedc;
  --sys-on-error-container: #8c1d18;

  /* Inverse */
  --sys-inverse-on-surface: #f2f2f2;
  --sys-inverse-primary: #a8c7fa;
  --sys-inverse-surface: #303030;

  /* Primary */
  --sys-primary: #0b57d0;
  --sys-on-primary: #fff;
  --sys-primary-container: #d3e3fd;
  --sys-on-primary-container: #0842a0;
  --sys-primary-fixed: #d3e3fd;
  --sys-primary-fixed-dim: #a8c7fa;
  --sys-on-primary-fixed: #041e49;
  --sys-on-primary-fixed-variant: #0842a0;

  /* Secondary */
  --sys-secondary: #00639b;
  --sys-on-secondary: #fff;
  --sys-secondary-container: #c2e7ff;
  --sys-on-secondary-container: #004a77;
  --sys-secondary-fixed: #c2e7ff;
  --sys-secondary-fixed-dim: #7fcfff;
  --sys-on-secondary-fixed: #001d35;
  --sys-on-secondary-fixed-variant: #004a77;

  /* Tertiary */
  --sys-tertiary: #0b57d0;
  --sys-on-tertiary: #fff;
  --sys-tertiary-container: #d3e3fd;
  --sys-on-tertiary-container: #0842a0;
  --sys-tertiary-fixed: #d3e3fd;
  --sys-tertiary-fixed-dim: #a8c7fa;
  --sys-on-tertiary-fixed: #041e49;
  --sys-on-tertiary-fixed-variant: #0842a0;

  /* Surface */
  --sys-surface: #fff;
  --sys-on-surface: #1f1f1f;
  --sys-surface-variant: #e1e3e1;
  --sys-on-surface-variant: #444746;
  --sys-surface-bright: #fff;
  --sys-surface-dim: #d3dbe5;
  --sys-surface-tint: #6991d6;
  --sys-surface-container-lowest: #fff;
  --sys-surface-container-low: #f8fafd;
  --sys-surface-container: #f0f4f9;
  --sys-surface-container-high: #e9eef6;
  --sys-surface-container-highest: #dde3ea;

  /* Outline */
  --sys-outline: #747775;
  --sys-outline-variant: #c4c7c5;

  /* Semantic: status */
  --sys-info: #1157ce;
  --sys-on-info: #fff;
  --sys-info-container: #d0e4ff;
  --sys-on-info-container: #04409f;

  --sys-success: #006c35;
  --sys-on-success: #fff;
  --sys-success-container: #beefbb;
  --sys-on-success-container: #00522c;

  --sys-warning: #8f4e06;
  --sys-on-warning: #fff;
  --sys-warning-container: #ffe07c;
  --sys-on-warning-container: #6d3a01;

  /* Links */
  --sys-link: #1157ce;
  --sys-link-hover: #04409f;
  --sys-link-visited: #7438d2;

  /* Accent palette (charts, tenant badges, categories) */
  --sys-blue: #1157ce;      --sys-on-blue: #fff;   --sys-blue-container: #d0e4ff;   --sys-on-blue-container: #04409f;
  --sys-red: #b3251e;       --sys-on-red: #fff;    --sys-red-container: #ffdadc;    --sys-on-red-container: #8a1a16;
  --sys-yellow: #8f4e06;    --sys-on-yellow: #fff; --sys-yellow-container: #ffe07c; --sys-on-yellow-container: #6d3a01;
  --sys-green: #006c35;     --sys-on-green: #fff;  --sys-green-container: #beefbb;  --sys-on-green-container: #00522c;
  --sys-orange: #9a4600;    --sys-on-orange: #fff; --sys-orange-container: #ffdcc3; --sys-on-orange-container: #753403;
  --sys-pink: #b60d6e;      --sys-on-pink: #fff;   --sys-pink-container: #ffd8ef;   --sys-on-pink-container: #8d0053;
  --sys-purple: #7438d2;    --sys-on-purple: #fff; --sys-purple-container: #eedcfe; --sys-on-purple-container: #5629a4;
  --sys-cyan: #00687c;      --sys-on-cyan: #fff;   --sys-cyan-container: #acedff;   --sys-on-cyan-container: #004e5d;
  --sys-grey: #5e5e5e;      --sys-on-grey: #fff;   --sys-grey-container: #e3e3e3;   --sys-on-grey-container: #474747;

  /* Neutral */
  --sys-neutral-variant20: #2d312f;
  --sys-neutral10: #1f1f1f;
}
```

### Role mapping (where each color is used)

| Role | Tokens | Used for |
|---|---|---|
| Page canvas | `background` | App background |
| Navigation rail / drawer | `surface-container-low` | Left navigation |
| Cards, table container | `surface-container-lowest` on `surface-container-low` page | Content blocks |
| Top app bar | `surface` | Header |
| Filled button | `primary` / `on-primary` | Primary action (Add product) |
| Tonal button | `secondary-container` / `on-secondary-container` | Secondary action (Transfer, Export) |
| Selected nav item, chips | `primary-container` / `on-primary-container` | Active state |
| Input outline | `outline` (focus: `primary`) | Text fields |
| Dividers | `outline-variant` | Table rows, sections |
| Secondary text | `on-surface-variant` | Labels, helper text |
| Table header row | `surface-container` | Column headings |
| Row hover | `surface-container-low` | Interaction |
| Snackbar | `inverse-surface` / `inverse-on-surface` | Feedback toast |
| Dialog scrim | `scrim` at 32% | Modals |

### Stock status colors

| Status | Rule | Container | Text |
|---|---|---|---|
| In stock | `qty > reorderLevel` | `success-container` | `on-success-container` |
| Low stock | `0 < qty <= reorderLevel` | `warning-container` | `on-warning-container` |
| Out of stock | `qty = 0` | `error-container` | `on-error-container` |
| Transfer pending | n/a | `info-container` | `on-info-container` |
| Archived | n/a | `grey-container` | `on-grey-container` |

Tenant badges cycle through the accent palette (`blue`, `purple`, `cyan`, `orange`, `pink`, `green`) so each sub-account has a recognizable color. Never use accent colors for status.

---

## 3. Typography: Google Sans

```css
:root {
  --font-brand: "Google Sans", "Google Sans Text", "Product Sans", Roboto, "Segoe UI", Arial, sans-serif;
  --font-mono: "Google Sans Code", "Roboto Mono", ui-monospace, Consolas, monospace; /* SKUs, IDs */
}
body { font-family: var(--font-brand); color: var(--sys-on-surface); background: var(--sys-background); }
```

> Check Google Sans licensing and availability for your deployment. The fallback stack keeps the layout intact if it is unavailable.

| Role | Size / Line | Weight | Use |
|---|---|---|---|
| Display small | 36 / 44 | 400 | Big KPI numbers |
| Headline medium | 28 / 36 | 400 | Page title |
| Headline small | 24 / 32 | 400 | Section title |
| Title large | 22 / 28 | 400 | Dialog title |
| Title medium | 16 / 24 | 500 | Card title, table header |
| Body large | 16 / 24 | 400 | Main text |
| Body medium | 14 / 20 | 400 | Table cells, forms |
| Label large | 14 / 20 | 500 | Buttons, tabs |
| Label medium | 12 / 16 | 500 | Chips, badges |
| Label small | 11 / 16 | 500 | Captions |

SKUs, IDs, and quantities use tabular numbers: `font-variant-numeric: tabular-nums;`.

---

## 4. Shape, Elevation, Spacing, Motion

**Shape (corner radius)**

| Token | Value | Use |
|---|---|---|
| `--shape-xs` | 4px | Table cells, tooltips |
| `--shape-sm` | 8px | Chips, snackbars |
| `--shape-md` | 12px | Cards, inputs |
| `--shape-lg` | 16px | Dialogs, sheets |
| `--shape-xl` | 28px | Large dialogs |
| `--shape-full` | 999px | Buttons, badges, search bar |

**Elevation.** Prefer tonal color. Shadows only where floating:
- Level 0: cards and tables (tonal only)
- Level 1: `0 1px 2px rgb(0 0 0 / 0.30), 0 1px 3px 1px rgb(0 0 0 / 0.15)` for menus and the sticky header on scroll
- Level 3: `0 4px 8px 3px rgb(0 0 0 / 0.15), 0 1px 3px rgb(0 0 0 / 0.30)` for dialogs and the FAB

**Spacing (4px grid):** 4, 8, 12, 16, 24, 32, 48. Page padding 24px (16px on mobile). Card padding 16-24px. Gap between cards 16px.

**State layers:** hover 8%, focus 10%, pressed 10% of `on-surface` (or `on-primary` on filled buttons). Focus ring: 2px `primary`.

**Motion:** 200ms standard easing `cubic-bezier(0.2, 0, 0, 1)`. Only fade or slide short distances. Respect `prefers-reduced-motion`.

---

## 5. Layout

### Breakpoints (M3 window size classes)

| Class | Width | Navigation | Content |
|---|---|---|---|
| Compact | < 600px | Bottom navigation bar | Single column, cards instead of table |
| Medium | 600-839px | Navigation rail (80px) | 8-column grid |
| Expanded | 840-1199px | Navigation rail | 12-column grid |
| Large | >= 1200px | Navigation drawer (280px) | 12-column grid, max content width 1440px |

### App shell

```
┌──────────────────────────────────────────────────────────────────────┐
│ TOP APP BAR (64px)                                                   │
│ [≡] Inventory   [ Acme Corp ▸ Hyderabad Warehouse ▾ ]  [ Search… ]  │
│                                             [🔔] [Help] [Avatar ▾]   │
├──────────┬───────────────────────────────────────────────────────────┤
│ NAV      │  PAGE HEADER                                              │
│ DRAWER   │  Inventory                          [Export] [+ Add product]
│          │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│ Dashboard│  │ Items  │ │ Units  │ │ Low    │ │ Out of │  KPI cards   │
│ Inventory│  └────────┘ └────────┘ └────────┘ └────────┘              │
│ Transfers│  [Search] [Category ▾] [Status ▾]           (filter row)   │
│ Movements│  ┌──────────────────────────────────────────────────────┐ │
│ Files    │  │ SKU │ Name │ Category │ Qty │ Status │ Price │ ⋮     │ │
│ Reports  │  │ ─────────────────────────────────────────────────    │ │
│ ──────── │  │ …rows…                                               │ │
│ Settings │  └──────────────────────────────────────────────────────┘ │
│ Members  │  Rows per page 25 ▾              1-25 of 312   ‹  ›      │
└──────────┴───────────────────────────────────────────────────────────┘
```

**Top app bar.** White (`surface`), 64px, level 0 (level 1 when scrolled). The **tenant switcher** is a full-radius button on `surface-container` showing a colored dot, the organization name, and the sub-account name. It opens a menu grouped by organization, one row per sub-account, with the current one checked. OrgAdmins also see an "All locations" item at the top.

**Navigation.** Items are 56px tall, full-radius. The active item uses `primary-container` with `on-primary-container` text and a filled icon. Items: Dashboard, Inventory, Transfers, Movements, Files, Reports (OrgAdmin only), Settings, Members.

**Content area.** `surface-container-low` background; cards and tables are `surface-container-lowest` with 12px radius and no shadow.

---

## 6. Screens

### 6.1 Login (multi-auth)
Centered card, 400px wide, `surface` with 28px radius on a `surface-container-low` page.
- Logo and title "Sign in"
- Outlined buttons: **Continue with Google**, **Continue with Microsoft**
- "or" divider
- Email + password fields, filled **Sign in** button
- Link: "Use a one-time code instead"
- MFA step: 6-digit code input, "Trust this device" checkbox

### 6.2 Choose sub-account
After login, a list of organization sections. Each sub-account is a card with a tenant-colored avatar, name, type chip (Warehouse / Store / Branch), and role chip. One click opens that tenant.

### 6.3 Dashboard
- Row of 4 KPI cards: Total items, Total units, Low stock, Out of stock. Each shows a Display-small number, a label, and a status color on the icon only.
- Two cards below: **Low-stock list** (top 5, with a "Reorder" text button) and **Recent movements** (timeline).
- OrgAdmin "All locations" mode adds a stacked bar of stock by sub-account, using the accent palette.

### 6.4 Inventory list
- Page header with title, **Export** (tonal), **+ Add product** (filled).
- Filter row: search field (full radius, `surface-container`), Category, Status filter chips.
- Table: header row on `surface-container`, 52px rows, `outline-variant` dividers, hover with state layer. Columns: SKU (mono), Name (with thumbnail), Category, Qty (right aligned), Status chip, Price (right aligned), row menu (Edit, Adjust stock, Transfer, Archive).
- Bulk select shows a contextual bar in `secondary-container` replacing the filter row.
- Compact screens: each row becomes a card with name, SKU, quantity, and status chip.

### 6.5 Product detail (side sheet, 480px, or full page on mobile)
Image with upload, fields (SKU, name, category, quantity, reorder level, price, supplier cost), tabs for **Details / Movements / Files**. Footer: Cancel (text) and Save (filled). Supplier cost is masked until the user re-enters MFA when step-up is required.

### 6.6 Stock adjustment (dialog, 28px radius)
Product name, current quantity, +/- segmented control, quantity field, reason select, note. Buttons: Cancel and Apply.

### 6.7 Transfers
Tabs: **Incoming / Outgoing / History**. Table with From, To, SKU, Qty, Status chip (`info-container` pending, `success-container` completed, `error-container` rejected). Managers see Approve and Reject text buttons. "New transfer" is a dialog: destination sub-account (same organization only), product, quantity.

### 6.8 Members and roles
Table of users with role chips (Staff, Manager, OrgAdmin), an invite button, and an MFA-enabled indicator.

---

## 7. Components

| Component | Spec |
|---|---|
| Filled button | 40px, full radius, `primary` / `on-primary`, Label large |
| Tonal button | 40px, `secondary-container` / `on-secondary-container` |
| Outlined button | 40px, 1px `outline`, `primary` text |
| Text button | 40px, `primary` text, no container |
| FAB (mobile) | 56px, `primary-container`, level 3, "Add product" |
| Text field | Outlined, 56px, 12px radius, `outline`; focus 2px `primary`; error uses `error` and helper text |
| Search bar | 48px, full radius, `surface-container`, leading icon |
| Chip (status) | 24px, full radius, container / on-container pair, Label medium |
| Filter chip | 32px, 8px radius, selected uses `secondary-container` |
| Card | `surface-container-lowest`, 12px radius, 16-24px padding |
| Data table | 52px rows, `surface-container` header, sticky header |
| Dialog | `surface-container-high`, 28px radius, max 560px, scrim 32% |
| Snackbar | `inverse-surface`, 8px radius, text `inverse-on-surface`, action `inverse-primary` |
| Tabs | 48px, active label `primary` with a 3px indicator |
| Badge (tenant) | Accent container with matching on-container text |

---

## 8. Tenant and security cues in the UI

- The tenant switcher is always in the top bar. On switch, show a brief progress bar and clear all lists before loading the new tenant's data (no stale rows).
- OrgAdmin "All locations" mode shows a `secondary-container` banner: "Viewing all locations (read-only)".
- Error pages: 404 for records outside the current tenant (never "forbidden"), so existence isn't revealed.
- Session expiry opens a sign-in dialog rather than losing form data.

---

## 9. Empty, loading, and error states

- **Empty:** centered 96px illustration or icon in `primary-container`, Title medium, one sentence, one filled button ("Add your first product").
- **Loading:** skeleton rows in `surface-container-high`; no full-page spinners.
- **Error:** `error-container` banner with a retry text button.
- **Success:** snackbar for 4 seconds with an Undo action where possible.

---

## 10. Accessibility checklist

- Text on containers uses the paired `on-*` token only.
- Status is never color alone: chips include a text label and an icon.
- All controls are keyboard reachable with a visible focus ring; dialog focus is trapped.
- Touch targets are at least 48px.
- Tables use proper `<th scope>`; icon buttons have `aria-label`.
- Numbers are right aligned and use tabular figures.

---

## 11. Implementation notes (React)

- Use `@material/web` components or MUI with a custom theme mapped to the `--sys-*` variables above.
- Keep tokens in a single `tokens.css`; reference them everywhere with `var(--sys-…)`.
- Icons: Material Symbols Outlined (weight 400, filled for active states).
- Query keys include the tenant ID: `['inventory', tenantId, filters]`.
