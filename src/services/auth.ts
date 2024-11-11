import { auth } from '../firebase/config';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    User 
} from 'firebase/auth';

export class AuthService {
    static async signIn(email: string, password: string): Promise<User> {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    }

    static async signUp(email: string, password: string): Promise<User> {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
    }

    static async signOut(): Promise<void> {
        return signOut(auth);
    }
} 