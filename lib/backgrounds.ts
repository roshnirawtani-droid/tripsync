// Every photo the app shows, in one place: which page uses it and where
// its subject sits (so object-position keeps it in frame on narrow
// screens). All are from Pexels, downloaded into /public rather than
// hotlinked.

export interface Photo {
  src: string;
  alt: string;
  // CSS object-position; keeps the interesting part visible when cropped.
  position: string;
  // Source photo on Pexels, for swapping or re-downloading a larger size.
  pexelsId: string;
}

export const PAGE_BACKGROUNDS = {
  wizard: {
    src: "/bg/wizard-pink-sunset.jpg",
    alt: "Pink sunset clouds over snowy Himalayan peaks and pine trees",
    position: "center 40%",
    pexelsId: "15288601",
  },
  created: {
    src: "/bg/created-ember-cloud.jpg",
    alt: "An orange cloud drifting above a snow-covered ridge at dusk",
    position: "center 60%",
    pexelsId: "14572767",
  },
  join: {
    src: "/bg/join-dusk-valley.jpg",
    alt: "A peach dusk sky over layered mountain valleys",
    position: "center 45%",
    pexelsId: "15276422",
  },
  preferences: {
    src: "/bg/preferences-cedar-road.jpg",
    alt: "A mountain road under tall cedars leading toward snowy peaks",
    position: "center 35%",
    pexelsId: "37078220",
  },
  status: {
    src: "/bg/status-misty-pines.jpg",
    alt: "Mist rolling over a pine forest below cloudy mountains",
    position: "center 55%",
    pexelsId: "7086911",
  },
  options: {
    src: "/bg/options-river-valley.jpg",
    alt: "A river braiding through a green valley under drifting clouds",
    position: "center 55%",
    pexelsId: "22602467",
  },
  optionDetail: {
    src: "/bg/option-paraglider.jpg",
    alt: "A red paraglider soaring over pine trees and snowy mountains",
    position: "center 35%",
    pexelsId: "6149892",
  },
  locked: {
    src: "/bg/locked-sunset-town.jpg",
    alt: "Sunset light on the peaks above Manali town",
    position: "center 40%",
    pexelsId: "32464426",
  },
  chats: {
    src: "/bg/chats-camp-valley.jpg",
    alt: "A green campsite valley between steep cliffs",
    position: "center 45%",
    pexelsId: "12366139",
  },
  help: {
    src: "/bg/help-misty-lookout.jpg",
    alt: "Two friends on a rock looking out over a misty valley",
    position: "center 12%",
    pexelsId: "37547930",
  },
} satisfies Record<string, Photo>;

export type PageBackgroundKey = keyof typeof PAGE_BACKGROUNDS;

// Photo tiles for each destination vibe - used on the landing mood strip
// and the preferences picker, so a vibe looks the same everywhere.
export const VIBE_PHOTOS = {
  mountains: {
    src: "/tiles/mountains-snow-hills.jpg",
    alt: "Snow-covered hills and trees in Manali",
    position: "center",
    pexelsId: "36721863",
  },
  adventure: {
    src: "/tiles/adventure-paraglider.jpg",
    alt: "A paraglider against snowy peaks and blue sky",
    position: "center",
    pexelsId: "4837031",
  },
  nature: {
    src: "/tiles/nature-river.jpg",
    alt: "A river rushing over rocks below the mountains",
    position: "center",
    pexelsId: "15146122",
  },
  spiritual: {
    src: "/tiles/spiritual-prayer-flags.jpg",
    alt: "Prayer flags above a Himalayan valley",
    position: "center 30%",
    pexelsId: "28206557",
  },
  city: {
    src: "/tiles/city-manali-road.jpg",
    alt: "A busy mountain-town road with peaks behind",
    position: "center 78%",
    pexelsId: "18871094",
  },
  beach: {
    src: "/tiles/beach-goa-aerial.jpg",
    alt: "An aerial view of a palm-lined Goa beach",
    position: "center",
    pexelsId: "32262472",
  },
} satisfies Record<string, Photo>;
