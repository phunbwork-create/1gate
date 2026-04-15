"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    // Poll every 60s
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/my")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-background rounded-full animate-in zoom-in" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-normal flex justify-between items-center">
          <span className="font-semibold">Thông báo</span>
          <span className="text-xs text-muted-foreground">{unreadCount} chưa đọc</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </div>
          ) : (
            notifications.map(n => (
              <DropdownMenuItem 
                key={n.id} 
                className={`flex flex-col items-start p-3 gap-1 cursor-pointer transition-colors ${!n.isRead ? "bg-blue-50/50" : ""}`}
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id)
                  // Try to find the link in body to navigate
                  const urlMatch = n.body.match(/Link: (\S+)/)
                  if (urlMatch) {
                    router.push(urlMatch[1])
                  }
                }}
              >
                <div className="flex justify-between w-full gap-2">
                  <span className={`text-sm font-medium ${!n.isRead ? "text-blue-700" : ""}`}>
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 rounded-full shrink-0" 
                      onClick={(e) => markAsRead(n.id, e)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {n.body.replace(/Link: \S+/, "")}
                </p>
                <span className="text-[10px] text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
