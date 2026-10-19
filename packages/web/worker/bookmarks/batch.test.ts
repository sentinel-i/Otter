import { describe, expect, it } from 'vitest'
import { batchUpdateSchema, MAX_BATCH_SIZE } from './batch'

const id = '3f1c2a4e-8b7d-4c6e-9a0b-1d2e3f4a5b6c'

describe('batchUpdateSchema', () => {
  it('accepts every supported action', () => {
    for (const action of [
      { tag: 'dev:react', type: 'addTag' },
      { tag: 'dev:react', type: 'removeTag' },
      { type: 'star', value: true },
      { type: 'public', value: false },
      { type: 'setType', value: 'recipe' },
      { type: 'trash' },
    ]) {
      expect(batchUpdateSchema.safeParse({ action, ids: [id] }).success).toBe(
        true,
      )
    }
  })

  it('trims tags and rejects empty ones', () => {
    const parsed = batchUpdateSchema.parse({
      action: { tag: '  dev  ', type: 'addTag' },
      ids: [id],
    })

    expect(parsed.action).toEqual({ tag: 'dev', type: 'addTag' })
    expect(
      batchUpdateSchema.safeParse({
        action: { tag: '   ', type: 'addTag' },
        ids: [id],
      }).success,
    ).toBe(false)
  })

  it('rejects unknown actions and types', () => {
    expect(
      batchUpdateSchema.safeParse({ action: { type: 'delete' }, ids: [id] })
        .success,
    ).toBe(false)
    expect(
      batchUpdateSchema.safeParse({
        action: { type: 'setType', value: 'nope' },
        ids: [id],
      }).success,
    ).toBe(false)
  })

  it('needs between 1 and MAX_BATCH_SIZE valid ids', () => {
    const action = { type: 'trash' }

    expect(batchUpdateSchema.safeParse({ action, ids: [] }).success).toBe(false)
    expect(
      batchUpdateSchema.safeParse({ action, ids: ['not-a-uuid'] }).success,
    ).toBe(false)
    expect(
      batchUpdateSchema.safeParse({
        action,
        ids: Array.from({ length: MAX_BATCH_SIZE + 1 }, () => id),
      }).success,
    ).toBe(false)
  })
})
