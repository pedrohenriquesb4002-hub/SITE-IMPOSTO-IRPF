import { useState, useEffect, useRef, CSSProperties } from "react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import {
  FileText, DollarSign, Settings, Users, Upload, Percent,
  LogOut, Moon, Sun, ChevronLeft, LayoutGrid, Calendar
} from "lucide-react";

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;

const menuGroups = [
  {
    label: "IRPF",
    items: [
      { label: "IRPF", path: "/resumo", icon: FileText },
      { label: "Março", path: "/declaracoes/marco", indent: true },
      { label: "Abril", path: "/declaracoes/abril", indent: true },
      { label: "Maio", path: "/declaracoes/maio", indent: true },
    ],
  },
  {
    label: null,
    items: [
      { label: "ITR", path: "/itr", icon: LayoutGrid },
      { label: "Comissões", path: "/comissoes", icon: DollarSign },
      { label: "Quotas", path: "/cotas", icon: Percent },
      { label: "Colaboradores", path: "/colaboradores", icon: Users },
      { label: "Importar/Exportar", path: "/importar", icon: Upload },
      { label: "Configurações", path: "/configuracoes", icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const sidebarBg = "bg-[#1a3a2a]";
  const activeBg = "bg-[#e85d1a]";
  const hoverBg = "hover:bg-[#254d38]";
  const textColor = "text-white";

  const Sidebar = () => (
    <div
      className={`${sidebarBg} ${textColor} flex flex-col h-screen transition-all duration-300`}
      style={{ width: collapsed ? 64 : DEFAULT_WIDTH }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#254d38]">
        {!collapsed && (
          <div>
            <div className="font-bold text-lg leading-tight">IRPF/ITR</div>
            <div className="text-xs text-green-300 opacity-80">Sistema de Gestão</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg ${hoverBg} transition-colors ml-auto`}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {menuGroups.map((group, gi) => (
          <div key={gi}>
            {group.items.map((item) => {
              const active = isActive(item.path);
              const Icon = (item as any).icon;
              const indent = (item as any).indent;

              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5
                    ${active ? activeBg + " text-white" : hoverBg + " text-green-100"}
                    ${indent && !collapsed ? "pl-8" : ""}
                  `}
                >
                  {Icon && !indent && <Icon className="w-4 h-4 shrink-0" />}
                  {indent && !collapsed && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 ml-1" />}
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
            {gi === 0 && !collapsed && <div className="h-px bg-[#254d38] my-2" />}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#254d38] p-3 space-y-1">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${hoverBg} text-green-100 transition-colors`}
        >
          {darkMode ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>Modo Escuro</span>}
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${hoverBg} text-green-100 transition-colors`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>

        {/* User */}
        <div className={`flex items-center gap-3 px-3 py-2 mt-1 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-[#e85d1a] flex items-center justify-center text-white text-sm font-bold shrink-0">
            U
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Usuário Admin</p>
              <p className="text-xs text-green-300 truncate">● Online</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-14 bg-[#1a3a2a] flex items-center px-4 gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-white">
            <LayoutGrid className="w-5 h-5" />
          </button>
          <span className="text-white font-bold">IRPF/ITR</span>
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-shrink-0"><Sidebar /></div>
            <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
          </div>
        )}
        <main className="flex-1 overflow-auto bg-gray-50 p-4">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="shrink-0 h-full overflow-y-auto">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
    </div>
  );
}