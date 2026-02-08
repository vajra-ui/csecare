import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface MobileSidebarProps {
  children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div onClick={() => setOpen(false)} className="h-full">
              {children}
            </div>
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-display font-semibold text-sm">CSE Portal</span>
      </div>
      {/* Spacer for fixed header */}
      <div className="md:hidden h-14" />
    </>
  );
}
