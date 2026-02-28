import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CreateProject from "./pages/CreateProject";
import Project from "./pages/Project";
import MyProjects from "./pages/MyProjects";
import Disputes from "./pages/Disputes";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateProject />} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/project/:id" element={<Project />} />
            <Route path="/disputes" element={<Disputes />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WalletProvider>
  );
}
