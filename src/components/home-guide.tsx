import { categories } from '../lib/categories'
import { href, labels, type Locale } from '../lib/presentation'
import styles from './home-guide.module.scss'

const categoryNotes = {
  community: { zh: '从论坛、交流小组和同好平台开始，找到大家正在讨论的话题。', en: 'Find forums and gathering places where people share work, ask questions, and meet other fans.' },
  gallery: { zh: '浏览插画、摄影与创作者的作品档案，了解各自的创作方向。', en: 'Browse illustration, photography, and creator portfolios to get a sense of the work each site collects.' },
  literature: { zh: '寻找原创故事、长篇小说和同人作品，按站点专长挑选阅读入口。', en: 'Explore original stories, longer fiction, and fan writing. Use the site descriptions to find the kind of reading you want.' },
  resources: { zh: '查找制作或创作过程中用得上的教程、素材和实用工具。', en: 'Find tutorials, reference material, and tools that can help with a creative project.' },
  marketplace: { zh: '查找接受约稿、定制制作或提供相关商品的创作者及平台。', en: 'Find artists, makers, and marketplaces for commissions, custom work, and related goods.' },
  knowledge: { zh: '从资讯、百科和名录了解术语、活动背景与社群动向。', en: 'Look up terminology, event background, and community history in news sites, wikis, and reference directories.' },
  gaming: { zh: '查找游戏项目官网、玩家社区和其他互动作品的入口。', en: 'Find game project sites, player communities, and other interactive projects on the web.' },
  events: { zh: '通过展会、兽聚与社团的历史资料寻找感兴趣的活动，再向主办方核对安排。', en: 'Discover conventions, local meetups, and community groups, then check dates and venue details with the organizer.' },
}

