'use client'

import { Month } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

interface MonthSelectorProps {
  months: Month[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddMonth: () => void
}

export function MonthSelector({
  months,
  selectedId,
  onSelect,
  onAddMonth,
}: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedId ?? ''} onValueChange={onSelect}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onAddMonth} title="Add new month">
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}