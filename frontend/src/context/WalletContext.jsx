import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { CHAIN_ID_HEX, MONAD_TESTNET, ESCROW_CONTRACT_ADDRESS } from "../config";
import { getAbi } from "../abi";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.ethereum) {
        setError("MetaMask not installed. Please install MetaMask.");
        setLoading(false);
        return;
      }
      const prov = new BrowserProvider(window.ethereum);
      const accounts = await prov.send("eth_requestAccounts", []);
      const net = await prov.getNetwork();
      const chainIdNum = Number(net.chainId);

      if (chainIdNum !== 10143) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CHAIN_ID_HEX }],
          });
        } catch (e) {
          if (e.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [MONAD_TESTNET],
            });
          } else throw e;
        }
      }

      const s = await prov.getSigner();
      setProvider(prov);
      setSigner(s);
      setAccount(accounts[0]);
      setChainId(Number((await prov.getNetwork()).chainId));

      if (ESCROW_CONTRACT_ADDRESS) {
        const { Contract } = await import("ethers");
        setContract(new Contract(ESCROW_CONTRACT_ADDRESS, getAbi(), s));
      }
    } catch (err) {
      setError(err.message || "Failed to connect");
      setAccount(null);
      setProvider(null);
      setSigner(null);
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts) => {
      if (accounts.length === 0) disconnect();
      else setAccount(accounts[0]);
    };
    const onChain = () => window.ethereum?.request({ method: "eth_chainId" }).then((id) => setChainId(parseInt(id, 16)));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccounts);
      window.ethereum?.removeListener("chainChanged", onChain);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        account,
        provider,
        signer,
        chainId,
        contract,
        loading,
        error,
        connect,
        disconnect,
        isMonad: chainId === 10143,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
