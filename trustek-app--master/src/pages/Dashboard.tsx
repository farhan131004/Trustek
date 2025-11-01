import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// Assuming these component imports are correct for your project setup
import { Button } from '@/components/ui/button'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Newspaper, Globe, Star, LogOut, AlertTriangle, Menu, User, Mail, Hash, Info, Users, MessageSquare, HelpCircle } from 'lucide-react'; // Added HelpCircle

// --- Helper Components: Modal ---

/** A reusable modal component for pop-up forms or information. */
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md transform scale-100 transition-transform duration-300 border border-border">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold text-foreground text-shadow-sm">{title}</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:bg-muted">
                        &times;
                    </Button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Sub-Components ---

// 1. Profile Modal (for editing details)
const ProfileModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user, updateProfile, isLoading } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [registerNumber, setRegisterNumber] = useState(user?.registerNumber || '');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name) {
            setError('Full Name is required.');
            return;
        }

        try {
            // Update the user context state
            await updateProfile({ name, registerNumber });
            onClose();
        } catch (err) {
            setError('Failed to update profile.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Update Your Profile">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium flex items-center text-foreground"><User className="w-4 h-4 mr-2 text-primary" /> Full Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-ring focus:border-ring transition-colors"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium flex items-center text-foreground"><Mail className="w-4 h-4 mr-2 text-primary" /> Email ID</label>
                    <input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="w-full p-3 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="regNum" className="text-sm font-medium flex items-center text-foreground"><Hash className="w-4 h-4 mr-2 text-primary" /> Register Number</label>
                    <input
                        id="regNum"
                        type="text"
                        value={registerNumber}
                        onChange={(e) => setRegisterNumber(e.target.value)}
                        className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-ring focus:border-ring transition-colors"
                        placeholder="Optional"
                    />
                </div>
                {error && <p className="text-destructive text-sm mt-2">{error}</p>}
                <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth text-shadow-sm"
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </Modal>
    );
};

