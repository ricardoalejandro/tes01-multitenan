import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  // Expose axios instance for direct use (e.g., file downloads)
  get axiosInstance(): AxiosInstance {
    return this.client;
  }

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
        // Suprimir logs en consola para validaciones de negocio (409 Conflict)
        if (error.response?.status === 409) {
          // Es una validación esperada, no un error del sistema
          // Solo rechazar silenciosamente sin loggear en consola
          const silentError = new Error('Validation error');
          (silentError as any).response = error.response;
          (silentError as any).config = error.config;
          return Promise.reject(silentError);
        }
        
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            // Redirect will be handled by the component that catches the error
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

  async importStudent(studentId: string, data: { branchId: string; admissionDate: string; observation?: string }) {
    const response = await this.client.post(`/students/${studentId}/import`, data);
    return response.data;
  }

  async changeStudentStatus(studentId: string, data: { branchId: string; status: 'Alta' | 'Baja'; observation: string }) {
    const response = await this.client.put(`/students/${studentId}/status`, data);
    return response.data;
  }

  async getStudentTransactions(studentId: string, branchId?: string, page?: number, limit?: number) {
    const response = await this.client.get(`/students/${studentId}/transactions`, { 
      params: { branchId, page, limit } 
    });
    return response.data;
  }

  // Courses
  async getCourses(branchId: string, page?: number, limit?: number, search?: string) {
    const response = await this.client.get('/courses', { 
      params: { branchId, page, limit, search } 
    });
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
  async getInstructors(branchId: string, page?: number, limit?: number, search?: string) {
    const response = await this.client.get('/instructors', { 
      params: { branchId, page, limit, search } 
    });
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
  async getGroups(branchId: string, page?: number, limit?: number, search?: string) {
    const response = await this.client.get('/groups', { 
      params: { branchId, page, limit, search } 
    });
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

  // Nuevos métodos para sistema avanzado de grupos
  async generateCalendar(data: any) {
    const response = await this.client.post('/groups/generate-calendar', data);
    return response.data;
  }

  async getGroupDetails(id: string) {
    const response = await this.client.get(`/groups/${id}`);
    return response.data;
  }

  async enrollStudents(groupId: string, data: any) {
    const response = await this.client.post(`/groups/${groupId}/enroll`, data);
    return response.data;
  }

  async getGroupStudents(groupId: string) {
    const response = await this.client.get(`/groups/${groupId}/students`);
    return response.data;
  }

  async getAvailableStudents(groupId: string, branchId: string) {
    const response = await this.client.get(`/groups/${groupId}/available-students`, { params: { branchId } });
    return response.data.data || response.data || [];
  }

  async unenrollStudent(groupId: string, studentId: string) {
    const response = await this.client.delete(`/groups/${groupId}/enroll/${studentId}`);
    return response.data;
  }

  async changeGroupStatus(groupId: string, data: any) {
    const response = await this.client.put(`/groups/${groupId}/status`, data);
    return response.data;
  }

  async getGroupTransactions(groupId: string) {
    const response = await this.client.get(`/groups/${groupId}/transactions`);
    return response.data;
  }
}

export const api = new ApiClient();
