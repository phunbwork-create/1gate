"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, Lock, MessageCircle, CheckCircle2, Building2, Shield } from "lucide-react"

interface UserProfile {
  id: string; name: string; email: string; role: string; telegramChatId: string | null
  company: { name: string; code: string; type: string }
  department: { name: string } | null
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  Admin: "Quản trị viên", Staff: "Nhân viên", DeptHead: "Trưởng phòng",
  Warehouse: "Thủ kho", Purchasing: "Mua hàng", Accountant: "Kế toán",
  ChiefAccountant: "Kế toán trưởng", Director: "Giám đốc",
}

export default function ProfilePage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Password form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)

  // Telegram form
  const [chatId, setChatId] = useState("")
  const [tgLoading, setTgLoading] = useState(false)

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => { setProfile(d); setChatId(d.telegramChatId || "") })
      .finally(() => setLoading(false))
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({ title: "Mật khẩu xác nhận không khớp", variant: "destructive" })
      return
    }
    setPwdLoading(true)
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "✅ Đổi mật khẩu thành công" })
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
      } else {
        toast({ title: json.error || "Có lỗi xảy ra", variant: "destructive" })
      }
    } finally {
      setPwdLoading(false)
    }
  }

  async function handleSaveTelegram(e: React.FormEvent) {
    e.preventDefault()
    setTgLoading(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: chatId }),
      })
      if (res.ok) {
        toast({ title: "✅ Đã lưu Telegram Chat ID" })
        if (profile) setProfile({ ...profile, telegramChatId: chatId || null })
      } else {
        toast({ title: "Có lỗi khi lưu", variant: "destructive" })
      }
    } finally {
      setTgLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hồ sơ cá nhân</h2>
        <p className="text-muted-foreground text-sm mt-1">Quản lý thông tin tài khoản và bảo mật</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="info" className="gap-1.5"><User className="h-3.5 w-3.5" /> Thông tin</TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5"><Lock className="h-3.5 w-3.5" /> Mật khẩu</TabsTrigger>
          <TabsTrigger value="telegram" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Telegram</TabsTrigger>
        </TabsList>

        {/* Tab: Thông tin */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
              <CardDescription>Thông tin tài khoản của bạn trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-lg">{profile.name}</p>
                  <p className="text-muted-foreground text-sm">{profile.email}</p>
                </div>
                <Badge className="ml-auto">{ROLE_LABELS[profile.role] || profile.role}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Công ty</p>
                  <p className="font-medium">{profile.company.name}</p>
                  <p className="text-xs text-muted-foreground">Mã: {profile.company.code} · {profile.company.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Phòng ban</p>
                  <p className="font-medium">{profile.department?.name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Vai trò</p>
                  <p className="font-medium">{ROLE_LABELS[profile.role] || profile.role}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Telegram</p>
                  {profile.telegramChatId
                    ? <p className="font-medium flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Đã liên kết ({profile.telegramChatId})</p>
                    : <p className="text-muted-foreground">Chưa liên kết</p>}
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-muted-foreground">Ngày tham gia</p>
                  <p className="font-medium">{new Date(profile.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Đổi mật khẩu */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
              <CardDescription>Mật khẩu mới phải có ít nhất 6 ký tự</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPwd">Mật khẩu hiện tại</Label>
                  <Input id="currentPwd" type="password" value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPwd">Mật khẩu mới</Label>
                  <Input id="newPwd" type="password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} minLength={6} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPwd">Xác nhận mật khẩu mới</Label>
                  <Input id="confirmPwd" type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Mật khẩu xác nhận không khớp</p>
                  )}
                </div>
                <Button type="submit" disabled={pwdLoading} className="w-full">
                  {pwdLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                  Đổi mật khẩu
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Liên kết Telegram */}
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Liên kết Telegram</CardTitle>
              <CardDescription>Nhận thông báo phê duyệt qua Telegram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 text-sm space-y-2">
                <p className="font-semibold text-blue-800">📱 Cách lấy Telegram Chat ID:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Mở Telegram, tìm kiếm bot <strong>@userinfobot</strong></li>
                  <li>Nhắn <code className="bg-blue-100 px-1 rounded">/start</code></li>
                  <li>Bot trả về: <code className="bg-blue-100 px-1 rounded">Id: 123456789</code> — copy số đó</li>
                  <li>Dán vào ô bên dưới và nhấn Lưu</li>
                </ol>
              </div>

              <form onSubmit={handleSaveTelegram} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="chatId">Telegram Chat ID</Label>
                  <Input id="chatId" placeholder="VD: 1005223428" value={chatId}
                    onChange={e => setChatId(e.target.value)} />
                  {profile.telegramChatId && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Đã liên kết: {profile.telegramChatId}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={tgLoading} className="flex-1">
                    {tgLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                    Lưu Chat ID
                  </Button>
                  {profile.telegramChatId && (
                    <Button type="button" variant="outline" onClick={() => { setChatId(""); handleSaveTelegram({ preventDefault: () => {} } as React.FormEvent) }}>
                      Hủy liên kết
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
