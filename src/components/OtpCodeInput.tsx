import { useRef } from "react"

interface OtpCodeInputProps {
  id?: string
  length: number
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

const sanitizeDigits = (value: string) => value.replace(/\D/g, "")

export function OtpCodeInput({ id, length, value, disabled = false, onChange }: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? "")

  function focusIndex(index: number) {
    const nextInput = inputRefs.current[index]
    if (! nextInput) return

    nextInput.focus()
    nextInput.select()
  }

  function updateAt(index: number, nextValue: string) {
    const sanitized = sanitizeDigits(nextValue)

    if (sanitized.length === 0) {
      const nextDigits = [ ...digits ]
      nextDigits[index] = ""
      onChange(nextDigits.join(""))
      return
    }

    const nextDigits = [ ...digits ]

    for (let offset = 0; offset < sanitized.length; offset += 1) {
      const targetIndex = index + offset
      if (targetIndex >= length) break
      nextDigits[targetIndex] = sanitized[offset] ?? ""
    }

    onChange(nextDigits.join(""))
    focusIndex(Math.min(index + sanitized.length, length - 1))
  }

  return (
    <div
      className="grid gap-2 sm:gap-3"
      style={ { gridTemplateColumns: `repeat(${ length }, minmax(0, 1fr))` } }
    >
      { digits.map((digit, index) => (
        <input
          aria-label={ `Digit ${ index + 1 } of the MC-ID code` }
          autoComplete={ index === 0 ? "one-time-code" : "off" }
          className="otp-input min-w-0"
          disabled={ disabled }
          id={ index === 0 ? id : undefined }
          inputMode="numeric"
          key={ index }
          maxLength={ 1 }
          onChange={ (event) => updateAt(index, event.target.value) }
          onFocus={ (event) => event.target.select() }
          onKeyDown={ (event) => {
            if (event.key === "Backspace") {
              if (digits[index] !== "") {
                const nextDigits = [ ...digits ]
                nextDigits[index] = ""
                onChange(nextDigits.join(""))
                return
              }

              if (index > 0) {
                const nextDigits = [ ...digits ]
                nextDigits[index - 1] = ""
                onChange(nextDigits.join(""))
                focusIndex(index - 1)
              }

              return
            }

            if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault()
              focusIndex(index - 1)
              return
            }

            if (event.key === "ArrowRight" && index < length - 1) {
              event.preventDefault()
              focusIndex(index + 1)
            }
          } }
          onPaste={ (event) => {
            event.preventDefault()
            updateAt(index, event.clipboardData.getData("text"))
          } }
          pattern="\d*"
          ref={ (element) => {
            inputRefs.current[index] = element
          } }
          type="text"
          value={ digit }
        />
      )) }
    </div>
  )
}