import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { canCreateCase, ROLE_INFO } from "@/lib/domain";
import { api, USE_MOCK } from "@/services/api";
import { cn } from "@/lib/utils";

const IDLE_TIMEOUT = 15 * 60_000;
const IDLE_WARNING = 60_000;

export function AppShell() {
  const user = useAuth((s) => s.user)!;
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useIdleLogout({
    timeoutMs: IDLE_TIMEOUT,
    warnBeforeMs: IDLE_WARNING,
    onWarn: () =>
      toast.warning("Sua sessão será encerrada em 1 minuto por inatividade", {
        id: "idle",
        description: "Estações de trabalho são compartilhadas. Mova o mouse para continuar conectado.",
        duration: IDLE_WARNING,
      }),
    onTimeout: () => {
      toast.dismiss("idle");
      void logout("inatividade");
    },
  });

  const nav = [
    { to: "/app", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/app/casos", label: "Casos", icon: FolderOpen, end: false },
    ...(canCreateCase(user.role)
      ? [{ to: "/app/casos/novo", label: "Novo caso", icon: PlusCircle, end: true }]
      : []),
    { to: "/app/glossario", label: "Glossário", icon: BookOpen, end: true },
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo to="/app" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navegação principal">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive && !(item.to === "/app/casos" && location.pathname === "/app/casos/novo")
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <ShieldCheck className="size-3.5 text-accent" /> A IA sugere, você decide
        </p>
        <p className="mt-1 leading-relaxed">
          As sugestões do modelo apoiam, mas não substituem, a avaliação clínica. Toda decisão fica registrada.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card lg:block">{sidebar}</aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="left-0 right-auto max-w-64 border-l-0 border-r data-[state=open]:animate-fade-in">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          {sidebar}
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        {USE_MOCK && (
          <div className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-1.5 text-center text-xs text-slate-200">
            <FlaskConical className="size-3.5 text-amber-300" aria-hidden />
            Ambiente de demonstração — pacientes, imagens e sugestões são simulados.
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </Button>
          <QuickSearch key={location.pathname} />
          <div className="ml-auto flex items-center gap-2">
            <UserMenu onLogout={() => void logout()} />
          </div>
        </header>
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function QuickSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  return (
    <form
      role="search"
      className="relative w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(`/app/casos${value.trim() ? `?busca=${encodeURIComponent(value.trim())}` : ""}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar paciente, prontuário ou caso…"
        aria-label="Buscar casos"
        className="h-9 bg-muted/60 pl-9"
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
    toast.success("Dados de demonstração restaurados");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition-colors hover:bg-muted">
          <Avatar name={user.name} className="size-8 text-xs" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{ROLE_INFO[user.role].label}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">{user.name}</span>
          <span className="block">{user.email}</span>
          <span className="mt-1 block">
            {user.registry} · {user.institution}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {USE_MOCK && (
          <DropdownMenuItem onSelect={() => void resetDemo()}>
            <RotateCcw /> Restaurar dados de demonstração
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={onLogout}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
