// src/components/ui/combobox.tsx

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  createMessage?: (value: string) => string;
}

export function Combobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Selecione...",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum item encontrado.",
  createMessage = (value) => `Criar "${value}"`,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  
  const selectedLabel = options.find((option) => option.value.toLowerCase() === value.toLowerCase())?.label;

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateOption =
    onCreate &&
    inputValue &&
    !filteredOptions.some(
      (option) => option.label.toLowerCase() === inputValue.toLowerCase()
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ minWidth: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {!showCreateOption ? emptyMessage : <span>&nbsp;</span>}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use o label para a seleção no CMD-K
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  value={inputValue}
                  onSelect={() => {
                    onCreate(inputValue);
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {createMessage(inputValue)}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}