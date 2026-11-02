import { forwardRef, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { Input } from "./input";

/** Valor enquanto a data ainda não está completa e válida: mantém o campo reprovado na validação. */
export const INCOMPLETE_DATE = "incompleta";

function isoToDisplay(iso?: string) {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function maskDigits(digits: string) {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function digitsToIso(digits: string) {
  if (digits.length !== 8) return null;
  const [d, m, y] = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  // o Date "corrige" 31/02 para março: a comparação detecta datas que não existem
  return date.getMonth() === Number(m) - 1 && date.getDate() === Number(d) ? `${y}-${m}-${d}` : null;
}

interface DateInputProps {
  id: string;
  /** Data no formato ISO (aaaa-mm-dd), vazia ou `INCOMPLETE_DATE`. */
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  max?: string;
  invalid?: boolean;
  calendarLabel: string;
}

/** Data digitada como dd/mm/aaaa, com as barras automáticas e o calendário do navegador como alternativa. */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ id, value, onChange, onBlur, max, invalid, calendarLabel }, ref) => {
    const [text, setText] = useState(() => isoToDisplay(value));
    const picker = useRef<HTMLInputElement>(null);

    const type = (raw: string) => {
      const digits = raw.replace(/\D/g, "").slice(0, 8);
      setText(maskDigits(digits));
      onChange(digits ? (digitsToIso(digits) ?? INCOMPLETE_DATE) : "");
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          value={text}
          onChange={(e) => type(e.target.value)}
          onBlur={onBlur}
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          aria-invalid={invalid}
          className="pr-10 tabular-nums"
        />
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden
          max={max}
          value={value && value !== INCOMPLETE_DATE ? value : ""}
          onChange={(e) => {
            setText(isoToDisplay(e.target.value));
            onChange(e.target.value);
          }}
          className="pointer-events-none absolute bottom-0 right-0 size-0 opacity-0"
        />
        <button
          type="button"
          aria-label={calendarLabel}
          onClick={() => picker.current?.showPicker()}
          className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Calendar className="size-4" aria-hidden />
        </button>
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
