import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { 
  SolanaMobileWalletAdapter, 
  createDefaultAddressSelector, 
  createDefaultAuthorizationResultCache, 
  createDefaultWalletNotFoundHandler 
} from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { Capacitor } from '@capacitor/core';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  const wallets = useMemo(
    () => {
      const mobileAdapter = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'CodeArena',
          uri: 'https://codearena.app',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: 'devnet' as WalletAdapterNetwork,
        onWalletNotFound: async (adapter) => {
          console.warn('Mobile wallet not found');
        },
      });

      if (isNative) {
        // On native platforms (Android/iOS), we only want to use the Mobile Wallet Adapter
        // to ensure it uses the native protocol and doesn't fall back to browser redirects.
        return [mobileAdapter];
      }

      // On web, we include standard adapters
      return [
        mobileAdapter,
        new PhantomWalletAdapter({ network }),
        new SolflareWalletAdapter({ network }),
      ];
    },
    [network, isNative]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
