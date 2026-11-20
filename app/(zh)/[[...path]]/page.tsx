import { buildParams, metadataFor } from '../../../src/lib/routes'
import { SitePage } from '../../../src/components/pages'
import { Shell } from '../../../src/components/shell'

type Props = { params: Promise<{ path?: string[] }> }
export const dynamicParams = false

export function generateStaticParams() {
  return buildParams()
}

export async function generateMetadata({ params }: Props) {
  return metadataFor('zh', (await params).path ?? [])
}

export default async function Page({ params }: Props) {
  const segments = (await params).path ?? []
  return (
    <Shell locale="zh" path={'/' + segments.join('/')}>
      <SitePage locale="zh" segments={segments} />
    </Shell>
  )
}
