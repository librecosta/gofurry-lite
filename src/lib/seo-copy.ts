import type { CategoryCode } from './categories.ts'
import type { Copy, Translation } from './presentation.ts'

export const landingMetadata = {
  '/': {
    title: {
      en: 'GoFurry Lite — Furry Websites, Communities & Games',
      zh: 'GoFurry Lite — 兽圈导航、兽人游戏与福瑞资源',
    },
    description: {
      en: 'Explore furry websites, art galleries, online communities, conventions, fursuit makers, creative resources, and furry games in one curated directory.',
      zh: '探索兽圈社区、兽人艺术、同人文学、兽装工作室、兽展活动与独立兽游，通过分类导航和游戏合集发现值得访问的网站与作品。',
    },
  },
  '/games': {
    title: {
      en: 'Furry Games Directory — Indie Games & Visual Novels | GoFurry Lite',
      zh: '兽游目录 — 兽人游戏、视觉小说与独立作品 | GoFurry Lite',
    },
    description: {
      en: 'Browse furry-themed games, visual novels, RPGs, and interactive works. Explore genres, species tags, archived game profiles, screenshots, trailers, and Steam links.',
      zh: '浏览兽人主题游戏、视觉小说、角色扮演与独立作品，通过玩法和物种标签筛选，查看游戏介绍、截图、宣传片及 Steam 商店入口。',
    },
  },
  '/games/collections': {
    title: {
      en: 'Furry Game Collections | GoFurry Lite',
      zh: '兽游合集 — 按玩法与主题发现游戏 | GoFurry Lite',
    },
    description: {
      en: 'Explore curated furry game collections by genre, gameplay, and theme. Discover visual novels, adventures, and other selections from the archived GoFurry catalogue.',
      zh: '按玩法、题材与游戏类型浏览兽游合集，发现兽人视觉小说、冒险、策略与更多相关作品，前往游戏详情查看历史资料。',
    },
  },
  '/site-groups': {
    title: {
      en: 'Original GoFurry Website Groups | GoFurry Lite',
      zh: 'GoFurry 旧站历史分组 | GoFurry Lite',
    },
    description: {
      en: 'Browse historical website groups preserved from the original GoFurry directory, including furry communities, art, games, resources, and related projects.',
      zh: '浏览原 GoFurry 导航站保留的历史网站分组，查找兽圈社区、艺术创作、游戏互动及各类相关项目的原始分类资料。',
    },
  },
  '/updates': {
    title: {
      en: 'GoFurry Release Notes Archive | GoFurry Lite',
      zh: 'GoFurry 历史更新日志 | GoFurry Lite',
    },
    description: {
      en: 'Read archived GoFurry release notes, version histories, and public announcements to revisit the development and changes of the original furry directory.',
      zh: '阅读原 GoFurry 导航站公开发布的历史版本记录、更新公告与功能变化，了解项目的发展历程。',
    },
  },
  '/about': {
    title: {
      en: 'About GoFurry Lite — Preserving the Furry Web',
      zh: '关于 GoFurry Lite — 兽圈导航的轻量延续',
    },
    description: {
      en: 'Learn why GoFurry Lite preserves the original furry website and game directory, how its historical catalogue works, and where the new GoFurry is heading.',
      zh: '了解 GoFurry Lite 的起源、历史资料保存方式、兽圈网站与游戏目录，以及它与全新 GoFurry 平台之间的关系。',
    },
  },
  '/privacy': {
    title: { en: 'Privacy Policy | GoFurry Lite', zh: '隐私政策 | GoFurry Lite' },
    description: {
      en: 'Learn how GoFurry Lite handles browser preferences, static hosting, technical requests, and third-party resources without requiring user accounts.',
      zh: '了解 GoFurry Lite 如何处理浏览器本地偏好、静态托管、基础网络请求与第三方资源，以及本站不提供用户账号的隐私设计。',
    },
  },
  '/terms': {
    title: { en: 'Terms of Service | GoFurry Lite', zh: '服务条款 | GoFurry Lite' },
    description: {
      en: 'Read the GoFurry Lite terms covering directory listings, historical information, external websites, content classification, corrections, and availability.',
      zh: '阅读 GoFurry Lite 服务条款，了解网站导航、历史资料、第三方链接、内容分级、收录更正及服务可用性等事项。',
    },
  },
} satisfies Record<string, Copy>

export const categoryDescriptions = {
  community: {
    en: 'Find furry forums, discussion groups, and independent community websites where fans share creative work and meet people with similar interests.',
    zh: '查找兽圈论坛、同好交流平台和独立社区，发现分享作品、讨论兴趣及认识其他爱好者的网站。',
  },
  gallery: {
    en: 'Discover furry illustration, character design, and photography through art galleries, creator portfolios, and community art archives.',
    zh: '浏览兽人艺术、角色设计和摄影作品，从画廊、创作者作品集及社区档案发现不同风格的创作。',
  },
  literature: {
    en: 'Find places to read furry fiction, original stories, serial novels, and fan writing, including independent archives and writers’ communities.',
    zh: '查找兽人小说、原创故事和同人文学的阅读入口，浏览独立作品档案、连载站点与写作者社区。',
  },
  resources: {
    en: 'Explore furry creative tools, drawing tutorials, reference material, and utilities that help artists and makers develop their projects.',
    zh: '查找绘画教程、参考素材和创作工具，为兽设设计、绘画、制作或其他兽圈创意项目寻找资源。',
  },
  marketplace: {
    en: 'Find fursuit makers, artists who take commissions, and shops for custom creations or furry merchandise. Visit the makers for current terms.',
    zh: '寻找兽装工作室、画师约稿平台及提供定制制作或兽圈周边的店铺，通过创作者网站了解当前委托条款。',
  },
  knowledge: {
    en: 'Explore furry news sites, wikis, and reference archives for terminology, fandom history, and coverage of community projects and events.',
    zh: '从兽圈资讯、百科和资料档案了解常见术语、历史背景，以及社区项目与活动的相关报道。',
  },
  gaming: {
    en: 'Find official furry game project websites, interactive works on the web, and player communities. Follow their own sites for project news and discussion.',
    zh: '查找兽人游戏官网、网页互动作品和玩家社区，前往原站了解项目近况、社区讨论或参与方式。',
  },
  events: {
    en: 'Find websites for furry conventions, local meetups, clubs, and their organizers. Check current schedules and venue details with the organizers.',
    zh: '查找兽展官网、地方兽聚、社团与活动组织者的入口，具体日期和参加方式以主办方当前公告为准。',
  },
} satisfies Record<CategoryCode, Translation>
