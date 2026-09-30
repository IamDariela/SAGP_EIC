
import { db } from '../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkUser() {
    try {
        const userId = 'ucvEmHZqYJbOB7EUYsYBfIHnDM63';
        const userRef = doc(db, 'user_profiles', userId);
        const snapshot = await getDoc(userRef);
        console.log('Exists:', snapshot.exists());
        if (snapshot.exists()) {
            console.log('Data:', snapshot.data());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUser();
