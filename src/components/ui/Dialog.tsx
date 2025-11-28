import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// Simplified Dialog Context/State - not a full Radix implementation
const DialogContext = React.createContext<{ open: boolean, setOpen: (open: boolean) => void }>({ open: false, setOpen: () => {} })

const Dialog = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

// DialogTrigger (simplified as a wrapper that toggles state)
const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, className, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext)
  const Comp = asChild ? 'span' : 'button'
  return (
    <Comp
      ref={ref}
      className={cn("cursor-pointer", className)}
      onClick={() => setOpen(true)}
      {...props}
    />
  )
})
DialogTrigger.displayName = "DialogTrigger"

// DialogContent (simplified - modal overlay and content wrapper)
const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DialogContext)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()} // Prevent closing on content click
        {...props}
      >
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  React.ElementRef<"h2">,
  React.ComponentPropsWithoutRef<"h2">
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
}