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
  X,
  LucideIcon,
} from 'lucide-react';
import { useSessionStore } from '../../store/useSessionStore';
import { useGoogleDrive } from '../../features/system/hooks/useGoogleDrive';
import { Logo } from '../shared/Logo';
import { BrandLogo } from '../shared/BrandLogo';
import { config } from '../../config';

// ... (AppView type)

type ThemeMode = string; // Simplified for import issues, or import from store if exported

interface AppShellProps {
  children: React.ReactNode;
  theme: ThemeMode;
}

interface NavItemProps {
  path: string;
  icon: LucideIcon;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const currentPath = location.pathname;

  const isActiveView = (path: string) => {
    if (path === '/' || path === '/playground')
      return currentPath === '/' || currentPath === '/playground';
    return currentPath.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full absolute inset-0 text-nexus-text overflow-hidden font-sans">
      <aside
        className="
                hidden md:flex flex-col items-center
                w-20 h-full bg-nexus-900 border-r border-nexus-800 z-50 shadow-[4px_0_20px_rgba(0,0,0,0.1)]
            "
      >
        <div className="flex flex-col items-center w-full pt-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="mb-10 flex items-center justify-center shrink-0 px-2">
            <BrandLogo className="w-16 h-auto" data-flip-id="persistent-logo" />
          </div>

          <nav className="flex flex-col w-full gap-2 pb-6">
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

        <div className="flex flex-col items-center w-full pb-6 pt-4 gap-4 bg-nexus-950/50 backdrop-blur-md border-t border-nexus-800 shrink-0">
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

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-3/4 max-w-xs bg-nexus-900 border-l border-nexus-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-nexus-800 flex items-center justify-between">
              <span className="font-display font-bold text-lg text-nexus-text">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-nexus-muted hover:text-nexus-text"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {config.features.enableSSO && (
                <div className="mb-6 p-4 rounded-2xl bg-nexus-950 border border-nexus-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-nexus-900 border border-nexus-800 flex items-center justify-center">
                      {currentUser?.picture ? (
                        <img
                          src={currentUser.picture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-nexus-muted" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-nexus-text">
                        {currentUser?.name || 'Guest'}
                      </div>
                      <div className="text-[10px] text-nexus-muted">
                        {currentUser?.email || 'Not logged in'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        logout();
                      } else {
                        login();
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 rounded-xl bg-nexus-900 border border-nexus-800 text-[10px] font-bold uppercase tracking-widest text-nexus-muted hover:text-nexus-text transition-all"
                  >
                    {currentUser ? 'Sign Out' : 'Authenticate'}
                  </button>
                </div>
              )}

              <div className="space-y-2 mb-6">
                <div className="px-2 text-[10px] font-black text-nexus-muted uppercase tracking-widest opacity-50 mb-2">
                  Apps
                </div>
                {[
                  { path: '/nexus', icon: Flame, label: 'Nexus' },
                  { path: '/scanner', icon: Eye, label: 'Scanner' },
                  { path: '/refinery', icon: Hammer, label: 'Refinery' },
                  { path: '/explore', icon: MapIcon, label: 'Explorer' },
                  { path: '/library', icon: BookType, label: 'Library' },
                  { path: '/studio', icon: PenTool, label: 'Studio' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={`
                              w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                              ${isActiveView(item.path) ? 'bg-nexus-accent/10 text-nexus-text border border-nexus-accent/20' : 'hover:bg-nexus-800 text-nexus-muted'}
                          `}
                    >
                      <Icon
                        size={18}
                        className={
                          isActiveView(item.path) ? 'text-nexus-accent' : 'text-nexus-muted'
                        }
                      />
                      <span
                        className={`font-medium text-sm ${isActiveView(item.path) ? 'font-bold' : ''}`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="px-2 text-[10px] font-black text-nexus-muted uppercase tracking-widest opacity-50 mb-2">
                  System
                </div>
                <button
                  onClick={() => handleNavigate('/settings')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-nexus-800 transition-all text-left"
                >
                  <Settings size={18} className="text-nexus-muted" />
                  <span className="font-medium text-sm">Settings</span>
                </button>
                <button
                  onClick={() => handleNavigate('/playground')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-nexus-800 transition-all text-left"
                >
                  <FlaskConical size={18} className="text-nexus-muted" />
                  <span className="font-medium text-sm">Playground</span>
                </button>
                <button
                  onClick={() => handleNavigate('/registry')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-nexus-800 transition-all text-left"
                >
                  <ScrollText size={18} className="text-nexus-muted" />
                  <span className="font-medium text-sm">Full Registry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... (Mobile Header & Main - unchanged) */}

      <header className="md:hidden h-14 bg-nexus-900/80 backdrop-blur-lg border-b border-nexus-800 flex items-center justify-between px-4 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <button
            className="text-nexus-muted hover:text-nexus-text transition-colors p-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--ley-color)_0%,transparent_50%)] pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
};
