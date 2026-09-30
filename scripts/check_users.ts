
import { db } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function listUsers() {
    try {
        const usersRef = collection(db, 'user_profiles');
        const snapshot = await getDocs(usersRef);
        console.log('--- Users in Firestore ---');
        snapshot.forEach(doc => {
            console.log(doc.id, doc.data());
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

listUsers();
