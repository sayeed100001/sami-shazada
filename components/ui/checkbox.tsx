'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-slate-400 bg-white text-transparent shadow-sm ring-offset-background transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:text-white data-[state=checked]:border-violet-600 dark:border-slate-500 dark:bg-slate-950 dark:hover:border-slate-300 dark:data-[state=checked]:bg-violet-500 dark:data-[state=checked]:text-white dark:data-[state=checked]:border-violet-500',
      className
    )}
    checked={checked}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      {checked === 'indeterminate' ? (
        <Minus className="h-3.5 w-3.5 stroke-[3.2]" />
      ) : (
        <Check className="h-3.5 w-3.5 stroke-[3.2]" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
