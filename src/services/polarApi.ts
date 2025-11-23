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
}

export default new PolarApiService();
