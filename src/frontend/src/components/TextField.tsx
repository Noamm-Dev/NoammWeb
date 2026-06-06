import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"

interface BaseFieldProps {
  label: string
  helperText?: string
  icon?: ReactNode
}

interface TextInputProps
  extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  multiline?: false
}

interface TextareaProps
  extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true
}

interface FieldShellProps extends BaseFieldProps {
  children: ReactNode
}

type TextFieldProps = TextInputProps | TextareaProps

const CONTROL_CLASSES = "w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"

function FieldShell({ children, helperText, icon, label }: FieldShellProps) {
  return (
    <label className="block text-left">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
        { icon ? (
          <span className="grid h-3.5 w-3.5 place-items-center">{ icon }</span>
        ) : null }
        <span>{ label }</span>
      </span>
      { children }
      { helperText ? (
        <span className="mt-2 block text-xs leading-5 text-white/40">
          { helperText }
        </span>
      ) : null }
    </label>
  )
}

export function TextField(props: TextFieldProps) {
  if (props.multiline) {
    const { className = "", helperText, icon, label, multiline, ...textareaProps } = props
    void multiline

    return (
      <FieldShell helperText={ helperText } icon={ icon } label={ label }>
        <textarea
          { ...textareaProps }
          className={ `${ CONTROL_CLASSES } min-h-28 resize-y ${ className }` }
        />
      </FieldShell>
    )
  }

  const { className = "", helperText, icon, label, multiline, ...inputProps } = props
  void multiline

  return (
    <FieldShell helperText={ helperText } icon={ icon } label={ label }>
      <input { ...inputProps } className={ `${ CONTROL_CLASSES } ${ className }` }/>
    </FieldShell>
  )
}