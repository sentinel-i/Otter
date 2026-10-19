import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { UpdateInfoForm } from '@/components/UpdateInfoForm'
import { useUser } from '@/components/UserProvider'
import { getSession } from '@/utils/fetching/user'

export const Route = createFileRoute('/_app/settings/account')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Account settings',
      },
    ],
  }),
  loader: async () => {
    const session = await getSession()
    return session?.user ?? null
  },
})

const OpenInNewTabSetting = () => {
  const { profile, handleUpdateUISettings } = useUser()
  // Local state so the checkbox reacts instantly, even if a profile refetch
  // briefly returns the previous value
  const [isChecked, setIsChecked] = useState(
    () => profile?.settings_open_in_new_tab ?? false,
  )

  return (
    <label className="flex items-center gap-2xs">
      <input
        type="checkbox"
        className="size-5 shrink-0 cursor-pointer accent-accent9"
        checked={isChecked}
        onChange={(event) => {
          setIsChecked(event.target.checked)
          handleUpdateUISettings({
            payload: event.target.checked,
            type: 'settings_open_in_new_tab',
          })
        }}
      />
      Open bookmarks in a new tab
    </label>
  )
}

function RouteComponent() {
  const user = Route.useLoaderData()

  return (
    <article className="flow">
      <h3>User info</h3>
      Account ID: <CodeBlock>{user?.id}</CodeBlock>
      <h3>Update account</h3>
      <UpdateInfoForm user={user} />
      <h3>Preferences</h3>
      <OpenInNewTabSetting />
      <p className="text-step--1 text-theme10">
        The &ldquo;More&rdquo; menu on each bookmark always offers the other
        option.
      </p>
    </article>
  )
}
