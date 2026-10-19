import { describe, expect, it } from 'vitest'
import { batchJournalEntriesSchema, MAX_ENTRY_BATCH_SIZE } from './journal'

describe('batchJournalEntriesSchema', () => {
  it('accepts moving and deleting entries', () => {
    expect(
      batchJournalEntriesSchema.safeParse({
        action: { journal: 3, type: 'move' },
        ids: [1, 2],
      }).success,
    ).toBe(true)
    expect(
      batchJournalEntriesSchema.safeParse({
        action: { type: 'delete' },
        ids: [1],
      }).success,
    ).toBe(true)
  })

  it('rejects a move without a valid journal', () => {
    for (const journal of [undefined, null, 0, -1, 'work']) {
      expect(
        batchJournalEntriesSchema.safeParse({
          action: { journal, type: 'move' },
          ids: [1],
        }).success,
      ).toBe(false)
    }
  })

  it('needs between 1 and MAX_ENTRY_BATCH_SIZE valid ids', () => {
    const action = { type: 'delete' }

    expect(
      batchJournalEntriesSchema.safeParse({ action, ids: [] }).success,
    ).toBe(false)
    expect(
      batchJournalEntriesSchema.safeParse({ action, ids: ['1'] }).success,
    ).toBe(false)
    expect(
      batchJournalEntriesSchema.safeParse({
        action,
        ids: Array.from({ length: MAX_ENTRY_BATCH_SIZE + 1 }, (_, i) => i + 1),
      }).success,
    ).toBe(false)
  })
})
