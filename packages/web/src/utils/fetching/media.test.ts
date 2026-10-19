import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMedia } from './media'

const mockMediaResponse = (body: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getMedia', () => {
  it('returns an empty column for every status when there is no media', async () => {
    mockMediaResponse({})

    const { data } = await getMedia()

    expect(data).toEqual({ done: [], now: [], skipped: [], wishlist: [] })
  })

  it('groups media by status, defaulting to wishlist', async () => {
    mockMediaResponse({
      movie: {
        now: [{ id: 1, status: 'now' }],
        wishlist: [{ id: 2, status: null }],
      },
    })

    const { data } = await getMedia()

    expect(data.now.map((item) => item.id)).toEqual([1])
    expect(data.wishlist.map((item) => item.id)).toEqual([2])
    expect(data.done).toEqual([])
    expect(data.skipped).toEqual([])
  })
})