export function HomeGuide({ locale }: { locale: Locale }) {
  const zh = locale === 'zh'
  return <section className={styles.guide} aria-labelledby="home-guide">
    <div className={styles.prose}>
      <h2 id="home-guide">{zh ? 'GoFurry Lite 导览' : 'A guide to GoFurry Lite'}</h2>
      <p>{zh
        ? 'GoFurry Lite 延续了旧 GoFurry 的兽圈网站导航与兽人主题游戏目录。你可以先在这里了解一个网站收录什么内容、一个游戏有哪些玩法，再决定要不要打开原站或商店。如果你是从旧书签回来的，也可以继续通过保留的历史地址查找资料。'
        : 'GoFurry Lite carries forward the furry website and game directories from the original GoFurry. Use it to see what a website covers or how a game plays before deciding whether to visit the original site or storefront. If you are returning with an old bookmark, the archive keeps the historical addresses for entries that are still available.'}</p>
    </div>

    <section>
      <div className={styles.prose}>
        <h3>{zh ? '通过八个分类发现兽圈网站' : 'Discover furry websites across eight categories'}</h3>
        <p>{zh
          ? '先按你想做的事选分类。想找同好，可以从社区开始。想了解一场兽展，可以到活动分类。首页每个分类只展示部分条目，打开分类页后可以继续浏览或在该分类内搜索。'
          : 'Start with what you want to do. Communities are a useful starting point for meeting other fans, while events are where to look for information about a convention. Each homepage card shows a selection. Open its category to see more entries or search within it.'}</p>
      </div>
      <ul className={styles.categories}>
        {categories.map(([code, nameZh, nameEn]) => <li key={code}>
          <a href={href(locale, '/categories/' + code)}>{zh ? nameZh : nameEn}</a>
          <p>{categoryNotes[code][locale]}</p>
        </li>)}
      </ul>
    </section>

    <section className={styles.prose}>
      <h3>{zh ? '从玩法、物种标签与合集找游戏' : 'Find games by genre, species, or collection'}</h3>
      <p>{zh ? <>在<a href={href(locale, '/games')}>兽游目录</a>里可以用作品名、简介或标签搜索，再结合游戏分类和物种筛选缩小范围。详情页汇集存档中的简介、标签及可用的发行资料。有些条目还提供截图或商店入口，方便你核对作品信息。</>
        : <>In the <a href={href(locale, '/games')}>game directory</a>, search by title, description, or tag. Use the genre and species filters to narrow the results. A game’s detail page brings together the archived description, tags, and available release information. Some entries also include screenshots or a storefront link so you can check the work yourself.</>}</p>
      <p>{zh ? <>没有明确想找的游戏时，可以从<a href={href(locale, '/games/collections')}>游戏合集</a>入手。合集按共同玩法或主题整理，例如视觉小说、策略或免费游戏。如果你想找游戏计划的官方网站或玩家社区，可以回网站导航的<a href={href(locale, '/categories/gaming')}>游戏互动</a>分类。</>
        : <>If you have no particular game in mind, start with the <a href={href(locale, '/games/collections')}>collections</a>. They group games by themes such as visual novels, strategy, or free-to-play titles. For official project websites and player communities, use the <a href={href(locale, '/categories/gaming')}>Games &amp; Interactive</a> website category.</>}</p>
    </section>

    <section className={styles.prose}>
      <h3>{zh ? '历史资料从哪里来' : 'Where the archived information comes from'}</h3>
      <p>{zh ? <>网站和游戏条目基于 2026 年 11 月 15 日封板的旧 GoFurry 资料。站点和游戏保留了历史编号，原有成员关系也可通过<a href={href(locale, '/site-groups')}>{labels[locale]['site-groups']}</a>查看。<a href={href(locale, '/updates')}>{labels[locale].updates}</a>保存了旧站曾公开发布的版本记录与公告。</>
        : <>Website and game entries come from the legacy GoFurry snapshot dated November 15, 2026. The archive preserves their original IDs, and the <a href={href(locale, '/site-groups')}>legacy groups</a> keep the original website groupings available. <a href={href(locale, '/updates')}>Updates</a> preserves release notes and announcements that the original site published.</>}</p>
      <p>{zh
        ? '存档反映的是封板时记录下来的资料。网站地址、展会时间和游戏上架状态都可能变化。需要当前信息时，建议通过详情页提供的入口向运营方、主办方或发行方确认。'
        : 'The archive reflects what was recorded at the time. A site address, convention schedule, or game’s availability can change. For current information, follow the link on the detail page, when available, and check with the operator, organizer, or publisher.'}</p>
    </section>

    <section className={styles.prose}>
      <h3>{zh ? '导航使用常见问题' : 'Frequently asked questions'}</h3>
      <dl className={styles.questions}>
        <div><dt>{zh ? '只记得部分名称，怎么找？' : 'What if I only remember part of a name?'}</dt>
          <dd>{zh ? '在首页搜索框输入名称片段或简介里的关键词。搜索范围是网站资料。要找游戏，请到兽游目录使用游戏搜索。'
            : 'Enter the part you remember or a keyword from the description in the homepage search. That search covers websites. To look up a game, use the search in the game directory.'}</dd></div>
        <div><dt>{zh ? '为什么不同模式看到的结果不一样？' : 'Why do results change when I switch content modes?'}</dt>
          <dd>{zh ? '首次访问默认使用 SFW。开启 NSFW 后，目录还会显示标有成人内容的条目，它们仍保留标记。这个展示偏好保存在当前浏览器，切换语言时也会沿用。'
            : 'The directory starts in SFW mode. Switching to NSFW mode includes entries marked as adult, and those entries keep their labels. The preference is saved in your browser and carries over when you change languages.'}</dd></div>
        <div><dt>{zh ? '为什么部分站点详情没有访问按钮？' : 'Why do some website entries have no visit button?'}</dt>
          <dd>{zh ? '有些历史记录没有可确认的访问地址。你仍然可以查看名称、简介和历史分组，再从所属分类寻找相关站点。'
            : 'Some historical entries do not have a confirmed destination. You can still read their description, see their legacy groups, and browse their category for related sites.'}</dd></div>
      </dl>
    </section>
  </section>
}
