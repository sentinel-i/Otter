import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrapeBookmarkUpdate } from './scrape'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const scraped = {
  description: 'An English description',
  image: 'https://example.com/og.png',
  url: 'https://example.com/',
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('scrapeBookmarkUpdate', () => {
  it('returns the scraped description and image', async () => {
    const fetchMock = vi.fn(async () => json(scraped))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      scrapeBookmarkUpdate('https://example.com/', 'Title', false),
    ).resolves.toEqual({
      description: 'An English description',
      image: 'https://example.com/og.png',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('has the AI write the description when asked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) =>
        input.startsWith('/api/ai/description')
          ? json({ response: 'Une description en français' })
          : json(scraped),
      ),
    )

    const update = await scrapeBookmarkUpdate(
      'https://example.com/',
      'Title',
      true,
    )

    expect(update.description).toBe('Une description en français')
  })

  it('leaves out fields the page does not provide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ description: null, image: scraped.url, url: scraped.url }),
      ),
    )

    await expect(
      scrapeBookmarkUpdate('https://example.com/', null, true),
    ).resolves.toEqual({})
  })

  it('waits and retries when rate limited', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'Rate limit exceeded' }, 429))
      .mockResolvedValueOnce(json(scraped))
    vi.stubGlobal('fetch', fetchMock)

    const pending = scrapeBookmarkUpdate('https://example.com/', null, false)
    await vi.runAllTimersAsync()

    await expect(pending).resolves.toMatchObject({
      description: 'An English description',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws when the scrape fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ error: 'Boom' })),
    )

    await expect(
      scrapeBookmarkUpdate('https://example.com/', null, false),
    ).rejects.toThrow('Boom')
  })
})
