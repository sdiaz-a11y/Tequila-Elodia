'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PERIODS, parsePeriod } from '@/lib/period';

/** The selected period lives in the URL (`?periodo=`), so it is shareable and survives reloads. */
export function PeriodSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = parsePeriod(params.get('periodo'));
  const label = PERIODS.find((p) => p.key === current)!.label;

  const select = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('periodo', key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Periodo: ${label}`}
          title={`Periodo: ${label}`}
        >
          <CalendarRange className="text-faint" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className="text-faint" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        {PERIODS.map((p) => (
          <DropdownMenuItem key={p.key} onSelect={() => select(p.key)}>
            <span className="flex-1">{p.label}</span>
            {p.key === current ? <Check className="!text-gold" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
