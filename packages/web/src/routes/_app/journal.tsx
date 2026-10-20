import {
  CheckSquareIcon,
  CircleIcon,
  NotebookIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/Button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/Dialog'
import { FormGroup } from '@/components/FormGroup'
import { IconControl } from '@/components/IconControl'
import { Input } from '@/components/Input'
import { JournalEntryForm } from '@/components/JournalEntryForm'
import { JournalEntryItem } from '@/components/JournalEntryItem'
import { createTitle } from '@/constants'
import type {
  JournalEntry,
  JournalEntryInsert,
  JournalInsert,
} from '@/types/db'
import {
  getJournalEntriesOptions,
  getJournalsOptions,
  useBatchUpdateJournalEntries,
  useCreateJournal,
  useCreateJournalEntry,
  useDeleteJournal,
  useUpdateJournalEntry,
} from '@/utils/fetching/journal'

export const Route = createFileRoute('/_app/journal')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: createTitle('journalTitle'),
      },
    ],
  }),
  loader: async (opts) => {
    const [entries, journals] = await Promise.all([
      opts.context.queryClient.ensureQueryData(getJournalEntriesOptions()),
      opts.context.queryClient.ensureQueryData(getJournalsOptions()),
    ])
    return { entries, journals }
  },
})

function NewJournalForm({ onSubmitted }: { onSubmitted: () => void }) {
  const createJournalMutation = useCreateJournal()
  const { register, handleSubmit, reset } = useForm<JournalInsert>({
    defaultValues: { description: '', name: '' },
  })

  const handleSubmitForm = (formData: JournalInsert) => {
    createJournalMutation.mutate(formData, {
      onSuccess: () => {
        reset()
        onSubmitted()
      },
    })
  }

  return (
    <div>
      <h2 className="mb-s">New journal</h2>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className="flex flex-col gap-s"
      >
        <FormGroup label="Name" name="name">
          <Input
            id="name"
            placeholder="Journal name"
            autoComplete="off"
            autoFocus
            {...register('name', { required: true })}
          />
        </FormGroup>
        <FormGroup label="Description" name="description">
          <Input
            id="description"
            placeholder="Optional description"
            autoComplete="off"
            {...register('description')}
          />
        </FormGroup>
        <div>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </div>
  )
}

