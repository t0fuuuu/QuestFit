import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

interface HeartRateDataPoint {
  userId: string;
  timestamp: Date;
  heartRate: number;
  workoutType?: string;
  workoutId?: string;
  zone?: number;
  metadata?: {
    duration?: number; // in secs
    avgHR?: number;
    maxHR?: number;
    minHR?: number;
  };
}

interface HeartRateHistory {
  id: string;
  userId: string;
  timestamp: Date;
  heartRate: number;
  workoutType?: string;
  workoutId?: string;
  zone?: number;
  metadata?: {
    duration?: number;
    avgHR?: number;
    maxHR?: number;
    minHR?: number;
  };
}

class HeartRateTrackingService {
  // pushes heart rate data to firebase 
  async recordHeartRate(data: HeartRateDataPoint): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'heartRateData'), {
        userId: data.userId,
        timestamp: Timestamp.fromDate(data.timestamp),
        heartRate: data.heartRate,
        workoutType: data.workoutType || null,
        workoutId: data.workoutId || null,
        zone: data.zone || null,
        metadata: data.metadata || null
      });

      console.log(`💓 Heart rate data recorded: ${data.heartRate} bpm for user ${data.userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error recording heart rate:', error);
      throw error;
    }
  }

  // batch push multiple heart rate readings at once (for instr)
  async recordMultipleHeartRates(dataPoints: HeartRateDataPoint[]): Promise<void> {
    try {
      const promises = dataPoints.map(data => this.recordHeartRate(data));
      await Promise.all(promises);
      console.log(`💓 Batch recorded ${dataPoints.length} heart rate readings`);
    } catch (error) {
      console.error('Error batch recording heart rates:', error);
      throw error;
    }
  }

  // get heart rate history for a specific user
  async getUserHeartRateHistory(
    userId: string, 
    limitCount: number = 100
  ): Promise<HeartRateHistory[]> {
    try {
      const q = query(
        collection(db, 'heartRateData'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        timestamp: doc.data().timestamp.toDate(),
        heartRate: doc.data().heartRate,
        workoutType: doc.data().workoutType,
        workoutId: doc.data().workoutId,
        zone: doc.data().zone,
        metadata: doc.data().metadata
      }));
    } catch (error) {
      console.error('Error fetching heart rate history:', error);
      throw error;
    }
  }

  // get heart rate data for a specific workout session
  async getWorkoutHeartRateData(workoutId: string): Promise<HeartRateHistory[]> {
    try {
      const q = query(
        collection(db, 'heartRateData'),
        where('workoutId', '==', workoutId),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        timestamp: doc.data().timestamp.toDate(),
        heartRate: doc.data().heartRate,
        workoutType: doc.data().workoutType,
        workoutId: doc.data().workoutId,
        zone: doc.data().zone,
        metadata: doc.data().metadata
      }));
    } catch (error) {
      console.error('Error fetching workout heart rate data:', error);
      throw error;
    }
  }

  // calculates average heart rate improvement over time periods
  async calculateHeartRateImprovement(
    userId: string,
    workoutType?: string
  ): Promise<{
    avgHRLast7Days: number;
    avgHRLast30Days: number;
    avgHRAllTime: number;
    improvement7to30: number;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    try {
      const allData = await this.getUserHeartRateHistory(userId, 1000);
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // filter by workout type if specified
      let filteredData = allData;
      if (workoutType) {
        filteredData = allData.filter(d => d.workoutType === workoutType);
      }

      // seperate data by time periods
      const last7Days = filteredData.filter(d => d.timestamp >= sevenDaysAgo);
      const last30Days = filteredData.filter(d => d.timestamp >= thirtyDaysAgo);

      // calculate averages
      const avgHRLast7Days = last7Days.length > 0
        ? last7Days.reduce((sum, d) => sum + d.heartRate, 0) / last7Days.length
        : 0;
      
      const avgHRLast30Days = last30Days.length > 0
        ? last30Days.reduce((sum, d) => sum + d.heartRate, 0) / last30Days.length
        : 0;
      
      const avgHRAllTime = filteredData.length > 0
        ? filteredData.reduce((sum, d) => sum + d.heartRate, 0) / filteredData.length
        : 0;

      // calculate improvement (lower average heart rate at same intensity = better fitness)
      const improvement7to30 = avgHRLast30Days - avgHRLast7Days;
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (improvement7to30 > 2) trend = 'improving'; // HR decreasing = improving
      else if (improvement7to30 < -2) trend = 'declining'; // HR increasing = declining

      return {
        avgHRLast7Days: Math.round(avgHRLast7Days),
        avgHRLast30Days: Math.round(avgHRLast30Days),
        avgHRAllTime: Math.round(avgHRAllTime),
        improvement7to30: Math.round(improvement7to30),
        trend
      };
    } catch (error) {
      console.error('Error calculating heart rate improvement:', error);
      throw error;
    }
  }

  // get heart rate zones distribution for analysis
  async getHeartRateZoneDistribution(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<number, number>> {
    try {
      let data = await this.getUserHeartRateHistory(userId, 1000);

      // filter by date range if provided
      if (startDate) {
        data = data.filter(d => d.timestamp >= startDate);
      }
      if (endDate) {
        data = data.filter(d => d.timestamp <= endDate);
      }

      // count time in each zone
      const zoneDistribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      };

      data.forEach(point => {
        if (point.zone && point.zone >= 1 && point.zone <= 5) {
          zoneDistribution[point.zone]++;
        }
      });

      return zoneDistribution;
    } catch (error) {
      console.error('Error getting zone distribution:', error);
      throw error;
    }
  }
}

export default new HeartRateTrackingService();
