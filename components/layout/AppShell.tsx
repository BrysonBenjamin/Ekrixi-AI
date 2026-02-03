
import React from 'react';
import { 
    Settings, 
    Menu, 
    Flame,
    Eye,
    Hammer,
    ScrollText,
    BookType,
    Map as MapIcon,
    Zap,
    BookOpenCheck,
    Box
} from 'lucide-react';
import { ThemeMode } from '../../App';
import { Logo } from '../shared/Logo';

export type AppView = 'GENERATOR' | 'LIBRARY' | 'SETTINGS' | 'SCANNER' | 'REFINERY' | 'STRUCTURE' | 'WIKI' | 'DRILLDOWN' | 'ANALYZER';

interface AppShellProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    children: React.ReactNode;
    theme: ThemeMode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentView, onViewChange, children, theme }) => {
    
    const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => {
        const isActive = currentView === view;
        return (
            <button
                onClick={() => onViewChange(view)}
                className={`
                    relative group flex flex-col items-center justify-center w-16 h-16 md:w-full md:h-16 md:my-2
                    transition-all duration-300 ease-out
                    ${isActive ? 'text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}
                `}
            >
                <div className={`
                    absolute left-0 w-1 h-8 bg-nexus-accent rounded-r-full transition-all duration-300
                    hidden md:block
                    ${isActive ? 'opacity-100' : 'opacity-0 -translate-x-full'}
                `} />
                
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-display font-medium md:hidden">{label}</span>
                
                <span className="
                    absolute left-full ml-4 px-3 py-2 bg-nexus-900 border border-nexus-800 rounded-lg text-[10px] font-display font-bold text-nexus-text 
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50
                    hidden md:block shadow-2xl tracking-widest
                ">
                    {label}
                </span>
            </button>
        );
    };

    return (
        <div className="flex flex-col md:flex-row h-screen h-[100dvh] bg-nexus-950 text-nexus-text overflow-hidden font-sans">
            
            <aside className="
                hidden md:flex flex-col items-center justify-between
                w-20 h-full bg-nexus-900 border-r border-nexus-800 z-50 shadow-[4px_0_20px_rgba(0,0,0,0.1)]
            ">
                <div className="flex flex-col items-center w-full pt-6">
                    <div className="mb-10 w-12 h-12 flex items-center justify-center">
                        <Logo size={40} />
                    </div>

                    <nav className="flex flex-col w-full gap-2">
                        <NavItem view="DRILLDOWN" icon={MapIcon} label="Explorer" />
                        <NavItem view="ANALYZER" icon={BookOpenCheck} label="Blueprint" />
                        <NavItem view="STRUCTURE" icon={ScrollText} label="Registry" />
                        <NavItem view="REFINERY" icon={Hammer} label="Refinery" />
                        <NavItem view="WIKI" icon={BookType} label="Library" />
                        <NavItem view="GENERATOR" icon={Flame} label="Nexus" />
                        <NavItem view="SCANNER" icon={Eye} label="Scanner" />
                    </nav>
                </div>

                <div className="flex flex-col items-center w-full pb-6 gap-4">
                    <NavItem view="SETTINGS" icon={Settings} label="Settings" />
                </div>
            </aside>

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

            <main className="flex-1 relative overflow-hidden bg-nexus-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--ley-color)_0%,transparent_50%)] pointer-events-none"></div>
                {children}
            </main>

            <nav className="
                md:hidden h-20 bg-nexus-900 border-t border-nexus-800 
                flex items-center justify-around px-2 z-50 shrink-0 pb-safe
            ">
                <NavItem view="DRILLDOWN" icon={MapIcon} label="Explore" />
                <NavItem view="WIKI" icon={BookType} label="Library" />
                <NavItem view="GENERATOR" icon={Flame} label="Nexus" />
                <NavItem view="REFINERY" icon={Hammer} label="Refinery" />
            </nav>

        </div>
    );
};
