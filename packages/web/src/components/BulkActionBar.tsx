import {
  DownloadIcon,
  EyeIcon,
  EyeSlashIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  StarIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import type { BatchAction } from 'worker/bookmarks/batch'
import { Button } from '@/components/Button'
import type { Bookmark, BookmarkType } from '@/types/db'
import {
  batchUpdateBookmarks,
  updateBookmark,
} from '@/utils/fetching/bookmarks'
import { scrapeBookmarkUpdate } from '@/utils/fetching/scrape'
import { getTagsOptions } from '@/utils/fetching/tags'
import { getErrorMessage } from '@/utils/get-error-message'
import { Flex } from './Flex'
import { Input } from './Input'
import { useUser } from './UserProvider'

const BOOKMARK_TYPES: BookmarkType[] = [
  'link',
  'article',
  'video',
  'audio',
  'recipe',
  'image',
  'document',
  'product',
  'game',
  'note',
  'event',
  'place',
]

interface BulkActionBarProps {
  selectedBookmarks: Bookmark[]
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
}

export const BulkActionBar = ({
  selectedBookmarks,
  totalCount,
  onSelectAll,
  onClear,
}: BulkActionBarProps) => {
  const queryClient = useQueryClient()
  const { profile } = useUser()
  const selectedIds = selectedBookmarks.map((bookmark) => bookmark.id)
  const tagListId = useId()
  const [tag, setTag] = useState('')
  const { data: tags } = useQuery(getTagsOptions())
  const { isPending, mutate } = useMutation({
    mutationFn: (action: BatchAction) =>
      batchUpdateBookmarks(selectedIds, action),
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSuccess: async ({ data }, action) => {
      toast.success(
        `Updated ${data.updated} bookmark${data.updated === 1 ? '' : 's'}`,
      )
      if (action.type === 'trash') {
        onClear()
      }
      await queryClient.invalidateQueries()
    },
  })
  // Scraping runs one bookmark at a time from the browser: each page is a
  // separate fetch, so the Worker never scrapes many pages in one request
  const { isPending: isScraping, mutate: scrape } = useMutation({
    mutationFn: async () => {
      const targets = selectedBookmarks.filter((bookmark) => bookmark.url)
      const translate = Boolean(profile?.settings_description_language)
      const toastId = toast.loading(`Scraping 0/${targets.length}…`)
      let updated = 0
      let failed = 0

      for (const [index, bookmark] of targets.entries()) {
        toast.loading(`Scraping ${index + 1}/${targets.length}…`, {
          id: toastId,
        })
        try {
          const update = await scrapeBookmarkUpdate(
            bookmark.url as string,
            bookmark.title,
            translate,
          )

          if (Object.keys(update).length) {
            await updateBookmark(bookmark.id, update)
            updated++
          }
        } catch {
          failed++
        }
      }

      return { failed, toastId, updated }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries()
    },
    onSuccess: ({ failed, toastId, updated }) => {
      const message = `Scraped ${updated} bookmark${updated === 1 ? '' : 's'}`

      if (failed) {
        toast.warning(`${message}, ${failed} failed`, { id: toastId })
      } else {
        toast.success(message, { id: toastId })
      }
    },
  })
  const isDisabled = isPending || isScraping || selectedIds.length === 0
  const trimmedTag = tag.trim()
  const isAllSelected = totalCount > 0 && selectedIds.length === totalCount

  return (
    <div className="bulk-action-bar">
      <Flex gap="2xs" align="center" wrap="wrap">
        <strong className="text-step--1">{selectedIds.length} selected</strong>
        {isAllSelected ? (
          <Button size="xs" variant="ghost" onClick={onClear}>
            Deselect all
          </Button>
        ) : (
          <Button size="xs" variant="ghost" onClick={onSelectAll}>
            Select all ({totalCount})
          </Button>
        )}
      </Flex>
      <Flex gap="2xs" align="center" wrap="wrap">
        <Input
          aria-label="Tag"
          className="bulk-action-tag-input"
          list={tagListId}
          onChange={(event) => setTag(event.target.value)}
          placeholder="Tag (collection:tag)"
          value={tag}
        />
        <datalist id={tagListId}>
          {tags?.map(({ tag: suggestion }) =>
            suggestion ? <option key={suggestion} value={suggestion} /> : null,
          )}
        </datalist>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled || !trimmedTag}
          onClick={() => mutate({ tag: trimmedTag, type: 'addTag' })}
        >
          <PlusCircleIcon size={16} weight="duotone" /> Add tag
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled || !trimmedTag}
          onClick={() => mutate({ tag: trimmedTag, type: 'removeTag' })}
        >
          <MinusCircleIcon size={16} weight="duotone" /> Remove tag
        </Button>
      </Flex>
      <Flex gap="2xs" align="center" wrap="wrap">
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => mutate({ type: 'star', value: true })}
        >
          <StarIcon size={16} weight="fill" /> Star
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => mutate({ type: 'star', value: false })}
        >
          <StarIcon size={16} weight="duotone" /> Unstar
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => mutate({ type: 'public', value: true })}
        >
          <EyeIcon size={16} weight="duotone" /> Public
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => mutate({ type: 'public', value: false })}
        >
          <EyeSlashIcon size={16} weight="duotone" /> Private
        </Button>
        <select
          aria-label="Set type"
          className="input-base focus bulk-action-select text-step--2"
          disabled={isDisabled}
          onChange={(event) => {
            const value = event.target.value as BookmarkType

            if (value) {
              mutate({ type: 'setType', value })
            }
          }}
          value=""
        >
          <option value="">Set type…</option>
          {BOOKMARK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => scrape()}
          title="Update the description and image from each page"
        >
          <DownloadIcon size={16} weight="duotone" /> Scrape
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={isDisabled}
          onClick={() => mutate({ type: 'trash' })}
        >
          <TrashIcon size={16} weight="duotone" /> Move to trash
        </Button>
      </Flex>
    </div>
  )
}
