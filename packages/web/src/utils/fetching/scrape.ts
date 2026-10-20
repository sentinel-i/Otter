import { queryOptions, useQueryClient } from '@tanstack/react-query'
import urlJoin from 'proper-url-join'
import { useCallback } from 'react'
import type { MetadataResponse } from '@/types/api'

export const getScrapeData = async (url: string): Promise<MetadataResponse> => {
  const response = await fetch(
    urlJoin('/api/scrape', {
      query: { url: url.toString() },
    }),
    { cache: 'force-cache' },
  )
  const data: MetadataResponse = await response.json()

  if (!data) {
    throw new Error('No metadata')
  }

  return data
}

export const getScrapeDataOptions = (url: string) => {
  return queryOptions({
    queryFn: () => getScrapeData(url),
    queryKey: ['scrape', url],
    staleTime: 5 * 60 * 1000,
  })
}

export const useScrapeData = () => {
  const queryClient = useQueryClient()

  return useCallback(
    (url: string) => queryClient.fetchQuery(getScrapeDataOptions(url)),
    [queryClient],
  )
}

// The scrape and AI endpoints are rate limited per user (30 calls a minute),
// so a long bulk scrape waits for the window to reset instead of failing.
const RATE_LIMIT_RETRY_DELAY_MS = 20_000
const RATE_LIMIT_RETRIES = 3

const fetchRetryingRateLimit = async (
  input: string,
  init?: RequestInit,
  retries = RATE_LIMIT_RETRIES,
): Promise<Response> => {
  const response = await fetch(input, init)

  if (response.status === 429 && retries > 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS),
    )
    return fetchRetryingRateLimit(input, init, retries - 1)
  }

  return response
}

/**
 * Scrapes a bookmark's page again and returns the fields to update: its
 * description (written by the AI when `writeDescription` is set) and image.
 * Fields with nothing new are left out so they keep their current value.
 */
export const scrapeBookmarkUpdate = async (
  url: string,
  title: string | null,
  writeDescription: boolean,
): Promise<{ description?: string; image?: string }> => {
  const response = await fetchRetryingRateLimit(
    urlJoin('/api/scrape', { query: { url } }),
  )
  const data = (await response.json()) as Partial<MetadataResponse> & {
    error?: string
  }

  if (!response.ok || data.error) {
    throw new Error(data.error ?? 'Scrape failed')
  }

  const update: { description?: string; image?: string } = {}

  if (data.description) {
    update.description = data.description
  }

  if (writeDescription) {
    const aiResponse = await fetchRetryingRateLimit('/api/ai/description', {
      body: JSON.stringify({
        prompt: data.description ?? '',
        title: title ?? undefined,
        url: data.url ?? url,
      }),
      method: 'POST',
    })
    const { response: written } = (await aiResponse.json()) as {
      response?: string
    }

    if (aiResponse.ok && written) {
      update.description = written
    }
  }

  if (data.image && data.image !== data.url) {
    update.image = data.image
  }

  return update
}
