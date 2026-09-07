import type { TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export default function TextArea({ label, className = '', ...rest }: TextAreaProps) {
  const id = useId()
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[13.5px] text-ink-soft">{label}</label>
      <textarea
        id={id}
        rows={3}
        // resize-y : agrandissement vertical possible, sans casser la largeur de la
        // mise en page.
        className={`w-full bg-surface border border-rule rounded-lg px-3 py-2 text-[15px] resize-y placeholder:text-ink-faint disabled:bg-sunk ${className}`}
        {...rest}
      />
    </div>
  )
}
