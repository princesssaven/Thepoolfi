import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

import { SolanaWalletAppProvider } from "@/components/providers/solana-wallet-provider";

export const metadata: Metadata = {
  title: "AI Autonomous Wallet Agent",
  description: "Autonomous Solana wallet manager with policy controls and risk-aware execution."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletAppProvider>{children}</SolanaWalletAppProvider>
      </body>
    </html>
  );
}
