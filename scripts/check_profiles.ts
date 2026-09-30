
import { db } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkAdmins() {
    try {
        const usersRef = collection(db, 'user_profiles');
        const snapshot = await getDocs(usersRef);
        console.log('--- User Profiles ---');
        snapshot.forEach(doc => {
            console.log('ID:', doc.id, 'Data:', doc.data());
        });
    } catch (error) {
        console.error('Error fetching profiles (check your rules):', error);
    }
}

checkAdmins();
