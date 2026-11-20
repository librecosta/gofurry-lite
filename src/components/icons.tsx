import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut'
import { BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen'
import { CalendarDotsIcon } from '@phosphor-icons/react/dist/ssr/CalendarDots'
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight'
import { CompassIcon } from '@phosphor-icons/react/dist/ssr/Compass'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple'
import { GameControllerIcon } from '@phosphor-icons/react/dist/ssr/GameController'
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo'
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe'
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image'
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass'
import { MoonIcon } from '@phosphor-icons/react/dist/ssr/Moon'
import { NewspaperIcon } from '@phosphor-icons/react/dist/ssr/Newspaper'
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck'
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning'
import { ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag'
import { StackIcon } from '@phosphor-icons/react/dist/ssr/Stack'
import { SunIcon } from '@phosphor-icons/react/dist/ssr/Sun'
import { TranslateIcon } from '@phosphor-icons/react/dist/ssr/Translate'
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users'
import { WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench'
import { XIcon } from '@phosphor-icons/react/dist/ssr/X'
import { XLogoIcon } from '@phosphor-icons/react/dist/ssr/XLogo'

const glyphs = {
  search: MagnifyingGlassIcon,
  users: UsersIcon,
  image: ImageIcon,
  book: BookOpenIcon,
  tool: WrenchIcon,
  bag: ShoppingBagIcon,
  news: NewspaperIcon,
  game: GameControllerIcon,
  calendar: CalendarDotsIcon,
  layers: StackIcon,
  external: ArrowSquareOutIcon,
  arrow: ArrowRightIcon,
  chevron: CaretRightIcon,
  globe: GlobeIcon,
  sun: SunIcon,
  moon: MoonIcon,
  discover: CompassIcon,
  mail: EnvelopeSimpleIcon,
  github: GithubLogoIcon,
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
