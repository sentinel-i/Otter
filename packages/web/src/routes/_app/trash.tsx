import { TrashIcon } from '@phosphor-icons/react'
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Feed } from '@/components/Feed'
import { CONTENT, createTitle } from '@/constants'
import type { Bookmark } from '@/types/db'
import { apiParameters } from '@/utils/fetching/apiParameters'
import {
  emptyTrash,
  getBookmarksInfiniteOptions,
} from '@/utils/fetching/bookmarks'
import { getErrorMessage } from '@/utils/get-error-message'

export const Route = createFileRoute('/_app/trash')({
  component: FeedPage,
  head: () => ({
    meta: [
      {
        title: createTitle('trashTitle'),
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ search }),
  validateSearch: (search: Record<string, unknown>) => {
    const { offset: _, ...params } = apiParameters(search)
    return params
  },
})

const EmptyTrashButton = ({ count }: { count: number }) => {
  const queryClient = useQueryClient()
  const { isPending, mutate } = useMutation({
    mutationFn: emptyTrash,
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSuccess: async ({ data }) => {
      toast.success(
        `Permanently deleted ${data.deleted} bookmark${data.deleted === 1 ? '' : 's'}`,
      )
      await queryClient.invalidateQueries()
    },
  })

  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={isPending || count === 0}
      onClick={() => {
        if (
          confirm(
            'Permanently delete every bookmark in the trash? This cannot be undone.',
          )
        ) {
          mutate()
        }
      }}
    >
      <TrashIcon size={16} weight="duotone" /> Empty trash
    </Button>
  )
}

function FeedPage() {
  const search = useSearch({ from: '/_app/trash' })
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(
      getBookmarksInfiniteOptions({ ...search, status: 'inactive' }),
    )

  const items = data.pages.flatMap((page) => page.data ?? []) as Bookmark[]
  const count = data.pages[0]?.count ?? 0

  return (
    <Feed
      items={items}
      count={count}
      limit={search.limit}
      allowGroupByDate={true}
      title={CONTENT.trashTitle}
      icon={<TrashIcon weight="duotone" size={24} />}
      feedType="bookmarks"
      allowDeletion
      actions={<EmptyTrashButton count={count} />}
      from="/trash"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}
