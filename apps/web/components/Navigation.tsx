"use client";

import { Button } from "@ui/base";
import { Linkedin, Facebook, Twitter, User, LogOut, Settings, Github } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@ui/base";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/base";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { navigationLinks } from "./links";

const Navigation = () => {
  const { data: session } = useSession();

  const user = session?.user;
  const isAuthenticated = session?.user != null;

  const handleLogout = () => {
    signOut();
    redirect('/');
  };

  return (
    <nav className="flex items-center justify-between p-6 bg-background border-b border-border">
      <div className="flex items-center space-x-8">
        
        <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">A</span>
            <span className="font-semibold tracking-tight">Authless</span>
          </Link>
        <div className="hidden md:flex items-center space-x-6">
            {navigationLinks.map((link) =>
          <Link href={link.href} key={link.href} className="text-foreground hover:text-primary transition-colors">
                    {link.label}
                </Link>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
      
      <Button asChild variant="outline">
        <Link href="https://github.com/your-org/authless" target="_blank" rel="noreferrer">
          <Github className="mr-2 h-4 w-4" /> GitHub
        </Link>
      </Button>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="hover:text-primary">
            <Linkedin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-primary">
            <Facebook className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-primary">
            <Twitter className="h-4 w-4" />
          </Button>
        </div>
        
        {isAuthenticated ?
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.name}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> :

        <div className="flex items-center space-x-2">
            <Link href="/auth/signin">
              <Button variant="outline">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button>
                Sign Up
              </Button>
            </Link>
          </div>
        }
      </div>
    </nav>);

};

export default Navigation;