import { deleteGhostFixture } from '@/lib/store/db';

async function main() {
	const [gameId, playerId] = process.argv.slice(2);
	if (!gameId || !playerId) throw new Error('usage: clear-ghost-fixture <gameId> <playerId>');
	await deleteGhostFixture(gameId, playerId);
	console.log(`cleared ${gameId}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });