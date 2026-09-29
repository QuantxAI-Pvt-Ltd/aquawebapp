"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
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
  "inline-flex items-center justify-center rounded-xl bg-secondary/60 p-1 text-muted-foreground border border-border/70 shadow-2xs select-none",
  {
    variants: {
      variant: {
        default: "gap-1",
        line: "gap-2 bg-transparent border-0 p-0",
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
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs md:text-sm font-semibold whitespace-nowrap text-muted-foreground transition-all duration-150 cursor-pointer select-none",
        "hover:text-foreground hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "data-active:bg-card data-active:text-primary data-active:shadow-sm data-active:ring-2 data-active:ring-[#E23E57] data-active:font-bold",
        "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-2 data-[state=active]:ring-[#E23E57] data-[state=active]:font-bold",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
