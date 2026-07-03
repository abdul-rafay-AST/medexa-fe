import Link from "next/link";
import { Search, Bell, Menu, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-medexa-gray-200 bg-white">
      <div className="flex h-14 md:h-16 items-center px-3 md:px-6 gap-2 min-w-0">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0 bg-medexa-gray-50 text-medexa-gray-900">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-medexa-blue tracking-tight">
            Medexa
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-center px-2 md:px-6 hidden sm:flex">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-medexa-gray-500" />
            <input
              type="text"
              placeholder="Search patients or sessions..."
              className="w-full rounded-full bg-medexa-gray-50 border-transparent pl-10 pr-4 py-2 text-sm text-medexa-gray-900 focus:border-medexa-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-medexa-blue/20 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">
          <Button variant="ghost" size="icon" className="text-medexa-blue relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-medexa-blue" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          <Button variant="outline" size="sm" className="hidden sm:flex rounded-full text-medexa-gray-900 bg-medexa-gray-50 border-medexa-gray-200 gap-1.5">
            <Globe className="h-3.5 w-3.5 text-medexa-gray-500" /> Eng
          </Button>
          
          <div className="flex items-center gap-2 md:gap-3 md:border-l md:pl-4 md:ml-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://i.pravatar.cc/150?u=sarah" alt="@dr.sarah" />
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-sm text-left">
              <span className="font-semibold leading-none text-medexa-gray-900">Dr. Sarah Miller</span>
              <span className="text-xs text-medexa-gray-500 mt-1">Clinician</span>
            </div>
            <ChevronDown className="h-4 w-4 text-medexa-gray-500 hidden md:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
