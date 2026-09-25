import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghostDanger'

const styles: Record<Variant, string> = {
  primary: 'bg-lime text-bg hover:brightness-95',
  secondary:
    'bg-surface-2 text-text border border-border hover:border-muted',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface-2',
  ghostDanger: 'bg-transparent text-muted hover:bg-danger/15 hover:text-danger',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  className = '',
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-40',
        styles[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
