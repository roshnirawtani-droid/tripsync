// Shared Tailwind class strings so every page uses the same Himalayan
// visual language instead of each hand-rolling its own button/card/input
// styles. Plain constants (not components) so native form elements keep
// full control of their own props/handlers.

// Buttons are carved from the Himalayan ice: bright glacier ice for the
// main action, pale frosted ice for the alternative (.btn-glacier / .btn-ice in
// globals.css).
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const button = {
  primary: `${buttonBase} btn-glacier px-5 py-3 text-base`,
  secondary: `${buttonBase} btn-ice px-5 py-3 text-base`,
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
  success: `${buttonBase} btn-glacier px-5 py-3 text-base`,
  chip: (active: boolean) =>
    `rounded-full px-4 py-2 text-sm transition active:scale-[0.97] ${active ? "btn-glacier" : "btn-ice"}`,
};

// Cards float on the page's photo as liquid glass; they set their own dark
// text because the page around them is white-on-photo.
export const card = "glass-surface rounded-3xl bg-white/85 p-5 text-stone-900";

// The card that floats over a full-screen photo: liquid glass (see
// .glass-surface) that stays opaque enough for form text to read crisply.
export const frostedCard = "glass-surface rounded-3xl bg-white/75 p-6";

export const input =
  "w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-sky-500";

export const label = "mb-2 block text-sm font-semibold text-stone-700";

export const pageHeading = "font-display text-2xl font-bold tracking-tight text-white drop-shadow";
export const pageSubheading = "mt-1 text-sm text-white/80";
