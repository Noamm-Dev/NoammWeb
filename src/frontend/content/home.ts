import noammProfile from "../assets/noamm-profile.jpg"

const birthDay = new Date(2007, 7, 26) // month starts from 0. aka 0-11

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age --

  return age
}

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
  { label: "Age", value: String(calculateAge(birthDay)) },
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
      href: "https://ko-fi.com/noamm",
      label: "Ko-Fi",
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
      href: "https://github.com/Noamm9/PackDisabler",
      label: "PackDisabler",
      target: "_blank"
    },
    {
      href: "https://codeberg.org/MicrocontrollersDev/Better-Screens",
      label: "BetterScreens",
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
      label: "NoammAddons Cosmetic Editor",
      href: "/login"
    },
    {
      href: "https://www.youtube.com/@PanddaBoyy",
      label: "YouTube Channel",
      target: "_blank"
    },
    {
      href: "https://steamcommunity.com/id/207979311",
      label: "Steam Profile",
      target: "_blank"
    }
  ]
}