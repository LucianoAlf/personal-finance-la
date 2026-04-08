import { useTheme } from "@/contexts/ThemeContext"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-border group-[.toaster]:bg-surface-overlay group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_24px_60px_rgba(7,12,24,0.45)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:border group-[.toast]:border-border group-[.toast]:bg-surface-elevated group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
