import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg mx-1 text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-slate-100 shadow-inner",
        line: "gap-1 bg-transparent p-0 rounded-none",
        /** Premium bordered strip with underline bar on the active tab. */
        underline: "w-full justify-start gap-6 rounded-none border-b border-slate-200 bg-transparent p-0 shadow-none group-data-horizontal/tabs:h-auto",
        /** Folder-style tabs that mingle with content. */
        folder: "w-full justify-start gap-0 -space-x-px rounded-none bg-transparent p-0 shadow-none group-data-horizontal/tabs:h-auto mb-[-1px] mx-0 relative z-10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-[14px] font-medium font-hanken transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 z-10",
        
        // Default Variant
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=default]/tabs-list:data-[state=active]:text-white group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none group-data-[variant=default]/tabs-list:hover:text-[#004D40]",
        
        // Underline Variant
        "group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:bg-transparent group-data-[variant=underline]/tabs-list:px-1 group-data-[variant=underline]/tabs-list:py-3 group-data-[variant=underline]/tabs-list:font-semibold group-data-[variant=underline]/tabs-list:text-slate-500 group-data-[variant=underline]/tabs-list:hover:text-slate-900",
        "group-data-[variant=underline]/tabs-list:data-[state=active]:text-[#111827] group-data-[variant=underline]/tabs-list:data-[state=active]:shadow-none",
        "group-data-[variant=underline]/tabs-list:after:absolute group-data-[variant=underline]/tabs-list:after:bottom-0 group-data-[variant=underline]/tabs-list:after:left-0 group-data-[variant=underline]/tabs-list:after:h-[2.5px] group-data-[variant=underline]/tabs-list:after:w-full group-data-[variant=underline]/tabs-list:after:bg-[#111827] group-data-[variant=underline]/tabs-list:after:opacity-0 group-data-[variant=underline]/tabs-list:data-[state=active]:after:opacity-100 group-data-[variant=underline]/tabs-list:after:transition-all",
        
        // Line Variant
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:after:bottom-0 group-data-[variant=line]/tabs-list:after:h-[2px] group-data-[variant=line]/tabs-list:after:bg-primary group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        
        // Folder Variant
        "group-data-[variant=folder]/tabs-list:rounded-none group-data-[variant=folder]/tabs-list:rounded-t-md group-data-[variant=folder]/tabs-list:border group-data-[variant=folder]/tabs-list:border-gray-300 group-data-[variant=folder]/tabs-list:border-b-0 group-data-[variant=folder]/tabs-list:bg-gray-50/50 group-data-[variant=folder]/tabs-list:px-6 group-data-[variant=folder]/tabs-list:py-2.5 group-data-[variant=folder]/tabs-list:font-extrabold group-data-[variant=folder]/tabs-list:text-gray-500 group-data-[variant=folder]/tabs-list:hover:text-gray-700 group-data-[variant=folder]/tabs-list:hover:bg-gray-100 group-data-[variant=folder]/tabs-list:tracking-wide group-data-[variant=folder]/tabs-list:text-[14px]",
        "group-data-[variant=folder]/tabs-list:data-[state=active]:border-gray-400 group-data-[variant=folder]/tabs-list:data-[state=active]:bg-white group-data-[variant=folder]/tabs-list:data-[state=active]:text-gray-900 group-data-[variant=folder]/tabs-list:data-[state=active]:shadow-none group-data-[variant=folder]/tabs-list:data-[state=active]:border-b-white group-data-[variant=folder]/tabs-list:data-[state=active]:pb-[11px] group-data-[variant=folder]/tabs-list:data-[state=active]:mb-[-1px] group-data-[variant=folder]/tabs-list:data-[state=active]:z-20 group-data-[variant=folder]/tabs-list:data-[state=active]:relative",
        
        // Shared icon styles
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1",
        
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
