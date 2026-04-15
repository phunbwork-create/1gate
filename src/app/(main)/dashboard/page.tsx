"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Loader2, CreditCard, Wallet, Clock } from "lucide-react"

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(res => {
        // success() returns data directly at top level (no .data wrapper)
        if (res.stats) setData(res)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tổng quan</h2>
        <div className="flex items-center space-x-2">
          {/* Calendar Widget or Download Report Button could go here */}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Chờ phê duyệt
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Đơn thanh toán đang treo
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dư nợ Tạm ứng
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Number(data.stats.totalAdvanceDebt).toLocaleString("vi-VN")} đ
            </div>
            <p className="text-xs text-muted-foreground">
              Khoản tiền tạm ứng chưa hoàn ứng
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all hidden md:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đã giải ngân
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Number(data.stats.totalSpent).toLocaleString("vi-VN")} đ
            </div>
            <p className="text-xs text-muted-foreground">
              Quy ra từ các Kế hoạch chi đã Execute
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Biến động Dòng tiền</CardTitle>
            <CardDescription>
              Tổng chi tiêu tiền mặt ước tính trong vòng 6 tháng gần nhất.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toLocaleString("vi-VN")} đ`, "Chi tiêu"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke="#2563eb"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Mua sắm gần đây</CardTitle>
            <CardDescription>
              5 dự án mua sắm lớn đang triển khai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.recentProcurements?.map((item: any) => (
                  <div key={item.code} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.title}</p>
                      <div className="flex gap-2 items-center text-xs text-muted-foreground pt-1">
                        <span className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">
                          {item.code}
                        </span>
                        <span>{item.createdBy.name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}</span>
                      </div>
                    </div>
                    <div className="ml-auto font-medium">
                      <Badge variant={item.status === "Approved" ? "default" : "secondary"} className="text-[10px]">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
