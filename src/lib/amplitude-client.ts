import axios from 'axios';
import { subDays, addDays, format } from 'date-fns';

export interface AmplitudeConfig {
  apiKey: string;
  secretKey: string;
  projectId: string;
}

export interface TestResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export class AmplitudeClient {
  private config: AmplitudeConfig;
  private baseUrl = 'https://amplitude.com/api/2';

  constructor(config: AmplitudeConfig) {
    this.config = config;
  }

  private getAuthHeaders() {
    const credentials = Buffer.from(`${this.config.apiKey}:${this.config.secretKey}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test connection using the events list endpoint
      const response = await axios.get(`${this.baseUrl}/events/list`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      return {
        test: 'Connection Test',
        success: true,
        data: { 
          status: response.status, 
          statusText: response.statusText,
          eventCount: response.data?.data?.length || 0
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        test: 'Connection Test',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async testEventQuery(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 7); // Use 7 days for more reliable data
      
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(startDate, 'yyyyMMdd'),
          end: format(endDate, 'yyyyMMdd'),
          m: 'uniques'
        },
        timeout: 15000
      });

      const seriesData = response.data?.data?.series?.[0] || [];
      const totalUniques = seriesData.reduce((sum: number, val: number) => sum + val, 0);
      
      return {
        test: 'Event Query Test',
        success: true,
        data: { 
          uniqueUsers: totalUniques, 
          period: '7d',
          dailyBreakdown: seriesData.length
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        test: 'Event Query Test',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async testEventList(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/events/list`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      const events = response.data?.data || [];
      
      return {
        test: 'Event List Test',
        success: true,
        data: { 
          eventCount: events.length,
          events: events.slice(0, 5).map((e: any) => e.display || e.value),
          totalEvents: events.length,
          sampleEvents: events.slice(0, 3).map((e: any) => ({
            name: e.display || e.value,
            totals: e.totals,
            hidden: e.hidden
          }))
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        test: 'Event List Test',
        success: false,
        error: error.response?.data?.error || error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🔍 Starting Amplitude MCP tests...');
    
    const tests = [
      this.testConnection(),
      this.testEventQuery(),
      this.testEventList()
    ];

    const results = await Promise.all(tests);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ ${successCount}/${results.length} tests passed`);
    
    return results;
  }

  // New DAU monitoring methods
  async getDailyActiveUsers(days: number = 7): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Use the same date calculation as YoY to ensure alignment
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, days);
      
      const endDate = currentEndDate;
      const startDate = currentStartDate;
      
      // Use the same format as working testEventQuery method
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(startDate, 'yyyyMMdd'),
          end: format(endDate, 'yyyyMMdd'),
          m: 'uniques'
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getDailyActiveUsersForDateRange(startDate: string, endDate: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Use the same format as working testEventQuery method
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: startDate,
          end: endDate,
          m: 'uniques'
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getDailyActiveUsersYoY(days: number = 7): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Get current date range
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, days);
      
      // For YoY, we want to align each current day with the same weekday from last year
      // Start by finding the same date last year for the START date
      const yoyStartDate = subDays(currentStartDate, 365);
      
      // Calculate day-of-week offset to align the START dates
      const currentStartDayOfWeek = currentStartDate.getDay();
      const yoyStartDayOfWeek = yoyStartDate.getDay();
      
      // Calculate offset needed to align the start days
      let dayOffset = currentStartDayOfWeek - yoyStartDayOfWeek;
      
      // Adjust the YoY start date to match the current start day of week
      const alignedYoyStartDate = addDays(yoyStartDate, dayOffset);
      const alignedYoyEndDate = addDays(alignedYoyStartDate, days);
      
      // Use the same format as working testEventQuery method
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(alignedYoyStartDate, 'yyyyMMdd'),
          end: format(alignedYoyEndDate, 'yyyyMMdd'),
          m: 'uniques'
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getWeeklyActiveUsers(weeks: number = 12): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Calculate date range for weekly data
      const endDate = new Date();
      const startDate = subDays(endDate, weeks * 7);
      
      // Use the same API but with weekly grouping (i parameter)
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(startDate, 'yyyyMMdd'),
          end: format(endDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7 // 7-day intervals for weekly data
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getWeeklyActiveUsersYoY(weeks: number = 12): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Get current date range
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, weeks * 7);
      
      // For YoY, we want to align each current week with the same week from last year
      const yoyStartDate = subDays(currentStartDate, 365);
      
      // Calculate day-of-week offset to align the START dates
      const currentStartDayOfWeek = currentStartDate.getDay();
      const yoyStartDayOfWeek = yoyStartDate.getDay();
      
      // Calculate offset needed to align the start days
      let dayOffset = currentStartDayOfWeek - yoyStartDayOfWeek;
      
      // Adjust the YoY start date to match the current start day of week
      const alignedYoyStartDate = addDays(yoyStartDate, dayOffset);
      const alignedYoyEndDate = addDays(alignedYoyStartDate, weeks * 7);
      
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(alignedYoyStartDate, 'yyyyMMdd'),
          end: format(alignedYoyEndDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7 // 7-day intervals for weekly data
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getWeeklyActiveUsers2023(weeks: number = 12): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Get current date range
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, weeks * 7);
      
      // For 2023, we want to align each current week with the same week from 2023
      const year2023StartDate = subDays(currentStartDate, 365 * 2); // 2 years ago
      
      // Calculate day-of-week offset to align the START dates
      const currentStartDayOfWeek = currentStartDate.getDay();
      const year2023StartDayOfWeek = year2023StartDate.getDay();
      
      // Calculate offset needed to align the start days
      let dayOffset = currentStartDayOfWeek - year2023StartDayOfWeek;
      
      // Adjust the 2023 start date to match the current start day of week
      const aligned2023StartDate = addDays(year2023StartDate, dayOffset);
      const aligned2023EndDate = addDays(aligned2023StartDate, weeks * 7);
      
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(aligned2023StartDate, 'yyyyMMdd'),
          end: format(aligned2023EndDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7 // 7-day intervals for weekly data
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getMonthlyActiveUsers(months: number = 12): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Calculate date range for monthly data
      const endDate = new Date();
      const startDate = subDays(endDate, months * 30); // Approximate 30 days per month
      
      // Use the same API but with monthly grouping (i parameter)
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(startDate, 'yyyyMMdd'),
          end: format(endDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 30 // 30-day intervals for monthly data
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getMonthlyActiveUsersYoY(months: number = 12): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Get current date range
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, months * 30);
      
      // For YoY, calculate the same calendar months from last year
      // Go back exactly one year from both start and end dates
      const yoyStartDate = new Date(currentStartDate);
      yoyStartDate.setFullYear(yoyStartDate.getFullYear() - 1);
      
      const yoyEndDate = new Date(currentEndDate);
      yoyEndDate.setFullYear(yoyEndDate.getFullYear() - 1);
      
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(yoyStartDate, 'yyyyMMdd'),
          end: format(yoyEndDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 30 // 30-day intervals for monthly data
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getMonthlyActiveUsers2023(months: number = 12): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Get current date range
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, months * 30);
      
      // For 2023, calculate the same calendar months from 2023
      // Go back exactly two years from both start and end dates
      const year2023StartDate = new Date(currentStartDate);
      year2023StartDate.setFullYear(year2023StartDate.getFullYear() - 2);
      
      const year2023EndDate = new Date(currentEndDate);
      year2023EndDate.setFullYear(year2023EndDate.getFullYear() - 2);
      
      const response = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(year2023StartDate, 'yyyyMMdd'),
          end: format(year2023EndDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 30 // 30-day intervals for monthly data
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  // DAU anomaly detection method removed - no longer used

  async detectWAUAnomaly(currentWAU: number, historicalWAU: number[]): Promise<{
    isAnomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    percentageChange: number;
    message: string;
  }> {
    // Calculate historical average
    const avg = historicalWAU.reduce((sum, val) => sum + val, 0) / historicalWAU.length;
    const percentageChange = ((currentWAU - avg) / avg) * 100;
    
    // Define thresholds for WAU (weekly data is more volatile than daily)
    const minorDrop = -15; // 15% drop
    const majorDrop = -25; // 25% drop
    const criticalDrop = -35; // 35% drop
    
    let isAnomaly = false;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let message = '';
    
    if (percentageChange <= criticalDrop) {
      isAnomaly = true;
      severity = 'high';
      message = `🚨 CRITICAL: WAU dropped by ${Math.abs(percentageChange).toFixed(1)}% (${currentWAU.toLocaleString()} vs avg ${Math.round(avg).toLocaleString()})`;
    } else if (percentageChange <= majorDrop) {
      isAnomaly = true;
      severity = 'medium';
      message = `⚠️ WARNING: WAU dropped by ${Math.abs(percentageChange).toFixed(1)}% (${currentWAU.toLocaleString()} vs avg ${Math.round(avg).toLocaleString()})`;
    } else if (percentageChange <= minorDrop) {
      isAnomaly = true;
      severity = 'low';
      message = `📉 NOTICE: WAU dropped by ${Math.abs(percentageChange).toFixed(1)}% (${currentWAU.toLocaleString()} vs avg ${Math.round(avg).toLocaleString()})`;
    } else if (percentageChange > 15) {
      message = `📈 GOOD: WAU increased by ${percentageChange.toFixed(1)}% (${currentWAU.toLocaleString()} vs avg ${Math.round(avg).toLocaleString()})`;
    } else {
      message = `✅ STABLE: WAU within normal range (${percentageChange.toFixed(1)}% change)`;
    }
    
    return {
      isAnomaly,
      severity,
      percentageChange,
      message
    };
  }

  async getWeeklyActiveUsersNewVsExisting(weeks: number = 12): Promise<{
    success: boolean;
    data?: {
      newUsers: any;
      existingUsers: any;
    };
    error?: string;
  }> {
    try {
      // Calculate date range for weekly data
      const endDate = new Date();
      const startDate = subDays(endDate, weeks * 7);
      
      // Get new users (first-time users in each week)
      const newUsersResponse = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_new_user"
          }),
          start: format(startDate, 'yyyyMMdd'),
          end: format(endDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7 // 7-day intervals for weekly data
        },
        timeout: 15000
      });

      // Get all active users
      const allUsersResponse = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(startDate, 'yyyyMMdd'),
          end: format(endDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7 // 7-day intervals for weekly data
        },
        timeout: 15000
      });

      // Calculate existing users (total active - new users)
      const newUsersSeries = newUsersResponse.data?.data?.series?.[0] || [];
      const allUsersSeries = allUsersResponse.data?.data?.series?.[0] || [];
      
      // Calculate existing users for each week
      const existingUsersSeries = allUsersSeries.map((total: number, index: number) => {
        const newUsersCount = newUsersSeries[index] || 0;
        return Math.max(0, total - newUsersCount);
      });

      return {
        success: true,
        data: {
          newUsers: {
            ...newUsersResponse.data?.data,
            series: [newUsersSeries]
          },
          existingUsers: {
            ...allUsersResponse.data?.data,
            series: [existingUsersSeries]
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }

  async getWeeklyActiveUsersNewVsExistingYoY(weeks: number = 12): Promise<{
    success: boolean;
    data?: {
      newUsers: any;
      existingUsers: any;
    };
    error?: string;
  }> {
    try {
      // Calculate YoY date range
      const currentEndDate = new Date();
      const currentStartDate = subDays(currentEndDate, weeks * 7);
      const yoyEndDate = subDays(currentEndDate, 365);
      const yoyStartDate = subDays(currentStartDate, 365);
      
      // Get new users YoY
      const newUsersResponse = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_new_user"
          }),
          start: format(yoyStartDate, 'yyyyMMdd'),
          end: format(yoyEndDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7
        },
        timeout: 15000
      });

      // Get all active users YoY
      const allUsersResponse = await axios.get(`${this.baseUrl}/events/segmentation`, {
        headers: this.getAuthHeaders(),
        params: {
          e: JSON.stringify({
            "event_type": "_active"
          }),
          start: format(yoyStartDate, 'yyyyMMdd'),
          end: format(yoyEndDate, 'yyyyMMdd'),
          m: 'uniques',
          i: 7
        },
        timeout: 15000
      });

      // Calculate existing users YoY
      const newUsersSeries = newUsersResponse.data?.data?.series?.[0] || [];
      const allUsersSeries = allUsersResponse.data?.data?.series?.[0] || [];
      
      const existingUsersSeries = allUsersSeries.map((total: number, index: number) => {
        const newUsersCount = newUsersSeries[index] || 0;
        return Math.max(0, total - newUsersCount);
      });

      return {
        success: true,
        data: {
          newUsers: {
            ...newUsersResponse.data?.data,
            series: [newUsersSeries]
          },
          existingUsers: {
            ...allUsersResponse.data?.data,
            series: [existingUsersSeries]
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.statusText || error.message
      };
    }
  }
} 