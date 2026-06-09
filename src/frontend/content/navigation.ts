export interface NavigationItem {
    activePaths: string[]
    href: string
    label: string
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
    {
        activePaths: [ "/database" ],
        href: "/database",
        label: "Dashboard"
    },
    {
        activePaths: [ "/login", "/me" ],
        href: "/me",
        label: "Me"
    },
    {
        activePaths: [ "/preview" ],
        href: "/preview",
        label: "Preview"
    }
]
