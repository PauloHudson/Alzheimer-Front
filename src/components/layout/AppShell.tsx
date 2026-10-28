import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronsUpDown, FolderOpen, LogOut, Menu, PlusCircle, RotateCcw, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { useAuth } from "@/store/auth";
import { useLogout } from "@/hooks/useLogout";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { api, USE_MOCK } from "@/services/api";
import { cn } from "@/lib/utils";

const IDLE_TIMEOUT = 15 * 60_000;
const IDLE_WARNING = 60_000;

export function AppShell() {
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useIdleLogout({
    timeoutMs: IDLE_TIMEOUT,
    warnBeforeMs: IDLE_WARNING,
    onWarn: () =>
      toast.warning("Sua sessão será encerrada em 1 minuto por inatividade", {
        id: "idle",
        description: "Mova o mouse para continuar conectado.",
        duration: IDLE_WARNING,
      }),
    onTimeout: () => {
      toast.dismiss("idle");
      void logout("inatividade");
    },
  });

  const isNewCase = location.pathname === "/app/casos/novo";
  const nav = [
    { to: "/app", label: "Casos", icon: FolderOpen, active: !isNewCase },
    { to: "/app/casos/novo", label: "Novo caso", icon: PlusCircle, active: isNewCase },
  ];

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2">
        <Logo to="/app" />
      </div>
      <QuickSearch key={location.pathname} onSearch={() => setMobileOpen(false)} />
      <nav className="flex-1 space-y-1" aria-label="Navegação principal">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              item.active
                ? "bg-muted text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4", item.active && "text-primary")} aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          Tema
          <ThemeToggle className="size-8" />
        </div>
        <UserMenu onLogout={() => void logout()} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card lg:block">{sidebar}</aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="left-0 right-auto max-w-72 border-l-0 border-r data-[state=open]:animate-fade-in">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          {sidebar}
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu />
          </Button>
          <Logo to="/app" />
          <ThemeToggle className="ml-auto" />
        </header>
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function QuickSearch({ onSearch }: { onSearch: () => void }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
        navigate(`/app${value.trim() ? `?busca=${encodeURIComponent(value.trim())}` : ""}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar paciente…"
        aria-label="Buscar casos"
        className="h-10 bg-background pl-9"
      />
    </form>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const user = useAuth((s) => s.user)!;
  const queryClient = useQueryClient();

  const resetDemo = async () => {
    await api.demo?.reset();
    await queryClient.invalidateQueries();
    toast.success("Dados iniciais restaurados");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted">
          <Avatar name={user.name} className="size-9 text-xs" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">{user.name}</span>
          <span className="block">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {USE_MOCK && (
          <DropdownMenuItem onSelect={() => void resetDemo()}>
            <RotateCcw /> Restaurar dados iniciais
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={onLogout}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
