import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/ui/Icon.jsx';
import { Logo } from '../components/layout/Header.jsx';
import { ConfirmProvider, Loading, LookupsProvider, ToastProvider } from './components/ui.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const GuidesList = lazy(() => import('./pages/Guides.jsx').then((m) => ({ default: m.GuidesList })));
const GuideEditor = lazy(() => import('./pages/Guides.jsx').then((m) => ({ default: m.GuideEditor })));
const ProductsList = lazy(() => import('./pages/Products.jsx').then((m) => ({ default: m.ProductsList })));
const ProductEditor = lazy(() => import('./pages/Products.jsx').then((m) => ({ default: m.ProductEditor })));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Trends = lazy(() => import('./pages/Trends.jsx'));
const SeasonalList = lazy(() => import('./pages/Seasonal.jsx').then((m) => ({ default: m.SeasonalList })));
const SeasonalEditor = lazy(() => import('./pages/Seasonal.jsx').then((m) => ({ default: m.SeasonalEditor })));
const Homepage = lazy(() => import('./pages/Homepage.jsx'));
const Collections = lazy(() => import('./pages/Collections.jsx'));
const Pages = lazy(() => import('./pages/Pages.jsx'));
const Pinterest = lazy(() => import('./pages/Pinterest.jsx'));
const Newsletter = lazy(() => import('./pages/Newsletter.jsx'));
const Clicks = lazy(() => import('./pages/Analytics.jsx').then((m) => ({ default: m.Clicks })));
const ContentPerformance = lazy(() => import('./pages/Analytics.jsx').then((m) => ({ default: m.ContentPerformance })));
const Media = lazy(() => import('./pages/Media.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Navigation = lazy(() => import('./pages/Navigation.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));

const NAV = [
  [null, [['Dashboard', '/admin', 'sparkle']]],
  ['Content', [['Guides', '/admin/guides'], ['Products', '/admin/products'], ['Categories', '/admin/categories'], ['Trends', '/admin/trends'], ['Seasonal pages', '/admin/seasonal'], ['Pages', '/admin/pages']]],
  ['Marketing', [['Pinterest', '/admin/pinterest'], ['Homepage', '/admin/homepage'], ['Collections', '/admin/collections'], ['Newsletter', '/admin/newsletter']]],
  ['Analytics', [['Affiliate clicks', '/admin/analytics/clicks'], ['Content performance', '/admin/analytics/content']]],
  ['Media', [['Media library', '/admin/media']]],
  ['Settings', [['Site settings', '/admin/settings/site', null, true], ['SEO settings', '/admin/settings/seo', null, true], ['Affiliate settings', '/admin/settings/affiliate', null, true], ['Social links', '/admin/settings/social', null, true], ['Navigation', '/admin/navigation', null, true]]],
  ['Users', [['Admin users', '/admin/users', null, true]]],
];

function Sidebar({ onNavigate }) {
  const { user, logout, isAdmin } = useAuth();
  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <div className="flex h-16 items-center justify-between border-b border-paper/10 px-5">
        <Link to="/" aria-label="View site"><Logo light className="!text-[1.6rem]" /></Link>
        <span className="font-mono text-[0.6rem] tracking-widest text-paper/50 uppercase">Admin</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        {NAV.map(([group, items]) => {
          const visible = items.filter(([, , , adminOnly]) => !adminOnly || isAdmin);
          if (!visible.length) return null;
          return (
            <div key={group || 'top'} className="mb-5">
              {group && <p className="mb-1.5 px-2 font-mono text-[0.6rem] tracking-[0.14em] text-paper/40 uppercase">{group}</p>}
              {visible.map(([label, to]) => (
                <NavLink key={to} to={to} end={to === '/admin'} onClick={onNavigate}
                  className={({ isActive }) => `block rounded-xs px-2 py-1.5 text-[0.86rem] transition-colors ${isActive ? 'bg-paper/10 text-paper' : 'text-paper/65 hover:text-paper'}`}>
                  {label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-paper/10 p-4 text-[0.8rem]">
        <p className="truncate font-medium">{user?.display_name}</p>
        <p className="truncate text-paper/50">{user?.email} · {user?.role}</p>
        <div className="mt-3 flex gap-4">
          <Link to="/" className="text-paper/70 hover:text-paper">View site</Link>
          <button onClick={logout} className="text-paper/70 hover:text-paper">Sign out</button>
        </div>
      </div>
    </div>
  );
}

function Unauthorized() {
  const { logout } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="max-w-md">
        <p className="eyebrow">403</p>
        <h1 className="mt-3 font-serif text-[3rem] leading-none">This area is for editors.</h1>
        <p className="mt-4 text-muted">Your account doesn't have access to the admin dashboard. If you think that's wrong, ask a site admin to change your role.</p>
        <div className="mt-6 flex gap-4 text-sm">
          <Link to="/" className="underline underline-offset-4">Back to the site</Link>
          <button onClick={logout} className="underline underline-offset-4">Sign in as someone else</button>
        </div>
      </div>
    </div>
  );
}

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <p className="text-muted">Only admins can manage this section.</p>;
}

export default function AdminApp() {
  const { user, checking, isStaff } = useAuth();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [location.pathname]);

  // Errors from admin actions are already shown as toasts (see useAction).
  useEffect(() => {
    const onRejection = (e) => e.reason?.handled && e.preventDefault();
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  if (checking) return <div className="p-10"><Loading label="Checking your session…" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isStaff) return <Unauthorized />;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <LookupsProvider>
          <title>Admin — keemstore</title>
          <meta name="robots" content="noindex, nofollow" />
          <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[240px_1fr]">
            <aside className="sticky top-0 hidden h-screen lg:block"><Sidebar /></aside>
            <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper px-4 lg:hidden">
              <button onClick={() => setMenu(true)} className="-ml-1 p-1" aria-label="Open admin menu"><Icon name="menu" size={22} /></button>
              <span className="font-mono text-[0.7rem] tracking-widest uppercase">Admin</span>
              <Link to="/" className="text-sm">Site</Link>
            </div>
            {menu && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div className="w-64"><Sidebar onNavigate={() => setMenu(false)} /></div>
                <button className="flex-1 bg-ink/40" onClick={() => setMenu(false)} aria-label="Close menu" />
              </div>
            )}
            <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10">
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="guides" element={<GuidesList />} />
                  <Route path="guides/:id" element={<GuideEditor />} />
                  <Route path="products" element={<ProductsList />} />
                  <Route path="products/:id" element={<ProductEditor />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="trends" element={<Trends />} />
                  <Route path="seasonal" element={<SeasonalList />} />
                  <Route path="seasonal/:id" element={<SeasonalEditor />} />
                  <Route path="homepage" element={<Homepage />} />
                  <Route path="collections" element={<Collections />} />
                  <Route path="pages" element={<Pages />} />
                  <Route path="pinterest" element={<Pinterest />} />
                  <Route path="newsletter" element={<Newsletter />} />
                  <Route path="analytics/clicks" element={<Clicks />} />
                  <Route path="analytics/content" element={<ContentPerformance />} />
                  <Route path="media" element={<Media />} />
                  <Route path="settings/:group" element={<AdminOnly><Settings /></AdminOnly>} />
                  <Route path="navigation" element={<AdminOnly><Navigation /></AdminOnly>} />
                  <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
                  <Route path="*" element={<p className="text-muted">That admin page doesn't exist. <Link to="/admin" className="underline">Go to the dashboard</Link></p>} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </LookupsProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
