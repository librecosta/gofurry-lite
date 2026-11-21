import type { DirectorySite, GameCardData, Tag, Translation } from './presentation'

export const homeGameCount = 12

type GameCardLabel = { id: number; title: Translation }
export type HomeGame = Pick<GameCardData, 'id' | 'title' | 'rating' | 'appId' | 'cover'> & { labels: GameCardLabel[] }
export type HomeDirectory = { sites: DirectorySite[]; games: HomeGame[] }

export function gameCardLabels(game: Pick<GameCardData, 'tags'>, findTag: (id: number) => Tag | undefined) {
  return game.tags.flatMap(({ id }) => {
    const tag = findTag(id)
    return tag?.category === 'classification' ? [{ id, title: tag.title }] : []
  }).slice(0, 3)
}

export function sampleHomeGames(pool: readonly HomeGame[]) {
  const games = [...pool]
  // Only the first twelve positions of the Fisher–Yates shuffle are needed.
  for (let i = 0; i < Math.min(homeGameCount, games.length); i++) {
    const j = i + Math.floor(Math.random() * (games.length - i))
    const selected = games[j]
    games[j] = games[i]
    games[i] = selected
  }
  return games.slice(0, homeGameCount)
}
