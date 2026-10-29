import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, Search, Sparkles } from "lucide-react";
import { SupportedCountry } from "@/lib/pixel-feeder/types";
import {
  COUNTRIES_CATALOG,
  CountryMeta,
  matchCountry,
  parseCountriesQuery,
} from "@/lib/pixel-feeder/countries";

interface CountrySelectDropdownProps {
  selectedCountries: SupportedCountry[];
  onChange: (countries: SupportedCountry[]) => void;
  disabled?: boolean;
}

export function CountrySelectDropdown({
  selectedCountries,
  onChange,
  disabled,
}: CountrySelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCountry = (code: SupportedCountry) => {
    if (selectedCountries.includes(code)) {
      onChange(selectedCountries.filter((c) => c !== code));
    } else {
      onChange([...selectedCountries, code]);
    }
  };

  const removeCountry = (code: SupportedCountry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedCountries.filter((c) => c !== code));
  };

  // Handle typing comma-separated countries
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedInput(val);

    // If user typed a comma, process immediately
    if (val.includes(",")) {
      commitTypedQuery(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTypedQuery(typedInput);
    } else if (e.key === "Backspace" && !typedInput && selectedCountries.length > 0) {
      // remove last tag
      removeCountry(selectedCountries[selectedCountries.length - 1]);
    }
  };

  const commitTypedQuery = (query: string) => {
    if (!query.trim()) return;
    const parsed = parseCountriesQuery(query);
    if (parsed.length > 0) {
      // Merge with existing
      const combined = Array.from(new Set([...selectedCountries, ...parsed]));
      onChange(combined);
      setTypedInput("");
    } else {
      // Try single word fuzzy match
      const matched = matchCountry(query);
      if (matched && !selectedCountries.includes(matched.code)) {
        onChange([...selectedCountries, matched.code]);
        setTypedInput("");
      } else if (query.trim().length === 2) {
        // Direct ISO 2-letter code fallback
        const upper = query.trim().toUpperCase();
        if (!selectedCountries.includes(upper)) {
          onChange([...selectedCountries, upper]);
          setTypedInput("");
        }
      }
    }
  };

  const selectAll = () => {
    onChange(COUNTRIES_CATALOG.map((c) => c.code));
  };

  const selectTop = () => {
    onChange(["BR", "US", "PT", "ES", "GB", "FR", "DE", "IT", "MX", "AR", "CL", "CO"]);
  };

  const clearAll = () => {
    onChange(["BR"]);
  };

  const filteredCatalog = COUNTRIES_CATALOG.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.aliases.some((a) => a.includes(q))
    );
  });

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {/* Box with selected pills + inline typing input */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={`min-h-9 w-full rounded-md border border-border bg-background/50 px-2 py-1 text-xs transition-colors cursor-text flex flex-wrap items-center gap-1.5 ${
          isOpen ? "ring-1 ring-ring border-primary/50" : "hover:border-foreground/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {selectedCountries.map((code) => {
          const item = COUNTRIES_CATALOG.find((c) => c.code === code);
          const name = item ? item.name : code;
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/80 bg-muted/40 text-foreground text-[11px] font-medium"
            >
              <span>{name}</span>
              <span className="text-[9px] text-muted-foreground uppercase">({code})</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeCountry(code, e)}
                  className="text-muted-foreground hover:text-rose-400 ml-0.5 transition-colors"
                  title={`Remover ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}

        {/* Inline input to type and add comma-separated */}
        <input
          ref={inputRef}
          type="text"
          value={typedInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={
            selectedCountries.length === 0
              ? "Digite países (ex: Brasil, EUA, Espanha)..."
              : "Adicionar (ex: Portugal, Chile)..."
          }
          disabled={disabled}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/60 py-0.5"
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          className="ml-auto text-muted-foreground hover:text-foreground shrink-0 p-1"
          tabIndex={-1}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Helper hint & actions */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
        <span>Digite nomes separados por vírgula (reconhece erros e sinônimos).</span>
        <div className="flex items-center gap-2">
          {selectedCountries.length > 0 && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-rose-400 hover:text-rose-300 transition-colors font-medium hover:underline"
            >
              Limpar seleção
            </button>
          )}
          <span className="font-mono">{selectedCountries.length} selecionado(s)</span>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-xl p-2.5 space-y-2 animate-fade-in">
          {/* Quick filter inside dropdown */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrar lista de países..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full h-8 pl-8 pr-2 rounded-md border border-border bg-background/60 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-b border-border/40 pb-2">
            <button
              type="button"
              onClick={selectTop}
              className="text-[10px] px-2 py-0.5 rounded border border-border bg-background/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              Principais (Américas + Europa)
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] px-2 py-0.5 rounded border border-border bg-background/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              Marcar Todos ({COUNTRIES_CATALOG.length})
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              Desmarcar Todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] px-2 py-0.5 rounded border border-border bg-background/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              Resetar (BR)
            </button>
          </div>

          {/* Catalog list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 text-xs">
            {filteredCatalog.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Nenhum país encontrado para "{searchFilter}"
              </p>
            ) : (
              filteredCatalog.map((country) => {
                const isSelected = selectedCountries.includes(country.code);
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => toggleCountry(country.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/40 text-foreground/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded border border-border/60 bg-muted/30 text-muted-foreground">
                        {country.code}
                      </span>
                      <span>{country.name}</span>
                    </div>

                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
