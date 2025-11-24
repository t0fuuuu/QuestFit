import axios from 'axios';
import { WorkoutData, HeartRateData, UserProfile } from '../types/polar';
import { polarOAuthService } from './polarOAuthService';

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

class PolarApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Initialize the API service with the user's access token from Firebase
   */
  async initializeForUser(userId: string): Promise<boolean> {
    try {
      const token = await polarOAuthService.getAccessToken(userId);
      if (token) {
        this.setAccessToken(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing Polar API for user:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get current user's profile information
   * Endpoint: GET /users
   */
  async getUserProfile(): Promise<UserProfile> {
    const response = await axios.get(`${POLAR_BASE_URL}/users`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get all exercises/workouts for the user
   * Endpoint: GET /exercises
   */
  async getWorkouts(): Promise<WorkoutData[]> {
    const response = await axios.get(`${POLAR_BASE_URL}/exercises`, {
      headers: this.getHeaders(),
    });
    return response.data.exercises || [];
  }

  /**
   * Get heart rate data for a specific exercise
   * Endpoint: GET /exercises/{exerciseId}/heart-rate
   */
  async getHeartRateData(exerciseId: string): Promise<HeartRateData> {
    const response = await axios.get(`${POLAR_BASE_URL}/exercises/${exerciseId}/heart-rate`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get detailed information about a specific workout
   * Endpoint: GET /exercises/{exerciseId}
   */
  async getWorkoutDetails(exerciseId: string): Promise<WorkoutData> {
    const response = await axios.get(`${POLAR_BASE_URL}/exercises/${exerciseId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get user's activity zones
   * Endpoint: GET /users/activity-zones
   */
  async getActivityZones(): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/users/activity-zones`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get user's physical info (weight, height, etc.)
   * Endpoint: GET /users/physical-info
   */
  async getPhysicalInfo(): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/users/physical-info`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get user's heart rate zones
   * Endpoint: GET /users/heart-rate-zones
   */
  async getHeartRateZones(): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/users/heart-rate-zones`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get summary data for a specific exercise
   * Endpoint: GET /exercises/{exerciseId}/summary
   */
  async getExerciseSummary(exerciseId: string): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/exercises/${exerciseId}/summary`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get training load pro data
   * Endpoint: GET /training/load
   */
  async getTrainingLoad(): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/training/load`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get recovery data
   * Endpoint: GET /users/physical-info
   */
  async getRecovery(): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/users/physical-info`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get user activities for a specific date
   * Endpoint: GET /v3/users/activities/{date}
   * @param date - Date in format YYYY-MM-DD
   */
  async getActivities(date: string): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/users/activities/${date}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get detailed exercise data
   * Endpoint: GET /v3/exercises/{exerciseId}
   * @param exerciseId - The ID of the exercise
   */
  async getExercise(exerciseId: string): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/exercises/${exerciseId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get nightly recharge data for a specific date
   * Endpoint: GET /v3/users/nightly-recharge/{date}
   * @param date - Date in format YYYY-MM-DD
   */
  async getNightlyRecharge(date: string): Promise<any> {
    const response = await axios.get(`${POLAR_BASE_URL}/users/nightly-recharge/${date}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Fetch all available data for a user on a specific date
   * This includes activities, exercises, and nightly recharge
   * @param date - Date in format YYYY-MM-DD
   */
  async fetchDailyData(date: string): Promise<{
    activities?: any;
    exercises?: any[];
    nightlyRecharge?: any;
    errors?: string[];
  }> {
    const result: any = { errors: [] };

    // Fetch activities
    try {
      result.activities = await this.getActivities(date);
    } catch (error: any) {
      console.error(`Error fetching activities for ${date}:`, error.message);
      if (error.response?.status !== 404) {
        result.errors.push(`activities: ${error.message}`);
      }
    }

    // Fetch nightly recharge
    try {
      result.nightlyRecharge = await this.getNightlyRecharge(date);
    } catch (error: any) {
      console.error(`Error fetching nightly recharge for ${date}:`, error.message);
      if (error.response?.status !== 404) {
        result.errors.push(`nightlyRecharge: ${error.message}`);
      }
    }

    // If activities contain exercise references, fetch detailed exercise data
    if (result.activities?.exercises && Array.isArray(result.activities.exercises)) {
      result.exercises = [];
      for (const exerciseRef of result.activities.exercises) {
        try {
          const exerciseData = await this.getExercise(exerciseRef.id || exerciseRef);
          result.exercises.push(exerciseData);
        } catch (error: any) {
          console.error(`Error fetching exercise ${exerciseRef.id || exerciseRef}:`, error.message);
          if (error.response?.status !== 404) {
            result.errors.push(`exercise ${exerciseRef.id}: ${error.message}`);
          }
        }
      }
    }

    return result;
  }
}

export default new PolarApiService();
