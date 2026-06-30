import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import Provider from "./Provider"; 
import LayoutWrapper from "@/components/LayoutWrapper";
import type { Viewport } from "next";

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "CHAIYADETPROGRESS",
  description: "ระบบจัดการข้อมูลพนักงานและเอกสารบริษัท",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={prompt.className}>
        <Provider>
          {/* ห่อหุ้มโครงสร้างทั้งหมดด้วย LayoutWrapper */}
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Provider>
      </body>
    </html>
  );
}