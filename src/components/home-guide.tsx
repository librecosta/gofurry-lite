import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ReactMarkdown from 'react-markdown'
import { href, type Locale } from '../lib/presentation'
import styles from './home-guide.module.scss'

export function HomeGuide({ locale }: { locale: Locale }) {
  const content = readFileSync(join(process.cwd(), 'content', 'pages', `home-guide.${locale}.md`), 'utf8')

  return <section className={styles.guide} aria-labelledby="home-guide">
    <div className={styles.prose}>
      <ReactMarkdown
        skipHtml
        urlTransform={(url) => {
          if (url.startsWith('/') && !url.startsWith('//')) return href(locale, url)
          return url.startsWith('https://') ? url : undefined
        }}
        components={{ h2: ({ children }) => <h2 id="home-guide">{children}</h2> }}
      >{content}</ReactMarkdown>
    </div>
  </section>
}
