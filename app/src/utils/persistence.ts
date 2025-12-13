import type { Scenario } from '@models/scenario'
import { decompressFromEncodedURIComponent } from 'lz-string'
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate'

const STORAGE_KEY = 'life-plan-sim/scenarios'

const coerceScenarioArray = (value: unknown): Scenario[] | null => {
  if (Array.isArray(value)) {
    return value as Scenario[]
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { scenarios?: Scenario[] }).scenarios)
  ) {
    return (value as { scenarios: Scenario[] }).scenarios
  }
  return null
}

export const persistScenariosToStorage = (scenarios: Scenario[]): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

export const loadScenariosFromStorage = (): Scenario[] | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const payload = window.localStorage.getItem(STORAGE_KEY)
  if (!payload) {
    return null
  }
  try {
    return coerceScenarioArray(JSON.parse(payload))
  } catch {
    return null
  }
}

export const downloadScenarioSet = (scenarios: Scenario[]): void => {
  if (typeof document === 'undefined') {
    return
  }
  const blob = new Blob([JSON.stringify(scenarios, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'life-plan-scenarios.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const readScenarioFile = (file: File): Promise<Scenario[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        const scenarios = coerceScenarioArray(data)
        if (!scenarios) {
          reject(new Error('Invalid scenario JSON format'))
          return
        }
        resolve(scenarios)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export const encodeSnapshot = (scenarios: Scenario[]): string => {
  const text = JSON.stringify(scenarios)
  const gz = gzipSync(strToU8(text))
  return `g.${base64UrlEncode(gz)}`
}

export const decodeSnapshot = (snapshot: string): Scenario[] | null => {
  if (!snapshot) {
    return null
  }
  try {
    if (snapshot.startsWith('g.')) {
      const bytes = base64UrlDecode(snapshot.slice(2))
      const inflated = strFromU8(gunzipSync(bytes))
      return coerceScenarioArray(JSON.parse(inflated))
    }
    const inflated = decompressFromEncodedURIComponent(snapshot)
    if (inflated) {
      return coerceScenarioArray(JSON.parse(inflated))
    }
    const json =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? decodeURIComponent(window.atob(snapshot))
        : Buffer.from(snapshot, 'base64').toString('utf-8')
    return coerceScenarioArray(JSON.parse(json))
  } catch {
    return null
  }
}

export const extractSnapshotFromLocation = (): Scenario[] | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const hashEncoded = hashParams.get('s') ?? hashParams.get('snapshot')
  if (hashEncoded) {
    return decodeSnapshot(hashEncoded)
  }
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('s') ?? params.get('snapshot')
  if (!encoded) {
    return null
  }
  return decodeSnapshot(encoded)
}

export const buildSnapshotUrl = (scenarios: Scenario[]): string => {
  if (typeof window === 'undefined') {
    return ''
  }
  const encoded = encodeSnapshot(scenarios)
  const url = new URL(window.location.origin + window.location.pathname)
  url.hash = `s=${encoded}`
  return url.toString()
}

const base64UrlEncode = (bytes: Uint8Array): string => {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = ''
    bytes.forEach((b) => {
      binary += String.fromCharCode(b)
    })
    const b64 = window.btoa(binary)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlDecode = (text: string): Uint8Array => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new Uint8Array(Buffer.from(padded, 'base64'))
}
