import type { Locale } from './presentation'

export const categories = [
  ['community', '社区交流', 'Communities', '论坛与同好交流', 'Forums and conversations'],
  ['gallery', '作品展示', 'Art & Galleries', '插画、摄影与创作', 'Illustration, photography and art'],
  ['literature', '文学阅读', 'Literature', '故事、小说与同人作品', 'Stories, fiction and fan writing'],
  ['resources', '工具资源', 'Tools & Resources', '素材、教程与实用工具', 'Tutorials, assets and practical tools'],
  ['marketplace', '委托交易', 'Commissions & Marketplace', '约稿、制作与市集', 'Commissions, makers and markets'],
  ['knowledge', '资讯百科', 'News & Knowledge', '报道、百科与参考资料', 'News, wikis and references'],
  ['gaming', '游戏互动', 'Games & Interactive', '互动作品与游戏社区', 'Interactive projects and game communities'],
  ['events', '活动组织', 'Events & Organizations', '展会、兽聚与社团', 'Conventions, meetups and groups'],
] as const

export type CategoryCode = (typeof categories)[number][0]

export function categoryName(code: CategoryCode, locale: Locale) {
  return categories.find(([value]) => value === code)![locale === 'zh' ? 1 : 2]
}
