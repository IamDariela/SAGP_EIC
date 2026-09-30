import { listAllProfiles } from '../src/lib/firebase';

async function main() {
    const profiles = await listAllProfiles();
    console.log(JSON.stringify(profiles, null, 2));
}

main().catch(console.error);
