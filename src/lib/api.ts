import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async me() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Branches
  async getBranches() {
    const response = await this.client.get('/branches');
    return response.data;
  }

  async createBranch(data: any) {
    const response = await this.client.post('/branches', data);
    return response.data;
  }

  async updateBranch(id: string, data: any) {
    const response = await this.client.put(`/branches/${id}`, data);
    return response.data;
  }

  async deleteBranch(id: string) {
    const response = await this.client.delete(`/branches/${id}`);
    return response.data;
  }

  // Students
  async getStudents(params: any) {
    const response = await this.client.get('/students', { params });
    return response.data;
  }

  async createStudent(data: any) {
    const response = await this.client.post('/students', data);
    return response.data;
  }

  async updateStudent(id: string, data: any) {
    const response = await this.client.put(`/students/${id}`, data);
    return response.data;
  }

  async deleteStudent(id: string) {
    const response = await this.client.delete(`/students/${id}`);
    return response.data;
  }

  // Courses
  async getCourses(branchId: string) {
    const response = await this.client.get('/courses', { params: { branchId } });
    return response.data;
  }

  async createCourse(data: any) {
    const response = await this.client.post('/courses', data);
    return response.data;
  }

  async updateCourse(id: string, data: any) {
    const response = await this.client.put(`/courses/${id}`, data);
    return response.data;
  }

  async deleteCourse(id: string) {
    const response = await this.client.delete(`/courses/${id}`);
    return response.data;
  }

  // Instructors
  async getInstructors(branchId: string) {
    const response = await this.client.get('/instructors', { params: { branchId } });
    return response.data;
  }

  async createInstructor(data: any) {
    const response = await this.client.post('/instructors', data);
    return response.data;
  }

  async updateInstructor(id: string, data: any) {
    const response = await this.client.put(`/instructors/${id}`, data);
    return response.data;
  }

  async deleteInstructor(id: string) {
    const response = await this.client.delete(`/instructors/${id}`);
    return response.data;
  }

  // Groups
  async getGroups(branchId: string) {
    const response = await this.client.get('/groups', { params: { branchId } });
    return response.data;
  }

  async getGroup(id: string) {
    const response = await this.client.get(`/groups/${id}`);
    return response.data;
  }

  async createGroup(data: any) {
    const response = await this.client.post('/groups', data);
    return response.data;
  }

  async updateGroup(id: string, data: any) {
    const response = await this.client.put(`/groups/${id}`, data);
    return response.data;
  }

  async deleteGroup(id: string) {
    const response = await this.client.delete(`/groups/${id}`);
    return response.data;
  }

  async generateSchedule(groupId: string) {
    const response = await this.client.post(`/groups/${groupId}/generate-schedule`);
    return response.data;
  }

  // Enrollments
  async getEnrollments(groupId: string) {
    const response = await this.client.get('/enrollments', { params: { groupId } });
    return response.data;
  }

  async createEnrollment(data: any) {
    const response = await this.client.post('/enrollments', data);
    return response.data;
  }

  async deleteEnrollment(id: string) {
    const response = await this.client.delete(`/enrollments/${id}`);
    return response.data;
  }

  async bulkEnroll(data: any) {
    const response = await this.client.post('/enrollments/bulk', data);
    return response.data;
  }

  // Attendance
  async getAttendance(sessionId: string) {
    const response = await this.client.get('/attendance', { params: { sessionId } });
    return response.data;
  }

  async updateAttendance(data: any) {
    const response = await this.client.put('/attendance', data);
    return response.data;
  }

  async getAttendanceStats(groupId: string) {
    const response = await this.client.get('/attendance/stats', { params: { groupId } });
    return response.data;
  }
}

export const api = new ApiClient();
