import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Settings,
  Menu,
  Flame,
  Eye,
  Hammer,
  ScrollText,
  BookType,
  Map as MapIcon,
  PenTool,
  FlaskConical,
  User,
  LogOut,
} from 'lucide-react';
import { useSessionStore } from '../../store/useSessionStore';
import { useGoogleDrive } from '../../features/system/hooks/useGoogleDrive';
import { Logo } from '../shared/Logo';
import { config } from '../../config';

// ... (AppView type)

type ThemeMode = string; // Simplified for import issues, or import from store if exported

interface AppShellProps {
  children: React.ReactNode;
  theme: ThemeMode;
}

interface NavItemProps {
  path: string;
  icon: any;
  label: string;
  isActive: boolean;
  onClick: (path: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ path, icon: Icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={() => onClick(path)}
      className={`
                relative group flex flex-col items-center justify-center w-16 h-16 md:w-full md:h-16 md:my-2
                transition-all duration-300 ease-out
                ${isActive ? 'text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}
            `}
    >
      <div
        className={`
                absolute left-0 w-1 h-8 bg-nexus-accent rounded-r-full transition-all duration-300
                hidden md:block
                ${isActive ? 'opacity-100' : 'opacity-0 -translate-x-full'}
            `}
      />

      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] mt-1 font-display font-medium md:hidden">{label}</span>

      <span
        className="
                absolute left-full ml-4 px-3 py-2 bg-nexus-950 border border-nexus-800 rounded-lg text-[10px] font-display font-bold text-nexus-text 
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50
                hidden md:block shadow-2xl tracking-widest
            "
      >
        {label}
      </span>
    </button>
  );
};

export const AppShell: React.FC<AppShellProps> = ({ children, theme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useSessionStore();
  const { login, logout } = useGoogleDrive();

  const currentPath = location.pathname;

  const isActiveView = (path: string) => {
    if (path === '/' || path === '/playground')
      return currentPath === '/' || currentPath === '/playground';
    return currentPath.startsWith(path);
  };

  const handleNavigate = (path: string) => navigate(path);

  return (
    <div className="flex flex-col md:flex-row h-full absolute inset-0 text-nexus-text overflow-hidden font-sans">
      <aside
        className="
                hidden md:flex flex-col items-center justify-between
                w-20 h-full bg-nexus-900 border-r border-nexus-800 z-50 shadow-[4px_0_20px_rgba(0,0,0,0.1)]
            "
      >
        <div className="flex flex-col items-center w-full pt-6">
          <div className="mb-10 w-12 h-12 flex items-center justify-center">
            <Logo size={40} />
          </div>

          <nav className="flex flex-col w-full gap-2">
            <NavItem
              path="/nexus"
              icon={Flame}
              label="Nexus"
              isActive={isActiveView('/nexus')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/scanner"
              icon={Eye}
              label="Scanner"
              isActive={isActiveView('/scanner')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/refinery"
              icon={Hammer}
              label="Refinery"
              isActive={isActiveView('/refinery')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/explore"
              icon={MapIcon}
              label="Explorer"
              isActive={isActiveView('/explore')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/registry"
              icon={ScrollText}
              label="Registry"
              isActive={isActiveView('/registry')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/library"
              icon={BookType}
              label="Library"
              isActive={isActiveView('/library')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/studio"
              icon={PenTool}
              label="Story Studio"
              isActive={isActiveView('/studio')}
              onClick={handleNavigate}
            />
            <NavItem
              path="/playground"
              icon={FlaskConical}
              label="Playground"
              isActive={isActiveView('/playground')}
              onClick={handleNavigate}
            />
          </nav>
        </div>

        <div className="flex flex-col items-center w-full pb-6 gap-4">
          {/* User Profile / Login */}
          {config.features.enableSSO && (
            <div className="group relative">
              <button
                onClick={() => (currentUser ? logout() : login())}
                className="w-10 h-10 rounded-full bg-nexus-950 border border-nexus-800 overflow-hidden flex items-center justify-center hover:border-nexus-accent transition-all"
              >
                {currentUser?.picture ? (
                  <img
                    src={currentUser.picture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User
                    size={20}
                    className={currentUser ? 'text-nexus-accent' : 'text-nexus-muted'}
                  />
                )}
              </button>

              <div
                className="
                            absolute left-full ml-4 bottom-0 px-4 py-3 bg-nexus-950 border border-nexus-800 rounded-xl 
                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl
                        "
              >
                <div className="text-xs font-bold text-nexus-text">
                  {currentUser?.name || 'Guest Access'}
                </div>
                <div className="text-[10px] text-nexus-muted">
                  {currentUser?.email || 'Click to Authenticate'}
                </div>
                {currentUser && (
                  <div className="mt-2 pt-2 border-t border-nexus-800 text-[10px] text-red-400 flex items-center gap-2">
                    <LogOut size={10} /> Sign Out
                  </div>
                )}
              </div>
            </div>
          )}

          <NavItem
            path="/settings"
            icon={Settings}
            label="Settings"
            isActive={isActiveView('/settings')}
            onClick={handleNavigate}
          />
        </div>
      </aside>

      {/* ... (Mobile Header & Main - unchanged) */}

      <header className="md:hidden h-14 bg-nexus-900 border-b border-nexus-800 flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-display font-bold text-nexus-text tracking-widest text-sm uppercase">
            Ekrixi AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-nexus-muted">
            <Menu size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--ley-color)_0%,transparent_50%)] pointer-events-none"></div>
        {children}
      </main>

      <nav
        className="
                md:hidden h-20 bg-nexus-900 border-t border-nexus-800 
                flex items-center justify-around px-2 z-50 shrink-0 pb-safe overflow-x-auto no-scrollbar
            "
      >
        <NavItem
          path="/nexus"
          icon={Flame}
          label="Nexus"
          isActive={isActiveView('/nexus')}
          onClick={handleNavigate}
        />
        <NavItem
          path="/scanner"
          icon={Eye}
          label="Scanner"
          isActive={isActiveView('/scanner')}
          onClick={handleNavigate}
        />
        <NavItem
          path="/refinery"
          icon={Hammer}
          label="Refinery"
          isActive={isActiveView('/refinery')}
          onClick={handleNavigate}
        />
        <NavItem
          path="/explore"
          icon={MapIcon}
          label="Explore"
          isActive={isActiveView('/explore')}
          onClick={handleNavigate}
        />
        <NavItem
          path="/library"
          icon={BookType}
          label="Library"
          isActive={isActiveView('/library')}
          onClick={handleNavigate}
        />
        <NavItem
          path="/studio"
          icon={PenTool}
          label="Studio"
          isActive={isActiveView('/studio')}
          onClick={handleNavigate}
        />
      </nav>
    </div>
  );
};
