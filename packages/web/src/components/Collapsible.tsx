import switchOffSfx from '@mrmartineau/kit/sounds/switch-off.mp3'
import switchOnSfx from '@mrmartineau/kit/sounds/switch-on.mp3'
import useSound from '@mrmartineau/use-sound'
import { CaretUpDownIcon } from '@phosphor-icons/react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { Button } from '@/components/Button'

import { Flex } from './Flex'

// Sections start closed and their open state is not saved: opening one is
// instant and never waits on the server.
export const Collapsible = ({
  children,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Root>) => {
  const [playSwitchOn] = useSound(switchOnSfx, { volume: 0.3 })
  const [playSwitchOff] = useSound(switchOffSfx, { volume: 0.3 })

  return (
    <CollapsiblePrimitive.Root
      onOpenChange={(open) => (open ? playSwitchOn() : playSwitchOff())}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Root>
  )
}

Collapsible.displayName = 'Collapsible'

export const CollapsibleContent = (
  props: ComponentProps<typeof CollapsiblePrimitive.Content>,
) => (
  <CollapsiblePrimitive.Content {...props} className="overflow-hidden pt-3xs" />
)

export const CollapsibleTrigger = ({
  children,
  ...rest
}: ComponentProps<typeof CollapsiblePrimitive.Trigger>) => {
  return (
    <CollapsiblePrimitive.Trigger asChild {...rest}>
      <Button variant="collapsible">
        <div className="rounded bg-theme3 p-1">
          <CaretUpDownIcon weight="duotone" size={14} />
        </div>
        <Flex justify="between" align="center" className="grow text-step--2">
          {children}
        </Flex>
      </Button>
    </CollapsiblePrimitive.Trigger>
  )
}
