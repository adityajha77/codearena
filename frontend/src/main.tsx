import { Buffer } from "buffer";
window.Buffer = Buffer;
(window as any).process = { env: {} };

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SolanaWalletProvider } from "./components/SolanaWalletProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <SolanaWalletProvider>
    <App />
  </SolanaWalletProvider>
);
