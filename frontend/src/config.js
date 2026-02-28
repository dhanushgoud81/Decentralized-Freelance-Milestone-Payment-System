// Monad Testnet
export const CHAIN_ID = 10143;
export const CHAIN_ID_HEX = "0x279f";
export const RPC_URL = "https://testnet-rpc.monad.xyz";
export const EXPLORER_URL = "https://testnet.monadscan.com";

// Set after deploy: npm run deploy
export const ESCROW_CONTRACT_ADDRESS =
  import.meta.env.VITE_ESCROW_ADDRESS || "";

export const MONAD_TESTNET = {
  chainId: CHAIN_ID_HEX,
  chainName: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
};
