import * as React from "react"
import { cn } from "@/lib/utils"

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

export function PageTitle({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("text-h2 text-text-primary mb-2", className)}>
      {children}
    </h1>
  )
}

export function PageDescription({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-body text-text-secondary", className)}>
      {children}
    </p>
  )
}

export function CardTitle({ children, className }: TypographyProps) {
  return (
    <h3 className={cn("text-h5 text-text-primary font-medium", className)}>
      {children}
    </h3>
  )
}

export function MetricValue({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-3xl font-bold text-text-primary", className)}>
      {children}
    </div>
  )
}

export function SectionHeading({ children, className }: TypographyProps) {
  return (
    <h2 className={cn("text-h3 text-text-primary font-semibold", className)}>
      {children}
    </h2>
  )
}

export function Overline({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-overline text-text-tertiary uppercase", className)}>
      {children}
    </p>
  )
}

export function Caption({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-caption text-text-secondary", className)}>
      {children}
    </p>
  )
}