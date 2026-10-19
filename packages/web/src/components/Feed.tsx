import {
  CheckSquareIcon,
  ClockCounterClockwiseIcon,
  EyeIcon,
  StarIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { FileRouteTypes } from '@tanstack/react-router'
import { memo, type ReactNode, useMemo, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Button } from '@/components/Button'
import { CONTENT, DEFAULT_API_RESPONSE_LIMIT } from '@/constants'
import { useFeedOptions } from '@/hooks/useFeedOptions'
import { type FeedItemModel, useGroupByDate } from '@/hooks/useGroupByDate'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { getCollectionsTagsOptions } from '@/utils/fetching/collections'
import type { ShareKind } from '@/utils/fetching/shares'
import type { Bookmark, Toot, Tweet } from '../types/db'
import { cn } from '../utils/classnames'
import { BookmarkFeedItem } from './BookmarkFeedItem'
import { BulkActionBar } from './BulkActionBar'
import { Flex } from './Flex'
import { headingVariants } from './Heading'
import { Loader } from './Loader'
import { ShareDialog } from './ShareDialog'
import { SidebarLink } from './SidebarLink'
import { TootFeedItem } from './TootFeedItem'
import { TweetFeedItem } from './TweetFeedItem'

interface FeedProps {
  title: ReactNode
  subNav?: {
    text: string
    href: string
    isActive?: boolean
    icon?: ReactNode
  }[]
  icon?: ReactNode
  items: FeedItemModel[]
  allowDeletion?: boolean
  count: number
  limit?: number
  allowGroupByDate?: boolean
  feedType?: 'tweets' | 'bookmarks' | 'toots'
  showFeedOptions?: boolean
  from?: FileRouteTypes['fullPaths']
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
  shareConfig?: { kind: ShareKind; name: string }
}

export function isBookmark(item: FeedItemModel): item is Bookmark {
  return 'title' in item
}
export function isTweet(item: FeedItemModel): item is Tweet {
  return 'tweet_id' in item
}
export function isToot(item: FeedItemModel): item is Toot {
  return 'toot_id' in item
}

export const Feed = memo(
  ({
    title,
    icon,
    items,
    allowDeletion = false,
    count: _count,
    limit: _limit = DEFAULT_API_RESPONSE_LIMIT,
    allowGroupByDate = false,
    feedType,
    subNav,
    showFeedOptions = true,
    from: _from,
    hasNextPage = false,
    isFetchingNextPage = false,
    fetchNextPage,
    shareConfig,
  }: FeedProps) => {
    const {
      starQuery,
      publicQuery,
      windowQuery,
      setStarQuery,
      setPublicQuery,
      setWindowQuery,
    } = useFeedOptions()
    const { groupByDate, groupedItems } = useGroupByDate(items)
    const { sentinelRef } = useInfiniteScroll({
      fetchNextPage: fetchNextPage ?? (() => {}),
      hasNextPage,
      isFetchingNextPage,
    })
    const { data: collectionsTags } = useSuspenseQuery(
      getCollectionsTagsOptions(),
    )
    // Bulk editing is for bookmark feeds, but not the trash
    const canSelect =
      feedType === 'bookmarks' && showFeedOptions && !allowDeletion
    const [isSelecting, setIsSelecting] = useState(false)
    const [selection, setSelection] = useState<Set<string>>(() => new Set())
    const bookmarkIds = useMemo(
      () => items.filter(isBookmark).map((item) => item.id),
      [items],
    )
    // Ignore selected bookmarks that have left the feed (trashed, filtered)
    const selectedIds = bookmarkIds.filter((id) => selection.has(id))
    const handleSelectedChange = (id: string, isSelected: boolean) => {
      setSelection((prev) => {
        const next = new Set(prev)
        if (isSelected) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })
    }
    const handleToggleSelecting = () => {
      setIsSelecting((prev) => !prev)
      setSelection(new Set())
    }
    const selectionProps = (id: string) =>
      isSelecting
        ? {
            isSelected: selection.has(id),
            onSelectedChange: handleSelectedChange,
          }
        : {}

    const handleToggleState = async (
      column: 'public' | 'star',
    ): Promise<void> => {
      if (column === 'public') {
        setPublicQuery((prev) => !prev)
      }
      if (column === 'star') {
        setStarQuery((prev) => !prev)
      }
    }

    return (
      <div className="feed">
        <Flex gap="xs" direction="column" justify="between">
          <Flex gap="xs" justify="between" wrap="wrap" align="center">
            <h3
              className={cn(
                headingVariants({ variant: 'feedTitle' }),
                'flex items-center gap-2xs',
              )}
            >
              {icon}
              {title}
            </h3>
            {showFeedOptions || shareConfig ? (
              <Flex gap="3xs">
                {showFeedOptions ? (
                  <>
                    <Button
                      onClick={() => handleToggleState('star')}
                      size="xs"
                      variant="ghost"
                      aria-pressed={starQuery}
                    >
                      <StarIcon
                        size={16}
                        weight={starQuery ? 'fill' : 'duotone'}
                      />{' '}
                      Stars
                    </Button>
                    <Button
                      onClick={() => handleToggleState('public')}
                      size="xs"
                      variant="ghost"
                      aria-pressed={publicQuery}
                    >
                      <EyeIcon
                        size={16}
                        weight={publicQuery ? 'fill' : 'duotone'}
                      />{' '}
                      Public
                    </Button>
                    <Button
                      onClick={() => setWindowQuery((prev) => prev + 1)}
                      size="xs"
                      variant="ghost"
                      aria-pressed={windowQuery > 0}
                      title="Click again to go back another 7 days"
                    >
                      <ClockCounterClockwiseIcon
                        size={16}
                        weight={windowQuery > 0 ? 'fill' : 'duotone'}
                      />{' '}
                      {windowQuery > 1
                        ? `${(windowQuery - 1) * 7 + 1}–${windowQuery * 7} days ago`
                        : 'Last 7 days'}
                    </Button>
                    {windowQuery > 0 ? (
                      <Button
                        onClick={() => setWindowQuery(0)}
                        size="xs"
                        variant="ghost"
                        aria-label="Clear date filter"
                      >
                        <XIcon size={16} />
                      </Button>
                    ) : null}
                    {canSelect ? (
                      <Button
                        onClick={handleToggleSelecting}
                        size="xs"
                        variant="ghost"
                        aria-pressed={isSelecting}
                      >
                        <CheckSquareIcon
                          size={16}
                          weight={isSelecting ? 'fill' : 'duotone'}
                        />{' '}
                        Select
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {shareConfig ? (
                  <ShareDialog
                    kind={shareConfig.kind}
                    name={shareConfig.name}
                  />
                ) : null}
              </Flex>
            ) : null}
          </Flex>
          {subNav ? (
            <Flex gapX="3xs" gapY="3xs" wrap="wrap">
              {subNav.map(({ href, text, isActive, icon }) => {
                return (
                  <SidebarLink href={href} isActive={isActive} key={href}>
                    <>
                      {icon}
                      {text}
                    </>
                  </SidebarLink>
                )
              })}
            </Flex>
          ) : null}
          {isSelecting ? (
            <BulkActionBar
              selectedIds={selectedIds}
              totalCount={bookmarkIds.length}
              onSelectAll={() => setSelection(new Set(bookmarkIds))}
              onClear={() => setSelection(new Set())}
            />
          ) : null}
        </Flex>

        {allowGroupByDate && groupByDate ? (
          <div className="bp2:gap-m grid gap-s">
            {groupedItems?.length ? (
              groupedItems.map((groupedItem) => (
                <div key={groupedItem.date}>
                  <h3 className={headingVariants({ variant: 'date' })}>
                    {groupedItem.date}
                  </h3>
                  <ErrorBoundary fallback={<div>Something went wrong</div>}>
                    <div className="grid gap-m">
                      {groupedItem?.items?.map((item) => {
                        if (!item) {
                          return null
                        }
                        if (isTweet(item)) {
                          return <TweetFeedItem {...item} key={item.id} />
                        } else if (isToot(item)) {
                          return <TootFeedItem {...item} key={item.id} />
                        }
                        return (
                          <BookmarkFeedItem
                            {...item}
                            allowDeletion={allowDeletion}
                            collections={collectionsTags ?? []}
                            key={item.id}
                            {...selectionProps(item.id)}
                          />
                        )
                      })}
                    </div>
                  </ErrorBoundary>
                </div>
              ))
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>
        ) : (
          <div className="mt-m grid gap-m">
            {items?.length ? (
              items.map((item) => {
                if (!item) {
                  return null
                }
                if (isTweet(item)) {
                  return <TweetFeedItem {...item} key={item.id} />
                } else if (isToot(item)) {
                  return <TootFeedItem {...item} key={item.id} />
                }
                return (
                  <BookmarkFeedItem
                    {...item}
                    allowDeletion={allowDeletion}
                    collections={collectionsTags ?? []}
                    key={item.id}
                    {...selectionProps(item.id)}
                  />
                )
              })
            ) : (
              <div>{CONTENT.noItems}</div>
            )}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="mt-m flex justify-center">
          {isFetchingNextPage ? <Loader /> : null}
        </div>
      </div>
    )
  },
)

Feed.displayName = 'Feed'
