import { Star } from "lucide-react";

/** 1–5 star rating; interactive when onChange is provided. */
export function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        const icon = <Star className={`${cls} ${on ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />;
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange(n)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </div>
  );
}
