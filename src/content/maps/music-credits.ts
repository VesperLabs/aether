const MATYAS = { author: "Eric Matyas", site: "https://soundimage.org" };

/** Shown in-game: CC-BY needs the credit, and Soundimage requires it inside the game itself. */
export const musicCredits = [
  { title: "Stories of Long Ago", license: "CC-BY 3.0", ...MATYAS },
  { title: "Village Life Was Hard", license: "CC-BY 3.0", ...MATYAS },
  { title: "The Wizard's Concoction", license: "CC-BY 3.0", ...MATYAS },
  { title: "Troubled Forest", license: "CC-BY 4.0", ...MATYAS },
  { title: "Our Mountain_v003", license: "CC-BY 3.0", ...MATYAS },
  { title: "Over Ancient Waters", license: "CC-BY 3.0", ...MATYAS },
  {
    title: "Medieval: Market Day",
    license: "CC0",
    author: "RandomMind",
    site: "https://opengameart.org/content/medieval-market-day",
  },
] as const;
