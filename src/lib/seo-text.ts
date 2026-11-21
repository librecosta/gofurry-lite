import { localized, type Copy, type Locale } from './presentation'

const entities: Record<string, string> = {
  amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ',
}

const siteDescriptions: Partial<Record<number, Record<Locale, string>>> = {
  316: {
    en: 'The archived ChatFurry profile describes public chat rooms, private messages, and topic-based discussion for the furry community.',
    zh: 'ChatFurry 的历史资料介绍了面向兽圈的公共聊天室、私信和按主题划分的讨论空间。',
  },
  333: {
    en: 'The Furbox archive describes a furry social platform with art and fursuit photo sharing, events, maps, and a creator marketplace.',
    zh: 'Furbox 的历史资料记载了兽圈动态、艺术与兽装照片分享、活动日历、地图及创作者市集。',
  },
}

const gameDescriptions: Partial<Record<number, Partial<Record<Locale, string>>>> = {
  124: {
    zh: '艾斯在三千多年后醒来，与玩家一起探索蓝星的地下城市，寻找失散的伙伴，并解开有关星之子的谜团。',
    en: 'ASTELL wakes more than three thousand years later in an underground city. Explore Bluestar, find a missing companion, and uncover the history of the Son of the Star.',
  },
  146: {
    zh: '《逃出从此以后：入职培训》是完整游戏的序章，收录第一章。你将扮演初入职场的童话主角，在试图接管童话世界的巨型企业内展开冒险。',
  },
  258: {
    zh: '《None Shall Intrude: Descent》是《不容进犯》的免费序章。你将扮演突袭首领，在地块战场上用卡组与前来挑战的英雄交战。',
  },
  297: {
    zh: '在《鳄鱼侦探布罗格》的序章中，动物取代人类的世界成为侦探故事的舞台。游戏把点击式冒险与横版格斗、角色扮演相结合。',
  },
}

export function cleanMetadataText(value: string) {
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match
    const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ' '
  }).replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/[\p{Cc}\p{White_Space}]+/gu, ' ').trim()
}

export function detailDescription(kind: string, record: Copy & { id: number }, locale: Locale) {
  const curated = kind === 'site' ? siteDescriptions[record.id] : kind === 'game' ? gameDescriptions[record.id] : undefined
  if (curated?.[locale]) return curated[locale]

  const description = cleanMetadataText(localized(record.description, locale))
  if (kind === 'site' && [233, 234, 235].includes(record.id)) {
    const name = cleanMetadataText(localized(record.title, locale))
    return locale === 'zh' ? `${name} 是 e621 的第三方搜索工具。` : `${name} is a third-party search tool for e621.`
  }
  if (!description) return cleanMetadataText(localized(record.title, locale))
  const limit = locale === 'zh' ? 115 : 185
  if (description.length <= limit) return description

  let complete = ''
  for (const { segment } of new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(description)) {
    if ((complete + segment.trimEnd()).length > limit) break
    complete += segment
  }
  if (complete) return complete.trimEnd()
  const prefix = [...description].slice(0, limit - 1).join('')
  return (locale === 'en' && prefix.includes(' ') ? prefix.slice(0, prefix.lastIndexOf(' ')) : prefix) + '…'
}
