import noammProfile from "../assets/noamm-profile.jpg"

export type HomeTab = "links" | "projects" | "extras"

export interface HomeAction {
  href: string
  label: string
  target?: "_blank"
}

export const HOME_PROFILE = {
  imageAlt: "Noamm",
  imageSrc: noammProfile,
  name: "Noamm"
}

export const HOME_INFO_ITEMS = [
  { label: "Age", value: "18" },
  { label: "Pronouns", value: "He/Him" },
  { label: "Location", value: "Israel" }
]

export const HOME_TAGS = [ "Developer", "Weeb", "Gamer" ]

export const HOME_TABS = [
  { value: "links", label: "Links" },
  { value: "projects", label: "Projects" },
  { value: "extras", label: "Extras" }
] satisfies Array<{ value: HomeTab; label: string }>

export const HOME_ACTIONS: Record<HomeTab, HomeAction[]> = {
  links: [
    {
      href: "https://discord.gg/bSNngAdpQF",
      label: "Discord",
      target: "_blank"
    },
    {
      href: "https://github.com/Noamm9",
      label: "GitHub",
      target: "_blank"
    },
    {
      href: "https://www.paypal.com/paypalme/aziz6540",
      label: "PayPal",
      target: "_blank"
    }
  ],
  projects: [
    {
      href: "https://github.com/Noamm9/NoammAddons",
      label: "NoammAddons",
      target: "_blank"
    },
    {
      href: "https://github.com/Noamm9/Noamm-Squared",
      label: "Noamm-Squared",
      target: "_blank"
    },
    {
      href: "https://github.com/Noamm9/NVGRenderer",
      label: "NVGRenderer",
      target: "_blank"
    }
  ],
  extras: [
    {
      href: "https://www.youtube.com/@PanddaBoyy",
      label: "YouTube",
      target: "_blank"
    },
    {
      href: "https://steamcommunity.com/id/207979311",
      label: "Steam",
      target: "_blank"
    },
    {
      label: "NoammAddons Cosmetic Editor",
      href: "/login"
    }
  ]
}