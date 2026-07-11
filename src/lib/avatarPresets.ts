// Static preset avatar catalog. Files live in /public/avatar-presets/ (served as
// plain static assets — no backend/API involvement for presets, see AvatarPicker).
// Girls listed first, then boys, per product decision.
export type AvatarPreset = {
  key: string
  label: string
  url: string
  thumbUrl: string
}

const PRESET_KEYS_ORDERED = [
  'preset-1', 'preset-2', 'preset-3', 'preset-4', 'preset-5', 'preset-6', 'preset-7',
  'preset-8', 'preset-9', 'preset-10', 'preset-11', 'preset-12', 'preset-13',
] as const

export const AVATAR_PRESETS: AvatarPreset[] = PRESET_KEYS_ORDERED.map((key, i) => ({
  key,
  label: `Avatar ${i + 1}`,
  url: `/avatar-presets/${key}.webp`,
  thumbUrl: `/avatar-presets/${key}_thumb.webp`,
}))

export function resolvePresetAvatar(key: string | null | undefined): AvatarPreset | undefined {
  if (!key) return undefined
  return AVATAR_PRESETS.find((p) => p.key === key)
}
