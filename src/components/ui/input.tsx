import * as React from "react"

import { cn } from "@/lib/utils"

// Native date/month/etc. inputs only open their picker when the click lands
// on the small calendar glyph — clicking the rest of the field just places a
// text cursor. showPicker() makes the whole field open it, matching the
// custom Popover date pickers elsewhere in the app where the whole field is
// clickable.
const PICKER_INPUT_TYPES = new Set(["date", "month", "time", "week", "datetime-local"])

function Input({ className, type, onClick, ...props }: React.ComponentProps<"input">) {
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    onClick?.(e)
    if (type && PICKER_INPUT_TYPES.has(type) && !props.disabled && !props.readOnly) {
      const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
      if (typeof el.showPicker === "function") {
        try {
          el.showPicker()
        } catch {
          // Not user-gesture-triggered, or unsupported in this context — ignore.
        }
      }
    }
  }

  return (
    <input
      type={type}
      data-slot="input"
      onClick={handleClick}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
