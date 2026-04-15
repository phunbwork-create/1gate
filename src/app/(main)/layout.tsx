"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Role } from "@prisma/client"
import { getMenuForRole } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NotificationBell } from "@/components/layout/notification-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  ShoppingCart,
  CreditCard,
  Banknote,
  Calendar,
  FileCheck,
  Users,
  Building2,
  Store,
  Boxes,
  ChevronLeft,
  Menu,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react"

// ─── ICON MAP ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  Package,
  ShoppingCart,
  CreditCard,
  Banknote,
  Calendar,
  FileCheck,
  Users,
  Building2,
  Store,
  Boxes,
}

// ─── ROLE LABELS ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  Admin: "Quản trị viên",
  Staff: "Nhân viên",
  DeptHead: "Trưởng phòng",
  Warehouse: "Thủ kho",
  Purchasing: "Mua hàng",
  Accountant: "Kế toán",
  ChiefAccountant: "Kế toán trưởng",
  Director: "Giám đốc",
}

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-500/10 text-red-400 border-red-500/20",
  Staff: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  DeptHead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Warehouse: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Purchasing: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Accountant: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  ChiefAccountant: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Director: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
}

// ─── SIDEBAR CONTENT ─────────────────────────────────────────────────────────

function SidebarContent({
  collapsed,
  setCollapsed,
  pathname,
  menu,
  session,
}: {
  collapsed: boolean
  setCollapsed: (val: boolean) => void
  pathname: string
  menu: ReturnType<typeof getMenuForRole>
  session: ReturnType<typeof useSession>["data"]
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  const role = user?.role as Role

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-white">1G</span>
            </div>
            <span className="text-lg font-bold tracking-tight">1Gate</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hidden lg:flex"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {/* Main menu */}
          <div className={`${collapsed ? "px-0" : "px-1"} mb-2`}>
            {!collapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Menu chính
              </span>
            )}
          </div>
          {menu.main.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
                  ${isActive
                    ? "bg-sidebar-accent text-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }
                  ${collapsed ? "justify-center px-2" : ""}
                `}
              >
                <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span>{item.title}</span>}
                {!collapsed && item.badge && (
                  <Badge variant="secondary" className="ml-auto h-5 text-[10px] px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <TooltipProvider key={item.href} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            }

            return linkContent
          })}

          {/* Admin menu */}
          {menu.admin.length > 0 && (
            <>
              <Separator className="my-3 bg-sidebar-border" />
              <div className={`${collapsed ? "px-0" : "px-1"} mb-2`}>
                {!collapsed && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    Quản trị
                  </span>
                )}
              </div>
              {menu.admin.map((item) => {
                const Icon = ICON_MAP[item.icon] || Settings
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                const linkContent = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
                      ${isActive
                        ? "bg-sidebar-accent text-primary shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }
                      ${collapsed ? "justify-center px-2" : ""}
                    `}
                  >
                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                )

                if (collapsed) {
                  return (
                    <TooltipProvider key={item.href} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                }

                return linkContent
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full h-auto p-2 justify-start hover:bg-sidebar-accent/50 ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="ml-2.5 flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-[11px] text-sidebar-foreground/50 truncate">
                    {user?.companyCode}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? "center" : "end"} side="top" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              <Badge
                variant="outline"
                className={`mt-1.5 w-fit text-[10px] ${role ? ROLE_COLORS[role] : ""}`}
              >
                {role ? ROLE_LABELS[role] : ""}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-500 focus:text-red-500 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── MAIN LAYOUT ─────────────────────────────────────────────────────────────

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
            <span className="text-lg font-bold text-white">1G</span>
          </div>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const role = (currentUser?.role as Role) || "Staff"
  const companyName = currentUser?.companyName || ""
  const menu = getMenuForRole(role)

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-sidebar-border transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pathname={pathname}
          menu={menu}
          session={session}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent
            collapsed={false}
            setCollapsed={() => {}}
            pathname={pathname}
            menu={menu}
            session={session}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            <h1 className="text-lg font-semibold tracking-tight">
              {menu.main.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"))?.title ||
                menu.admin.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"))?.title ||
                "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <NotificationBell />

            {/* Company badge (desktop) */}
            <Badge variant="outline" className="hidden md:flex text-xs font-normal gap-1.5">
              <Building2 className="h-3 w-3" />
              {companyName}
            </Badge>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
