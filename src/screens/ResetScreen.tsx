import { useEffect, useState } from 'react';
import { loadRounds } from '../deck';
import { clearRealLocal, resetTest } from '../testMode';
export default function ResetScreen() {
  const [status, setStatus] = useState('Checking the link…');
  const [allowed, setAllowed] = useState(false);
  const [done, setDone] = useState(false);
  const params = new URLSearchParams(location.search);
  useEffect(() => {
    const controller = new AbortController();
    void loadRounds(controller.signal).then(async rounds => {
      if (controller.signal.aborted) return;
      const key = new URLSearchParams(location.search).get('key');
      if (!rounds.admin_key || key !== rounds.admin_key) { setStatus('Ask Mark for help'); return; }
      setAllowed(true);
      try { setStatus(await resetTest(rounds.answers_endpoint, key)); setDone(true); }
      catch (error) { setStatus((error as Error).message); }
    }).catch(() => { if (!controller.signal.aborted) setStatus('Ask Mark for help'); });
    return () => controller.abort();
  }, []);
  return <main className="center-screen screen"><h1>Fresh start</h1><p role="status">{status}</p>
    {allowed && params.get('all') === '1' && <button className="primary" onClick={() => {
      if (!confirm('Clear real Tom, Jane, and Together progress on this phone? The Sheet stays as it is.')) return;
      clearRealLocal(); setStatus('Real progress cleared on this phone');
    }}>Also clear ALL real progress on this phone</button>}
    {done && <a className="button" href={location.pathname}>Start fresh</a>}
  </main>;
}
