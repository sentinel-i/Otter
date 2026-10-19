import { and, eq, inArray, sql } from 'drizzle-orm'
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core'
import type { Context } from 'hono'
import { z } from 'zod'
import { API_HEADERS } from '@/constants'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { getErrorMessage } from '@/utils/get-error-message'
import { bookmarks, bookmarkTypeEnum } from '../../db/schema'
import { requireRequestContext } from '../context'
import type { WorkerEnv } from '../env'

type HonoContext = Context<{ Bindings: WorkerEnv }>

export const MAX_BATCH_SIZE = 500

const tagSchema = z.string().trim().min(1)

export const batchUpdateSchema = z.object({
  action: z.discriminatedUnion('type', [
    z.object({ tag: tagSchema, type: z.literal('addTag') }),
    z.object({ tag: tagSchema, type: z.literal('removeTag') }),
    z.object({ type: z.literal('star'), value: z.boolean() }),
    z.object({ type: z.literal('public'), value: z.boolean() }),
    z.object({
      type: z.literal('setType'),
      value: z.enum(bookmarkTypeEnum.enumValues),
    }),
    z.object({ type: z.literal('trash') }),
  ]),
  ids: z.array(z.uuid()).min(1).max(MAX_BATCH_SIZE),
})

export type BatchAction = z.infer<typeof batchUpdateSchema>['action']

// Tags are a text[] column: append only when missing, and store an emptied
// list as NULL like the rest of the app does.
export const getBatchUpdate = (
  action: BatchAction,
): PgUpdateSetSource<typeof bookmarks> => {
  switch (action.type) {
    case 'addTag':
      return {
        tags: sql`CASE WHEN ${action.tag}::text = ANY(coalesce(${bookmarks.tags}, '{}')) THEN ${bookmarks.tags} ELSE array_append(coalesce(${bookmarks.tags}, '{}'), ${action.tag}::text) END`,
      }
    case 'removeTag':
      return {
        tags: sql`nullif(array_remove(${bookmarks.tags}, ${action.tag}::text), '{}')`,
      }
    case 'star':
      return { star: action.value }
    case 'public':
      return { public: action.value }
    case 'setType':
      return { type: action.value }
    case 'trash':
      return { status: 'inactive' }
  }
}

/**
 * POST /api/bookmarks/batch
 * Applies one action to many of the user's bookmarks in a single query.
 * Unlike PATCH /api/bookmarks/:id, making bookmarks public here does not post
 * them to Mastodon/Bluesky, so a bulk change never floods those accounts.
 */
export const batchUpdateBookmarks = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:write',
    ])

    if (requestContext instanceof Response) {
      return requestContext
    }

    const userId = requestContext.user?.id

    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const parsed = batchUpdateSchema.safeParse(await context.req.json())

    if (!parsed.success) {
      return errorResponse({
        error: z.prettifyError(parsed.error),
        reason: 'Invalid batch update payload',
        status: 400,
      })
    }

    const updated = await requestContext.db
      .update(bookmarks)
      .set({ ...getBatchUpdate(parsed.data.action), modifiedAt: new Date() })
      .where(
        and(eq(bookmarks.user, userId), inArray(bookmarks.id, parsed.data.ids)),
      )
      .returning({ id: bookmarks.id })

    return new Response(
      JSON.stringify({ data: { updated: updated.length }, error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem updating bookmarks',
      status: 400,
    })
  }
}

/**
 * DELETE /api/bookmarks/trash
 * Permanently deletes every bookmark in the user's trash.
 */
export const emptyTrash = async (context: HonoContext) => {
  try {
    const requestContext = await requireRequestContext(context, [
      'bookmarks:write',
    ])

    if (requestContext instanceof Response) {
      return requestContext
    }

    const userId = requestContext.user?.id

    if (!userId) {
      return errorResponse({ reason: 'Not authorised', status: 401 })
    }

    const deleted = await requestContext.db
      .delete(bookmarks)
      .where(and(eq(bookmarks.user, userId), eq(bookmarks.status, 'inactive')))
      .returning({ id: bookmarks.id })

    return new Response(
      JSON.stringify({ data: { deleted: deleted.length }, error: null }),
      { headers: API_HEADERS, status: 200 },
    )
  } catch (error) {
    return errorResponse({
      error: getErrorMessage(error),
      reason: 'Problem emptying the trash',
      status: 400,
    })
  }
}
