import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useInstructor(userId: string | undefined) {
  const [isInstructor, setIsInstructor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsInstructor(false);
      setLoading(false);
      return;
    }

    const checkInstructorStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        setIsInstructor(userData?.isInstructor === true);
      } catch (error) {
        console.error('Error checking instructor status:', error);
        setIsInstructor(false);
      } finally {
        setLoading(false);
      }
    };

    checkInstructorStatus();
  }, [userId]);

  return { isInstructor, loading };
}
