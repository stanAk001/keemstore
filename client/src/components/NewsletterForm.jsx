import { useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import { useSite } from '../context/SiteContext.jsx';
import Icon from './ui/Icon.jsx';

export default function NewsletterForm({ source = 'site', dark = false }) {
  const site = useSite();
  const n = site?.newsletter || {};
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState({ status: 'idle', message: '' });

  if (!n.enabled) return null;

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'loading', message: '' });
    try {
      const { data } = await api.post('/newsletter', { email, source, website });
      setState({ status: 'done', message: data.message });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  };

  if (state.status === 'done') {
    return (
      <p className={`flex items-center gap-3 font-serif text-[1.5rem] leading-snug ${dark ? 'text-paper' : ''}`} role="status">
        <Icon name="check" size={22} className="text-accent" /> {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full" noValidate={false}>
      <div className={`flex items-end gap-3 border-b-2 ${dark ? 'border-paper' : 'border-ink'}`}>
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={`w-full bg-transparent py-3 text-[1.15rem] focus:outline-none ${dark ? 'text-paper placeholder:text-paper/40' : 'placeholder:text-faint'}`}
          />
        </label>
        <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <button
          type="submit"
          disabled={state.status === 'loading'}
          className={`mb-2 inline-flex h-10 items-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors ${
            dark ? 'bg-paper text-ink hover:bg-accent hover:text-white' : 'bg-ink text-paper hover:bg-accent'
          }`}
        >
          {state.status === 'loading' ? 'Joining…' : n.button_label || 'Subscribe'}
        </button>
      </div>
      {state.status === 'error' && <p className="mt-2 text-sm text-accent-ink" role="alert">{state.message}</p>}
    </form>
  );
}
