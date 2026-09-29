import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { actions } from '../lib/store';
import { Logo } from '../components/visuals';

// Tracking link: /#/go/CODE records a click for that creator, then forwards to the shop.
export default function Go() {
  const { code } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const c = actions.recordClick(code);
    if (!c) { setState({ status: 'missing' }); return; }
    setState({ status: 'ok', c });
  }, [code]);
  useEffect(() => {
    if (state.status !== 'ok' || !state.c.shopUrl) return undefined;
    const t = setTimeout(() => { window.location.href = state.c.shopUrl; }, 1500);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <main className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <Logo />
        {state.status === 'missing' && <p className="mt-6 text-ink-muted">This link is no longer active. <Link to="/" className="text-brand-dark">Go to Buzz</Link></p>}
        {state.status === 'ok' && (
          <>
            <p className="mt-6 text-[18px] font-bold">Taking you to {state.c.productName}…</p>
            <p className="text-ink-muted mt-1">Use code <b className="text-ink">{code.toUpperCase()}</b> at checkout.</p>
            {!state.c.shopUrl && <Link to={`/opportunity/${state.c.id}`} className="text-brand-dark mt-3 inline-block">View product</Link>}
          </>
        )}
      </div>
    </main>
  );
}
