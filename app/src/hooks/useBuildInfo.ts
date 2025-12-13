import { useEffect, useMemo, useState } from 'react'

type RemoteBuildInfo = {
  version?: string
  buildId?: string | null
  builtAt?: string
}

const formatBuildId = (value: string | null | undefined) => {
  if (!value) {
    return ''
  }
  const parts = value.split('-')
  const [maybeRun, ...rest] = parts
  if (maybeRun && /^\d+$/.test(maybeRun) && rest.length) {
    const sha = rest.join('-')
    return `${maybeRun}-${sha.slice(0, 7)}`
  }
  return value.slice(0, 7)
}

const buildLabel = (version: string, buildId: string | null) => {
  if (!buildId) {
    return `v${version}`
  }
  return `v${version}+${formatBuildId(buildId)}`
}

export const useBuildInfo = () => {
  const local = useMemo(() => {
    const buildId = import.meta.env.VITE_BUILD_ID ?? null
    return {
      version: __APP_VERSION__,
      buildId,
      label: buildLabel(__APP_VERSION__, buildId),
    }
  }, [])

  const [remote, setRemote] = useState<RemoteBuildInfo | null>(null)

  useEffect(() => {
    let canceled = false

    const fetchRemote = async () => {
      try {
        const url = `${import.meta.env.BASE_URL}version.json`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) {
          return
        }
        const data = (await res.json()) as RemoteBuildInfo
        if (!canceled) {
          setRemote(data)
        }
      } catch {
        // ignore
      }
    }

    const onFocus = () => void fetchRemote()
    window.addEventListener('focus', onFocus)
    fetchRemote()

    const interval = window.setInterval(fetchRemote, 120_000)
    return () => {
      canceled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const updateAvailable =
    Boolean(local.buildId) && Boolean(remote?.buildId) && local.buildId !== remote?.buildId

  return {
    local,
    remote,
    updateAvailable,
    reload: () => window.location.reload(),
  }
}
