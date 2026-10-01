import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import { PageSkeleton } from './components/ui/States.jsx';

// Public pages are split per route; the admin is a separate bundle entirely.
const GuidePage = lazy(() => import('./pages/GuidePage.jsx'));
const GuidesIndex = lazy(() => import('./pages/GuidesIndex.jsx'));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));
const CollectionPage = lazy(() => import('./pages/CollectionPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const StaticPage = lazy(() => import('./pages/StaticPage.jsx'));
const TrendingIndex = lazy(() => import('./pages/Trending.jsx').then((m) => ({ default: m.TrendingIndex })));
const TrendPage = lazy(() => import('./pages/Trending.jsx').then((m) => ({ default: m.TrendPage })));
const SeasonalIndex = lazy(() => import('./pages/Seasonal.jsx').then((m) => ({ default: m.SeasonalIndex })));
const SeasonalPage = lazy(() => import('./pages/Seasonal.jsx').then((m) => ({ default: m.SeasonalPage })));
const Login = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Register })));
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

const STATIC = ['about', 'contact', 'affiliate-disclosure', 'editorial-policy', 'privacy', 'terms'];

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="grid min-h-screen place-items-center"><span className="eyebrow">Loading admin…</span></div>}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="guides" element={<GuidesIndex />} />
        <Route path="guides/:slug" element={<GuidePage />} />
        <Route path="trending" element={<TrendingIndex />} />
        <Route path="trending/:slug" element={<TrendPage />} />
        <Route path="seasonal" element={<SeasonalIndex />} />
        <Route path="seasonal/:slug" element={<SeasonalPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        {STATIC.map((p) => <Route key={p} path={p} element={<StaticPage />} />)}
        {/* Categories own clean top-level URLs: /gadgets, /gadgets/smart-home */}
        <Route path=":parent" element={<CategoryPage />} />
        <Route path=":parent/:child" element={<CategoryPage />} />
        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
      </Route>
    </Routes>
  );
}