// 2. User Profile Component (Avatar only, clickable to open modal)
const UserProfile: React.FC<{ user: { name: string, email: string, registerNumber?: string }, onClick: () => void }> = ({ user, onClick }) => {
    // Determine attention needed (e.g., if register number is missing)
    const needsAttention = !user.registerNumber; 
    const initial = user.name.charAt(0).toUpperCase();
    
    return (
        <div className="flex items-center space-x-2">
            <div className="relative cursor-pointer group" onClick={onClick}>
                {/* Avatar Ring Effect (Multi-color) */}
                <div 
                    className={`
                        w-14 h-14 rounded-full p-0.5 
                        bg-[conic-gradient(from_0deg,hsl(var(--primary))_0%,hsl(var(--accent))_25%,hsl(var(--secondary))_50%,hsl(var(--ring))_100%)]
                        transition-all duration-500
                    `}
                >
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-card flex items-center justify-center bg-card-foreground/10">
                        <span className="text-3xl font-bold text-card-foreground">{initial}</span>
                    </div>
                </div>

                {/* Warning Icon Overlay */}
                {needsAttention && (
                    <div className="absolute bottom-0 right-0 transform translate-x-1 translate-y-1 
                                    w-5 h-5 bg-card rounded-full flex items-center justify-center 
                                    shadow-md border border-input">
                        {/* Fill the triangle to make it visible against a dark background */}
                        <AlertTriangle className="w-3 h-3 text-destructive fill-destructive" /> 
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Right Sidebar Component (for auxiliary navigation)
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    handleLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, handleLogout }) => {
    // Defines the links for the sidebar, including the requested About Us, Team, Feedback Forum, and FAQs
    const navItems = [
        { icon: Info, title: 'About Us', href: '/about' },
        { icon: Users, title: 'Meet the Team', href: '/team' },
        { icon: MessageSquare, title: 'Feedback Forum', href: '/feedback' },
        { icon: HelpCircle, title: 'Website FAQs', href: '/faqs' }, // NEW: FAQs added here
    ];

    return (
        <>
            {/* Overlay */}
            {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>}

            {/* Sidebar Panel */}
            <div 
                className={`fixed top-0 right-0 z-50 h-full w-64 bg-sidebar-background shadow-2xl border-l border-sidebar-border 
                           transform transition-transform duration-300 ease-in-out p-6 space-y-6
                           ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex justify-between items-center pb-4 border-b border-sidebar-border">
                    <h4 className="text-lg font-bold text-sidebar-foreground">Menu</h4>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground hover:bg-sidebar-accent">
                        &times;
                    </Button>
                </div>

                <nav className="space-y-2">
                    {navItems.map(item => (
                        <Link key={item.title} to={item.href} onClick={onClose} className="flex items-center p-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary transition-colors">
                            <item.icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.title}</span>
                        </Link>
                    ))}
                    <div className="pt-4 border-t border-sidebar-border">
                        <Button onClick={handleLogout} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-smooth text-shadow-sm">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </nav>
            </div>
        </>
    );
};

// 4. Tool Card Component
interface ToolCardProps {
    title: string;
    description: string;
    Icon: React.ElementType; 
    href: string;
    color: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, Icon, href, color }) => (
    <Card 
        className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-primary/20 
                   bg-card/90 shadow-lg dark:hover:shadow-primary/20"
    >
        <CardHeader>
            <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4`}>
                <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <CardTitle className="text-shadow-sm">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <Link to={href} className="block">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth text-shadow-sm">
                    Launch Tool
                </Button>
            </Link>
        </CardContent>
    </Card>
);

// --- Main Dashboard Component ---

const Dashboard = () => {
    const navigate = useNavigate();
    // Assuming useAuth correctly returns user, logout, and isLoading
    const { user, logout, isLoading } = useAuth(); 
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
    }

    if (!user) {
        navigate('/auth');
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const features = [
        {
            Icon: Newspaper,
            title: 'Fake News Detection',
            description: 'Analyze news articles for authenticity and credibility',
            color: 'text-primary',
            href: '/fake-news-detection', 
        },
        {
            Icon: Globe,
            title: 'Website Scanner',
            description: 'Verify website legitimacy and security',
            color: 'text-accent',
            href: '/website-scanner', 
        },
        {
          Icon: Star,
          title: "Review Analyzer",
         description: "Identify fake reviews and suspicious ratings",
          color: "text-secondary",
        href: "/ReviewAnalyzer", // ✅ Must match the route above
      }       
   
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl font-bold text-shadow-sm">Trustek Shield</h1>
                    </div>
                    
                    {/* User Profile and Sidebar Toggle */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Profile is now clickable to open modal */}
                        <UserProfile 
                            user={user} 
                            onClick={() => setIsProfileModalOpen(true)} 
                        />

                        {/* Standard Logout button for larger screens */}
                        <Button 
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-smooth text-shadow-sm hidden md:flex" 
                            size="sm" 
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                        
                        {/* Hamburger menu for small screens */}
                        <Button 
                            id="sidebar-toggle-mobile" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsSidebarOpen(true)} 
                            className="h-10 w-10 text-foreground hover:bg-muted md:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-extrabold mb-4 text-shadow-lg">Your Security Dashboard</h2>
                    <p className="text-muted-foreground text-xl">
                        Choose a tool to start protecting yourself online
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {features.map((feature) => (
                        <ToolCard 
                            key={feature.title}
                            title={feature.title}
                            description={feature.description}
                            Icon={feature.Icon}
                            href={feature.href}
                            color={feature.color}
                        />
                    ))}
                </div>
            </main>

            {/* Profile Update Modal */}
            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
            />

            {/* Right-hand Sidebar */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                handleLogout={handleLogout}
            />
        </div>
    );
};

export default Dashboard;