function RouteComponent() {
  const [journalFilter, setJournalFilter] = useState<number | undefined>()
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const { data: entriesResponse } = useSuspenseQuery(getJournalEntriesOptions())
  const { data: journalsResponse } = useSuspenseQuery(getJournalsOptions())
  const journals = journalsResponse?.data ?? []
  const createEntryMutation = useCreateJournalEntry()
  const updateEntryMutation = useUpdateJournalEntry()
  const batchMutation = useBatchUpdateJournalEntries()
  const deleteJournalMutation = useDeleteJournal()
  const activeJournal = journals.find(
    (journalItem) => journalItem.id === journalFilter,
  )
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<Set<number>>(() => new Set())

  const entries = useMemo(() => {
    const allEntries = entriesResponse?.data ?? []

    if (!journalFilter) {
      return allEntries
    }

    return allEntries.filter((item) => item.journal === journalFilter)
  }, [entriesResponse, journalFilter])
  // Only act on selected entries that are still listed
  const selectedIds = entries
    .filter((entry) => selection.has(entry.id))
    .map((entry) => entry.id)

  const handleSelectedChange = (id: number, isSelected: boolean) => {
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

  const handleDeleteJournal = () => {
    if (
      activeJournal &&
      confirm(
        `Delete the journal "${activeJournal.name}"? Its ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} will be kept, without a journal.`,
      )
    ) {
      deleteJournalMutation.mutate(activeJournal.id, {
        onSuccess: () => setJournalFilter(undefined),
      })
    }
  }

  const handleMoveEntries = (journal: number) => {
    batchMutation.mutate({
      action: { journal, type: 'move' },
      ids: selectedIds,
    })
  }

  const handleDeleteEntries = () => {
    if (
      confirm(
        `Are you sure you want to delete ${selectedIds.length} journal ${selectedIds.length === 1 ? 'entry' : 'entries'}?`,
      )
    ) {
      batchMutation.mutate(
        { action: { type: 'delete' }, ids: selectedIds },
        { onSuccess: () => setSelection(new Set()) },
      )
    }
  }

  const handleCreateEntry = (formData: JournalEntryInsert) => {
    createEntryMutation.mutate(formData, {
      onSuccess: () => {
        setIsEntryDialogOpen(false)
      },
    })
  }

  const handleUpdateEntry = (formData: JournalEntryInsert) => {
    if (!editingEntry) {
      return
    }

    updateEntryMutation.mutate(
      {
        data: formData,
        id: editingEntry.id,
      },
      {
        onSuccess: () => {
          setIsEntryDialogOpen(false)
          setEditingEntry(null)
        },
      },
    )
  }

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setIsEntryDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <h1 className="text-2xl font-bold">Journal</h1>
        <div className="flex flex-wrap gap-3xs">
          {activeJournal ? (
            <Button
              size="xs"
              variant="ghost"
              disabled={deleteJournalMutation.isPending}
              onClick={handleDeleteJournal}
            >
              <TrashIcon size={16} weight="duotone" /> Delete journal
            </Button>
          ) : null}
          {entries.length ? (
            <Button
              size="xs"
              variant="ghost"
              aria-pressed={isSelecting}
              onClick={() => {
                setIsSelecting((prev) => !prev)
                setSelection(new Set())
              }}
            >
              <CheckSquareIcon
                size={16}
                weight={isSelecting ? 'fill' : 'duotone'}
              />{' '}
              Select
            </Button>
          ) : null}
          <Dialog
            open={isJournalDialogOpen}
            onOpenChange={setIsJournalDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="xs" variant="ghost">
                <PlusCircleIcon size={16} weight="duotone" /> New journal
              </Button>
            </DialogTrigger>
            <DialogContent placement="center" width="m">
              <NewJournalForm
                onSubmitted={() => setIsJournalDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog
            open={isEntryDialogOpen}
            onOpenChange={(open) => {
              setIsEntryDialogOpen(open)
              if (!open) {
                setEditingEntry(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="xs" variant="ghost">
                <PlusCircleIcon size={16} weight="duotone" /> New entry
              </Button>
            </DialogTrigger>
            <DialogContent placement="center" width="m">
              <JournalEntryForm
                type={editingEntry ? 'edit' : 'new'}
                initialValues={
                  editingEntry
                    ? {
                        date: editingEntry.date,
                        end_date: editingEntry.end_date,
                        entry: editingEntry.entry,
                        journal: editingEntry.journal,
                        media: editingEntry.media,
                        time: editingEntry.time,
                      }
                    : { journal: journalFilter ?? null }
                }
                journals={journals}
                onFormSubmit={
                  editingEntry ? handleUpdateEntry : handleCreateEntry
                }
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {journals.length ? (
        <div className="flex items-center gap-4 flex-wrap">
          <IconControl
            type="radio"
            value=""
            label="All"
            name="journalFilter"
            onChange={() => setJournalFilter(undefined)}
            checked={!journalFilter}
          >
            <CircleIcon size={18} weight="duotone" />
          </IconControl>
          {journals.map((journalItem) => (
            <IconControl
              key={journalItem.id}
              type="radio"
              value={String(journalItem.id)}
              label={journalItem.name}
              name="journalFilter"
              onChange={(e) =>
                setJournalFilter(
                  e.currentTarget.checked ? journalItem.id : undefined,
                )
              }
              checked={journalFilter === journalItem.id}
            >
              <NotebookIcon size={18} weight="duotone" />
            </IconControl>
          ))}
        </div>
      ) : null}

      {isSelecting ? (
        <div className="card sticky top-2xs z-10 max-w-prose">
          <div className="flex flex-wrap items-center gap-2xs">
            <strong className="text-step--1">
              {selectedIds.length} selected
            </strong>
            {entries.length > 0 && selectedIds.length === entries.length ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelection(new Set())}
              >
                Deselect all
              </Button>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                onClick={() =>
                  setSelection(new Set(entries.map((entry) => entry.id)))
                }
              >
                Select all ({entries.length})
              </Button>
            )}
            {journals.length ? (
              <select
                aria-label="Move to journal"
                className="input-base focus w-auto text-step--2"
                disabled={batchMutation.isPending || selectedIds.length === 0}
                onChange={(event) => {
                  if (event.target.value) {
                    handleMoveEntries(Number(event.target.value))
                  }
                }}
                value=""
              >
                <option value="" disabled hidden>
                  Move to…
                </option>
                {journals.map((journalItem) => (
                  <option key={journalItem.id} value={journalItem.id}>
                    {journalItem.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              size="xs"
              variant="ghost"
              disabled={batchMutation.isPending || selectedIds.length === 0}
              onClick={handleDeleteEntries}
            >
              <TrashIcon size={16} weight="duotone" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="max-w-prose">
        {entries.length ? (
          entries.map((entry) => (
            <JournalEntryItem
              key={entry.id}
              entry={entry}
              onEdit={handleEditEntry}
              onSelectJournal={setJournalFilter}
              {...(isSelecting
                ? {
                    isSelected: selection.has(entry.id),
                    onSelectedChange: handleSelectedChange,
                  }
                : {})}
            />
          ))
        ) : (
          <p>No journal entries yet. Write your first one!</p>
        )}
      </div>
    </div>
  )
}
