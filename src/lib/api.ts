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

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async verifyResetToken(token: string) {
    const response = await this.client.get(`/auth/verify-token/${token}`);
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.client.post(`/auth/reset-password/${token}`, { newPassword });
    return response.data;
  }

  async requestPasswordChange() {
    const response = await this.client.post('/auth/request-password-change');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
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

  async changeStudentStatus(studentId: string, data: { branchId: string; status: 'Alta' | 'Baja'; observation: string; transactionSubtype?: string }) {
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

  // Users Management
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async createUser(data: any) {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: any) {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data;
  }

  async adminResetPassword(userId: string, newPassword: string) {
    const response = await this.client.put(`/users/${userId}/reset-password`, { newPassword });
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  async getUserBranches(id: string) {
    const response = await this.client.get(`/users/${id}/branches`);
    return response.data;
  }

  // Roles Management
  async getRoles() {
    const response = await this.client.get('/roles');
    return response.data;
  }

  async createRole(data: any) {
    const response = await this.client.post('/roles', data);
    return response.data;
  }

  async updateRole(id: string, data: any) {
    const response = await this.client.put(`/roles/${id}`, data);
    return response.data;
  }

  async deleteRole(id: string) {
    const response = await this.client.delete(`/roles/${id}`);
    return response.data;
  }

  async getRolePermissions(id: string) {
    const response = await this.client.get(`/roles/${id}/permissions`);
    return response.data;
  }

  // System Config
  async getSMTPConfig() {
    const response = await this.client.get('/system/config/smtp');
    return response.data;
  }

  async saveSMTPConfig(data: any) {
    const response = await this.client.post('/system/config/smtp', data);
    return response.data;
  }

  async testSMTPConnection() {
    const response = await this.client.post('/system/config/smtp/test');
    return response.data;
  }

  // Philosophical Counseling
  async getCounselings(studentId: string) {
    const response = await this.client.get(`/counseling/${studentId}`);
    return response.data;
  }

  async createCounseling(studentId: string, data: any) {
    const response = await this.client.post(`/counseling/${studentId}`, data);
    return response.data;
  }

  async updateCounseling(studentId: string, counselingId: string, data: any) {
    const response = await this.client.put(`/counseling/${studentId}/${counselingId}`, data);
    return response.data;
  }

  async deleteCounseling(studentId: string, counselingId: string) {
    const response = await this.client.delete(`/counseling/${studentId}/${counselingId}`);
    return response.data;
  }

  async getCounseling(studentId: string, counselingId: string) {
    const response = await this.client.get(`/counseling/${studentId}/${counselingId}`);
    return response.data;
  }

  // Profile
  async getProfile() {
    const response = await this.client.get('/profile/me');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/profile/me', data);
    return response.data;
  }

  // Course Templates
  async getCourseTemplates() {
    const response = await this.client.get('/course-templates');
    return response.data;
  }

  async getCourseTemplate(id: string) {
    const response = await this.client.get(`/course-templates/${id}`);
    return response.data;
  }

  async createCourseTemplate(data: any) {
    const response = await this.client.post('/course-templates', data);
    return response.data;
  }

  async updateCourseTemplate(id: string, data: any) {
    const response = await this.client.put(`/course-templates/${id}`, data);
    return response.data;
  }

  async deleteCourseTemplate(id: string) {
    const response = await this.client.delete(`/course-templates/${id}`);
    return response.data;
  }

  // ============================================
  // ATTENDANCE MODULE
  // ============================================

  // Get groups with attendance stats
  async getAttendanceGroups(branchId: string) {
    const response = await this.client.get('/attendance/groups', {
      params: { branchId },
    });
    return response.data;
  }

  // Get sessions for a group
  async getGroupSessions(groupId: string, status?: 'pendiente' | 'dictada' | 'all') {
    const response = await this.client.get(`/attendance/groups/${groupId}/sessions`, {
      params: { status },
    });
    return response.data;
  }

  // Get pending sessions (alerts)
  async getPendingSessions(branchId: string) {
    const response = await this.client.get('/attendance/pending', {
      params: { branchId },
    });
    return response.data;
  }

  // Get session detail
  async getSessionDetail(sessionId: string) {
    const response = await this.client.get(`/attendance/sessions/${sessionId}`);
    return response.data;
  }

  // Get students with attendance for a session (optionally by course)
  async getSessionStudents(sessionId: string, courseId?: string) {
    const params = courseId ? `?courseId=${courseId}` : '';
    const response = await this.client.get(`/attendance/sessions/${sessionId}/students${params}`);
    return response.data;
  }

  // Update attendance status
  async updateAttendanceStatus(attendanceId: string, status: string) {
    const response = await this.client.put(`/attendance/students/${attendanceId}`, { status });
    return response.data;
  }

  // Update or create attendance by session, student, and optionally course
  async updateAttendanceBySessionStudent(sessionId: string, studentId: string, status: string, courseId?: string) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/students/${studentId}`, {
      status,
      courseId: courseId || null,
    });
    return response.data;
  }

  // Update or create attendance by session and student (legacy - without courseId)
  async upsertAttendance(sessionId: string, studentId: string, status: string) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/students/${studentId}`, { status });
    return response.data;
  }

  // Update or create attendance by session, student and course
  async upsertAttendanceWithCourse(sessionId: string, studentId: string, status: string, courseId?: string) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/students/${studentId}`, {
      status,
      courseId
    });
    return response.data;
  }

  // Update or create attendance for multiple courses (used when "all courses" is selected)
  async upsertAttendanceWithCourses(sessionId: string, studentId: string, status: string, courseIds: string[]) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/students/${studentId}`, {
      status,
      courseIds
    });
    return response.data;
  }

  // Add observation
  async addAttendanceObservation(attendanceId: string, content: string, userId?: string) {
    const response = await this.client.post(`/attendance/students/${attendanceId}/observations`, {
      content,
      userId,
    });
    return response.data;
  }

  // Get observations history
  async getAttendanceObservations(attendanceId: string) {
    const response = await this.client.get(`/attendance/students/${attendanceId}/observations`);
    return response.data;
  }

  // Update session execution
  async updateSessionExecution(sessionId: string, data: {
    actualInstructorId?: string | null;
    actualAssistantId?: string | null;
    actualTopic?: string | null;
    actualDate: string;
    notes?: string | null;
    executedBy?: string;
  }) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/execution`, data);
    return response.data;
  }

  // Mark session as dictada
  async completeSession(sessionId: string, executedBy?: string) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/complete`, { executedBy });
    return response.data;
  }

  // Reopen session (change from dictada to pendiente)
  async reopenSession(sessionId: string) {
    const response = await this.client.put(`/attendance/sessions/${sessionId}/reopen`);
    return response.data;
  }

  // Get calendar view
  async getAttendanceCalendar(groupId: string, month?: number, year?: number) {
    const response = await this.client.get(`/attendance/calendar/${groupId}`, {
      params: { month, year },
    });
    return response.data;
  }

  // Get instructors for attendance
  async getAttendanceInstructors() {
    const response = await this.client.get('/attendance/instructors');
    return response.data;
  }

  // Get attendance notebook (matrix view)
  async getAttendanceNotebook(groupId: string, params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    sessionsPerPage?: number;
    studentFilter?: 'all' | 'critical' | 'search';
    searchTerm?: string;
    sortBy?: 'name' | 'attendance' | 'absences';
    sortOrder?: 'asc' | 'desc';
    courseId?: string;
  }) {
    const response = await this.client.get(`/attendance/notebook/${groupId}`, { params });
    return response.data;
  }
}

export const api = new ApiClient();
