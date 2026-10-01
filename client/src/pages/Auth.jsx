import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { errorMessage } from '../lib/api.js';
import { Seo } from '../lib/seo.jsx';
import Button from '../components/ui/Button.jsx';

function Shell({ title, subtitle, children }) {
  return (
    <section className="container-x grid min-h-[70vh] items-center py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-serif text-[3.2rem] leading-none tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input h-12 text-[1rem]" {...props} />
    </label>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [state, setState] = useState({ loading: false, error: '' });
  const from = location.state?.from || null;

  if (user) return <Navigate to={from || (['admin', 'editor'].includes(user.role) ? '/admin' : '/')} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const u = await login(form.email, form.password);
      navigate(from || (['admin', 'editor'].includes(u.role) ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err) });
    }
  };

  return (
    <Shell title="Sign in" subtitle="Editors and admins manage the site from here.">
      <Seo title="Sign in" noindex />
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {state.error && <p className="text-sm text-accent-ink" role="alert">{state.error}</p>}
        <Button type="submit" loading={state.loading} className="w-full" size="lg">Sign in</Button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const site = useSite();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: '', email: '', password: '' });
  const [state, setState] = useState({ loading: false, error: '' });

  if (user) return <Navigate to="/" replace />;
  if (site?.ready && site.registration_open === false) {
    return (
      <Shell title="Registration is closed" subtitle="New accounts aren't being created right now.">
        <Link to="/" className="underline underline-offset-4">Back to the homepage</Link>
      </Shell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err) });
    }
  };

  return (
    <Shell title="Create an account" subtitle="Save your details for newsletter preferences and future features.">
      <Seo title="Create an account" noindex />
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" autoComplete="name" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password (10+ characters)" type="password" autoComplete="new-password" minLength={10} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {state.error && <p className="text-sm text-accent-ink" role="alert">{state.error}</p>}
        <Button type="submit" loading={state.loading} className="w-full" size="lg">Create account</Button>
        <p className="text-center text-sm text-muted">Already have an account? <Link to="/login" className="text-ink underline underline-offset-2">Sign in</Link></p>
      </form>
    </Shell>
  );
}
