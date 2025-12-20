import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string
}

const SvgIcon = ({ title, children, ...props }: IconProps & { children: React.ReactNode }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export const IconSettings = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
    <path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.4-2.3.5a7 7 0 0 0-1.7-1L14.9 4h-3.8l-.6 2.3a7 7 0 0 0-1.7 1L6.5 7.8l-2 3.4L6.4 12a7.8 7.8 0 0 0 .1 1l-2 1.2 2 3.4 2.3-.5a7 7 0 0 0 1.7 1l.6 2.3h3.8l.6-2.3a7 7 0 0 0 1.7-1l2.3.5 2-3.4L19.4 15z" />
  </SvgIcon>
)

export const IconUsers = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M16 11a4 4 0 1 0-8 0" />
    <path d="M12 12c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5z" />
  </SvgIcon>
)

export const IconHome = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 10v11h14V10" />
    <path d="M9 21v-7h6v7" />
  </SvgIcon>
)

export const IconCar = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M5 16l1-5a3 3 0 0 1 3-2h6a3 3 0 0 1 3 2l1 5" />
    <path d="M4 16h16" />
    <path d="M7 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    <path d="M17 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
  </SvgIcon>
)

export const IconHeartPulse = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M20.8 12.1c0 5.3-8.8 9.9-8.8 9.9S3.2 17.4 3.2 12.1A5 5 0 0 1 8.2 7c1.5 0 2.9.7 3.8 1.8A4.9 4.9 0 0 1 15.8 7a5 5 0 0 1 5 5.1z" />
    <path d="M4.5 12h3l1.5-3 3 6 1.5-3h6" />
  </SvgIcon>
)

export const IconWallet = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    <path d="M2 10h16" />
    <path d="M17 14h2" />
  </SvgIcon>
)

export const IconCalendar = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M7 3v3" />
    <path d="M17 3v3" />
    <path d="M4 7h16" />
    <path d="M5 5h14a2 2 0 0 1 2 2v14H3V7a2 2 0 0 1 2-2z" />
  </SvgIcon>
)

export const IconChart = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M7 14l3-3 3 2 5-6" />
  </SvgIcon>
)

export const IconDownload = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M12 3v10" />
    <path d="M8 10l4 4 4-4" />
    <path d="M4 17v3h16v-3" />
  </SvgIcon>
)

export const IconUpload = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M12 21V11" />
    <path d="M8 14l4-4 4 4" />
    <path d="M4 7V4h16v3" />
  </SvgIcon>
)

export const IconFileJson = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M8.5 12.5c0-.8.7-1.5 1.5-1.5" />
    <path d="M8.5 16.5c0 .8.7 1.5 1.5 1.5" />
    <path d="M15.5 12.5c0-.8-.7-1.5-1.5-1.5" />
    <path d="M15.5 16.5c0 .8-.7 1.5-1.5 1.5" />
  </SvgIcon>
)

export const IconLink = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
    <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
  </SvgIcon>
)

export const IconSparkles = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M12 2l1.2 3.6L17 7l-3.8 1.4L12 12l-1.2-3.6L7 7l3.8-1.4L12 2z" />
    <path d="M19 12l.8 2.4L22 15l-2.2.6L19 18l-.8-2.4L16 15l2.2-.6L19 12z" />
    <path d="M4.8 12l.8 2.4L8 15l-2.4.6L4.8 18 4 15.6 1.6 15 4 14.4 4.8 12z" />
  </SvgIcon>
)

export const IconCheck = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M20 6 9 17l-5-5" />
  </SvgIcon>
)

export const IconClock = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
    <path d="M12 6v6l4 2" />
  </SvgIcon>
)

export const IconShield = (props: IconProps) => (
  <SvgIcon {...props}>
    <path d="M12 2 20 6v6c0 6-4.5 9.5-8 10-3.5-.5-8-4-8-10V6l8-4z" />
    <path d="M9.5 12.5 11 14l3.5-4" />
  </SvgIcon>
)
