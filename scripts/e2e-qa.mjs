/* E2E QA: guest -> game -> trades -> timeout finish -> result -> card -> leaderboard. */
const BASE = process.env.QA_BASE || 'http://localhost:3000';
let cookie = '';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}), ...(cookie ? { cookie } : {}) },
  });
  const set = res.headers.get('set-cookie');
  if (set) {
    const m = set.match(/ww_session=[^;]+/);
    if (m) cookie = m[0];
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (c, msg) => {
  if (!c) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok:', msg);
};

const tag = Math.random().toString(36).slice(2, 7);
const user = `qa_${tag}`;

// 1. guest auth
let r = await req('/api/auth/guest', { method: 'POST', body: JSON.stringify({ username: user }) });
assert(r.status === 200 && r.json.ok && r.json.data.player.username === user, `guest auth as ${user}`);
const ownerCookie = cookie;

// 2. create game
r = await req('/api/games', { method: 'POST', body: '{}' });
assert(r.status === 200 && r.json.ok, 'game created');
const game = r.json.data.game;
assert(game.startsAt > Date.now(), 'game starts in the future (countdown)');

// 3. countdown tick reveals nothing tradeable
r = await req(`/api/games/${game.id}/tick`);
assert(r.json.data.status === 'COUNTDOWN', 'countdown status');
assert(r.json.data.candles.length === 0, 'no candles leaked during countdown');

// 4. wait for live
await sleep(game.startsAt - Date.now() + 400);
r = await req(`/api/games/${game.id}/tick`);
assert(r.json.data.status === 'LIVE', 'game is live');
assert(r.json.data.candles.length === 45, '45 candles revealed progressively');

// 5. invalid: close with no position
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'CLOSE' }) });
assert(r.status === 422 && r.json.error.code === 'NO_POSITION', 'close-without-position rejected');

// 6. go long
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'LONG' }) });
assert(r.status === 200 && r.json.data.side === 'LONG', 'long opened');
assert(r.json.data.entryPrice > 0, 'entry price set by server');

// 7. invalid: long again
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'LONG' }) });
assert(r.status === 422, 'double-long rejected');

// 8. flip to short
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'SHORT' }) });
assert(r.status === 200 && r.json.data.side === 'SHORT', 'flip to short works');
assert(r.json.data.events.length === 3, 'flip logged as close+open');

// 9. close
await sleep(1200);
const before = (await req(`/api/games/${game.id}/tick`)).json.data;
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'CLOSE' }) });
assert(r.status === 200 && r.json.data.side === 'FLAT', 'position closed');
console.log(`   equity ${before.equity} -> ${r.json.data.equity}`);

// 10. open long, leave it open for timeout close
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'LONG' }) });
assert(r.status === 200 && r.json.data.side === 'LONG', 'final long opened (will timeout)');

// 11. wait for finish
const waitMs = game.startsAt + 45000 - Date.now() + 800;
console.log(`   waiting ${(waitMs / 1000).toFixed(0)}s for timeout finish...`);
await sleep(waitMs);
r = await req(`/api/games/${game.id}/tick`);
assert(r.json.data.status === 'FINISHED', `auto-finished at timeout (got ${r.json.data.status})`);
assert(r.json.data.result && r.json.data.result.verified, 'result verified');
const res = r.json.data.result;
console.log(`   pnl=${res.pnl} roi=${res.roi.toFixed(2)}% score=${res.score} rank=${res.rank}/${res.rankTotal} trades=${res.trades} state=${res.resultState}`);
assert(res.trades === 3, 'flip + manual + timeout closes counted');
assert(res.tradeEvents === 6, 'all 6 events logged');

// 12. post-finish trade rejected
r = await req(`/api/games/${game.id}/trade`, { method: 'POST', body: JSON.stringify({ action: 'LONG' }) });
assert(r.status === 409, 'post-finish trade rejected');

// 13. result endpoint (public)
cookie = '';
r = await req(`/api/games/${game.id}/result`);
assert(r.status === 200 && r.json.data.result.gameId === game.id, 'public result readable');

// 14. leaderboard shows the run
r = await req('/api/leaderboard?scope=daily&limit=50');
assert(r.json.data.rows.some((x) => x.username === user), 'run on daily leaderboard');

// 15. profile aggregates
r = await req(`/api/profile/${user}`);
assert(r.json.data.stats.games === 1, 'profile counts the game');
assert(r.json.data.recentGames.length === 1, 'recent game listed');

// 16. non-owner card mint rejected
r = await req(`/api/cards/game/${game.id}`, { method: 'POST', body: '{}' });
assert(r.status === 403, 'non-owner card mint rejected');

// 17. owner mints game card + png serves
cookie = ownerCookie;
r = await req(`/api/cards/game/${game.id}`, { method: 'POST', body: '{}' });
assert(r.status === 200 && r.json.data.cardId, 'owner minted game card');
const cardId = r.json.data.cardId;
const img = await fetch(BASE + `/api/cards/${cardId}/image`);
assert(img.status === 200 && img.headers.get('content-type') === 'image/png', 'card png serves');
const buf = Buffer.from(await img.arrayBuffer());
assert(buf.length > 20000, `png non-trivial (${buf.length} bytes)`);
await (await import('fs')).promises.writeFile('/tmp/ww-e2e-card.png', buf);
console.log('   e2e card saved to /tmp/ww-e2e-card.png');

// 18. second mint returns the same cached card
r = await req(`/api/cards/game/${game.id}`, { method: 'POST', body: '{}' });
assert(r.json.data.cardId === cardId && r.json.data.cached === true, 'card mint cached');

// 19. all-time card
r = await req('/api/cards/alltime', { method: 'POST', body: '{}' });
assert(r.status === 200 && r.json.data.cardId, 'all-time card minted');

// 20. profile lists cards
r = await req(`/api/profile/${user}`);
assert(r.json.data.cards.length === 2, 'profile lists both cards');

console.log('\nALL E2E CHECKS PASSED');
