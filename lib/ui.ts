// Shared Tailwind class strings so every page uses the same warm, playful
// visual language instead of each hand-rolling its own button/card/input
// styles. Plain constants (not components) so native form elements keep
// full control of their own props/handlers.

export const button = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-teal-600/20 transition active:scale-[0.98] hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border-2 border-stone-200 bg-white px-5 py-3 text-base font-semibold text-stone-700 transition hover:border-teal-300 hover:text-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800",
  success:
    "inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  chip: (active: boolean) =>
    `rounded-full border-2 px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
      active
        ? "border-teal-400 bg-teal-50 text-teal-700"
        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
    }`,
};

export const card = "rounded-3xl border border-stone-200/70 bg-white p-5 shadow-sm shadow-stone-200/50";

export const input =
  "w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-teal-400";

export const label = "mb-2 block text-sm font-semibold text-stone-700";

export const pageHeading = "text-2xl font-bold tracking-tight text-stone-900";
export const pageSubheading = "mt-1 text-sm text-stone-500";
