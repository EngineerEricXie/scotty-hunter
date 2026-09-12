export interface HiddenMenuDish {
  id: string;
  name: string;
  emoji: string;
  dietary: string[];
  note?: string;
}

export interface HiddenMenu {
  eventId: string;
  publicListing: string;
  dishes: HiddenMenuDish[];
  scoutBlurb: string;
}

const MENUS: HiddenMenu[] = [
  {
    eventId: "hackcmu-2026-saturday-lunch",
    publicListing: "Lunch will be provided.",
    scoutBlurb:
      "The listing only said lunch. The table photo shows vegetarian pizza plus salad and fruit.",
    dishes: [
      {
        id: "veg-pizza",
        name: "Vegetarian pizza",
        emoji: "🍕",
        dietary: ["vegetarian"],
        note: "Cheese + veggie, labeled at the tray.",
      },
      {
        id: "pepperoni",
        name: "Pepperoni pizza",
        emoji: "🍕",
        dietary: [],
      },
      {
        id: "greens",
        name: "Mixed greens",
        emoji: "🥗",
        dietary: ["vegetarian", "vegan", "gluten-free"],
      },
      {
        id: "cookies",
        name: "Chocolate chip cookies",
        emoji: "🍪",
        dietary: ["vegetarian"],
      },
      {
        id: "fruit",
        name: "Cut fruit",
        emoji: "🍎",
        dietary: ["vegetarian", "vegan", "gluten-free"],
      },
    ],
  },
  {
    eventId: "hackcmu-2026-saturday-dinner",
    publicListing: "Dinner will be served.",
    scoutBlurb: "Sponsor-expo trays: dumplings, rice, and a vegetarian option the PDF never named.",
    dishes: [
      {
        id: "dumplings",
        name: "Pan-fried dumplings",
        emoji: "🥟",
        dietary: [],
      },
      {
        id: "veg-dumplings",
        name: "Vegetable dumplings",
        emoji: "🥟",
        dietary: ["vegetarian"],
      },
      {
        id: "rice",
        name: "Fried rice tray",
        emoji: "🍚",
        dietary: ["vegetarian"],
      },
      {
        id: "salad",
        name: "Side salad",
        emoji: "🥗",
        dietary: ["vegetarian", "vegan"],
      },
    ],
  },
  {
    eventId: "hackcmu-2026-midnight-cafe",
    publicListing: "Midnight snacks will be provided.",
    scoutBlurb: "Wean Hall after midnight: bagels, coffee, and leftover cookies.",
    dishes: [
      { id: "bagels", name: "Bagels", emoji: "🥯", dietary: ["vegetarian"] },
      { id: "coffee", name: "Coffee urn", emoji: "☕️", dietary: ["vegan"] },
      { id: "midnight-cookies", name: "Midnight cookies", emoji: "🍪", dietary: ["vegetarian"] },
    ],
  },
  {
    eventId: "demo-ri-pizza",
    publicListing: "Free pizza after the talk.",
    scoutBlurb: "RI actually put out cheese pizza and garlic knots, not only pepperoni.",
    dishes: [
      { id: "cheese", name: "Cheese pizza", emoji: "🍕", dietary: ["vegetarian"] },
      { id: "pepperoni", name: "Pepperoni pizza", emoji: "🍕", dietary: [] },
      { id: "knots", name: "Garlic knots", emoji: "🧄", dietary: ["vegetarian"] },
    ],
  },
  {
    eventId: "demo-ai-seminar-lunch",
    publicListing: "Lunch will be provided.",
    scoutBlurb: "Boxed sandwiches with a labeled vegetarian wrap — missing from the calendar copy.",
    dishes: [
      { id: "turkey", name: "Turkey boxed lunch", emoji: "🥪", dietary: [] },
      {
        id: "veg-wrap",
        name: "Vegetarian wrap",
        emoji: "🌯",
        dietary: ["vegetarian"],
      },
      { id: "chips", name: "Chips", emoji: "🥔", dietary: ["vegetarian"] },
      { id: "apple", name: "Whole fruit", emoji: "🍎", dietary: ["vegan", "gluten-free"] },
    ],
  },
  {
    eventId: "demo-tartan-breakfast",
    publicListing: "Breakfast will be provided.",
    scoutBlurb: "Connan put out bagels, fruit, and a coffee urn before 9am.",
    dishes: [
      { id: "bagels", name: "Bagels + cream cheese", emoji: "🥯", dietary: ["vegetarian"] },
      { id: "coffee", name: "Coffee", emoji: "☕️", dietary: ["vegan"] },
      { id: "fruit", name: "Cut fruit", emoji: "🍎", dietary: ["vegan"] },
    ],
  },
  {
    eventId: "demo-cookie-hour",
    publicListing: "Food provided.",
    scoutBlurb: "Three cookie flavors on the Doherty 2210 table.",
    dishes: [
      { id: "choc", name: "Chocolate chip", emoji: "🍪", dietary: ["vegetarian"] },
      { id: "snick", name: "Snickerdoodle", emoji: "🍪", dietary: ["vegetarian"] },
      { id: "oat", name: "Oatmeal raisin", emoji: "🍪", dietary: ["vegetarian"] },
    ],
  },
  {
    eventId: "demo-tepper-reception",
    publicListing: "Catered reception follows.",
    scoutBlurb: "Alumni reception trays: cheese, fruit, and sparkling water.",
    dishes: [
      { id: "cheese", name: "Cheese board", emoji: "🧀", dietary: ["vegetarian"] },
      { id: "fruit", name: "Fruit platter", emoji: "🍇", dietary: ["vegan"] },
      { id: "sparkling", name: "Sparkling water", emoji: "💧", dietary: ["vegan"] },
    ],
  },
  {
    eventId: "demo-wed-veg-pizza",
    publicListing: "Vegetarian pizza will be provided.",
    scoutBlurb: "Confirmed veg pizza plus a small salad the seminar page skipped.",
    dishes: [
      { id: "veg-pizza", name: "Vegetarian pizza", emoji: "🍕", dietary: ["vegetarian"] },
      { id: "salad", name: "Side salad", emoji: "🥗", dietary: ["vegetarian", "vegan"] },
    ],
  },
  {
    eventId: "demo-wed-asian-mixer",
    publicListing: "Asian catering will be served.",
    scoutBlurb: "Networking night trays: dumplings, noodles, and a tofu option.",
    dishes: [
      { id: "dumplings", name: "Dumplings", emoji: "🥟", dietary: [] },
      { id: "noodles", name: "Sesame noodles", emoji: "🍜", dietary: ["vegetarian"] },
      { id: "tofu", name: "Mapo tofu (vegetarian)", emoji: "🍲", dietary: ["vegetarian"] },
    ],
  },
];

const BY_ID: Record<string, HiddenMenu> = Object.fromEntries(
  MENUS.map((menu) => [menu.eventId, menu]),
);

export function getHiddenMenu(eventId: string | null | undefined): HiddenMenu | null {
  if (!eventId) return null;
  return BY_ID[eventId] ?? null;
}

export function hasHiddenMenu(eventId: string | null | undefined): boolean {
  return getHiddenMenu(eventId) !== null;
}

export function hiddenMenuLabels(menu: HiddenMenu): string[] {
  return menu.dishes.map((dish) => dish.name);
}

export function hiddenMenuDietaryTags(menu: HiddenMenu): string[] {
  return [...new Set(menu.dishes.flatMap((dish) => dish.dietary))];
}

export function serializeHiddenMenu(menu: HiddenMenu) {
  return {
    eventId: menu.eventId,
    publicListing: menu.publicListing,
    scoutBlurb: menu.scoutBlurb,
    dishes: menu.dishes,
  };
}
