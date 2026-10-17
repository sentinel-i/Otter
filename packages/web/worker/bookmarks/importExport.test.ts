import { drizzle } from 'drizzle-orm/node-postgres'
import { describe, expect, it } from 'vitest'
import { bookmarks } from '../../db/schema'
import { urlInList } from './importExport'

const db = drizzle.mock()

describe('urlInList', () => {
  it('binds every URL as a single text[] parameter', () => {
    const urls = ['https://a.example', 'https://b.example', 'https://c.example']
    const query = db
      .select({ url: bookmarks.url })
      .from(bookmarks)
      .where(urlInList(urls))
      .toSQL()

    expect(query.sql).toContain('= ANY($1::text[])')
    expect(query.params).toEqual([urls])
  })

  it('stays a single parameter past the 65535 bind-parameter limit', () => {
    const urls = Array.from(
      { length: 70_000 },
      (_, i) => `https://${i}.example`,
    )
    const query = db
      .select({ url: bookmarks.url })
      .from(bookmarks)
      .where(urlInList(urls))
      .toSQL()

    expect(query.params).toHaveLength(1)
  })
})
