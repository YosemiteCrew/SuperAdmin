import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export interface CreateTicketData {
  category: string;
  platform: string;
  fullName: string;
  emailAddress: string;
  userType: string;
  createdBy: string;
  userStatus: string;
  message: string;
  attachments?: File[];
}

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  userType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface TicketResponse {
  success: boolean;
  message?: string;
  data?: any;
  errors?: Array<{ field: string; message: string }>;
}

export interface DashboardStats {
  newTickets: number;
  escalatedTickets: number;
  reopenedTickets: number;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  avgResolutionTimeDays: number;
  avgResponseTimeMinutes: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
  message?: string;
  errors?: any[];
}
export interface UnresolvedTicket {
  id: string;
  status: string;
  days: number;
}

export interface UnresolvedTicketsResponse {
  success: boolean;
  data: UnresolvedTicket[];
  message?: string;
  errors?: any[];
}

class SupportTicketService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async createTicket(data: CreateTicketData): Promise<TicketResponse> {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('category', data.category);
      formData.append('platform', data.platform);
      formData.append('fullName', data.fullName);
      formData.append('emailAddress', data.emailAddress);
      formData.append('userType', data.userType);
      formData.append('createdBy', data.createdBy);
      formData.append('userStatus', data.userStatus);
      formData.append('message', data.message);

      // Add files
      if (data.attachments) {
        data.attachments.forEach((file, index) => {
          formData.append('attachments', file);
        });
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/support-tickets/create`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...this.getAuthHeaders(),
          },
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create ticket',
        errors: error.response?.data?.errors || []
      };
    }
  }

  async getTickets(filters: TicketFilters = {}): Promise<TicketResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/api/support-tickets?${params.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch tickets',
        errors: error.response?.data?.errors || []
      };
    }
  }

  // async getTicketById(id: string): Promise<TicketResponse> {
  //   try {
  //     const response = await axios.get(
  //       `${API_BASE_URL}/api/support-tickets/${id}`,
  //       {
  //         headers: this.getAuthHeaders(),
  //       }
  //     );

  //     return response.data;
  //   } catch (error: any) {
  //     return {
  //       success: false,
  //       message: error.response?.data?.message || 'Failed to fetch ticket',
  //       errors: error.response?.data?.errors || []
  //     };
  //   }
  // }

  async updateTicketStatus(id: string, status: string, notes?: string): Promise<TicketResponse> {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/support-tickets/${id}/status`,
        { status, notes },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update ticket status',
        errors: error.response?.data?.errors || []
      };
    }
  }

  async getTicketStats(period: number = 30): Promise<TicketResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/support-tickets/stats/overview?period=${period}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch ticket statistics',
        errors: error.response?.data?.errors || []
      };
    }
  }

  async deleteTicket(id: string): Promise<TicketResponse> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/support-tickets/${id}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete ticket',
        errors: error.response?.data?.errors || []
      };
    }
  }

  async getDashboardStats(period: number = 30): Promise<DashboardStatsResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/support-tickets/dashboard-stats?period=${period}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch dashboard statistics',
        errors: error.response?.data?.errors || [],
        data: {
          newTickets: 0,
          escalatedTickets: 0,
          reopenedTickets: 0,
          totalTickets: 0,
          openTickets: 0,
          closedTickets: 0,
          avgResolutionTimeDays: 0,
          avgResponseTimeMinutes: 0
        }
      };
    }
  }
  async getUnresolvedTickets(limit: number = 5, period: number = 30): Promise<UnresolvedTicketsResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/support-tickets/unresolved?limit=${limit}&period=${period}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch unresolved tickets',
        errors: error.response?.data?.errors || [],
        data: []
      };
    }
  }

  
}

export default new SupportTicketService();