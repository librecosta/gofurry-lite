import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut'
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check'
import { CompassIcon } from '@phosphor-icons/react/dist/ssr/Compass'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple'
import { GameControllerIcon } from '@phosphor-icons/react/dist/ssr/GameController'
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo'
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe'
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image'
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass'
import { MoonIcon } from '@phosphor-icons/react/dist/ssr/Moon'
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck'
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning'
import { SlidersHorizontalIcon } from '@phosphor-icons/react/dist/ssr/SlidersHorizontal'
import { StackIcon } from '@phosphor-icons/react/dist/ssr/Stack'
import { SteamLogoIcon } from '@phosphor-icons/react/dist/ssr/SteamLogo'
import { SunIcon } from '@phosphor-icons/react/dist/ssr/Sun'
import { TranslateIcon } from '@phosphor-icons/react/dist/ssr/Translate'
import { XIcon } from '@phosphor-icons/react/dist/ssr/X'
import { XLogoIcon } from '@phosphor-icons/react/dist/ssr/XLogo'

const glyphs = {
  search: MagnifyingGlassIcon,
  image: ImageIcon,
  game: GameControllerIcon,
  filter: SlidersHorizontalIcon,
  layers: StackIcon,
  external: ArrowSquareOutIcon,
  arrow: ArrowRightIcon,
  chevron: CaretRightIcon,
  check: CheckIcon,
  globe: GlobeIcon,
  sun: SunIcon,
  moon: MoonIcon,
  discover: CompassIcon,
  mail: EnvelopeSimpleIcon,
  github: GithubLogoIcon,
  steam: SteamLogoIcon,
  'x-logo': XLogoIcon,
  language: TranslateIcon,
  safe: ShieldCheckIcon,
  adult: ShieldWarningIcon,
  menu: ListIcon,
  close: XIcon,
} as const

export type Glyph = keyof typeof glyphs

export function Icon({ name, size = 18 }: { name: Glyph; size?: number }) {
  const PhosphorIcon = glyphs[name]
  return <PhosphorIcon size={size} weight="regular" aria-hidden="true" focusable="false" />
}
