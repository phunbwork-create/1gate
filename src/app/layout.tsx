import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    template: "%s | 1Gate",
    default: "1Gate — Quản lý Mua sắm & Thanh toán",
  },
  description: "Hệ thống quản lý quy trình mua sắm, thanh toán, tạm ứng và quyết toán doanh nghiệp",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
