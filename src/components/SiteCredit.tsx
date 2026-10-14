interface SiteCreditProps {
  className?: string
}

export function SiteCredit({ className = "" }: SiteCreditProps) {
  return <p className={ `site-credit ${ className }` }>Made by Xenus</p>
}