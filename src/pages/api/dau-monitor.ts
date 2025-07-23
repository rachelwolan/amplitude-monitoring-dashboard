import type { APIRoute } from 'astro';
import { AmplitudeClient } from '../../lib/amplitude-client';
import { subDays, addDays, format, addWeeks, subWeeks } from 'date-fns';

// Helper function to find the closest same day of the week in a target year
function findClosestSameDayOfWeek(sourceDate: Date, targetYear: number): Date {
  const sourceDayOfWeek = sourceDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const sourceMonth = sourceDate.getMonth();
  const sourceDay = sourceDate.getDate();
  
  // Start with the same calendar date in target year
  let candidateDate = new Date(targetYear, sourceMonth, sourceDay);
  
  // If the date doesn't exist (e.g., Feb 29 in non-leap year), use the last day of the month
  if (candidateDate.getMonth() !== sourceMonth) {
    candidateDate = new Date(targetYear, sourceMonth + 1, 0); // Last day of source month
  }
  
  const candidateDayOfWeek = candidateDate.getDay();
  
  // Calculate the difference in days of the week
  let daysDiff = sourceDayOfWeek - candidateDayOfWeek;
  
  // Adjust for week wraparound
  if (daysDiff > 3) {
    daysDiff -= 7;
  } else if (daysDiff < -3) {
    daysDiff += 7;
  }
  
  // Apply the adjustment
  candidateDate.setDate(candidateDate.getDate() + daysDiff);
  
  return candidateDate;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const apiKey = import.meta.env.AMPLITUDE_API_KEY;
    const secretKey = import.meta.env.AMPLITUDE_SECRET_KEY;
    const projectId = import.meta.env.AMPLITUDE_PROJECT_ID;

    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required environment variables'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = new AmplitudeClient({
      apiKey,
      secretKey,
      projectId
    });

    // Get month from query parameter, default to current month
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');
    const yearParam = url.searchParams.get('year');
    
    const now = new Date();
    const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();
    const targetMonth = monthParam ? parseInt(monthParam) - 1 : now.getMonth(); // Month is 0-based
    
    // Calculate date range for the complete specified month
    const currentStartDate = new Date(targetYear, targetMonth, 1);
    const currentEndDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    
    // Only include complete days - exclude today if it's the current month and not end of day
    let actualEndDate = currentEndDate;
    const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth();
    
    if (isCurrentMonth) {
      // Get yesterday's date (last complete day)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999); // End of yesterday
      
      actualEndDate = yesterday < currentEndDate ? yesterday : currentEndDate;
    }
    
    // Calculate YoY dates - same day of week alignment for day-to-day comparison
    const yoyStartDate = findClosestSameDayOfWeek(currentStartDate, targetYear - 1);
    const yoyEndDate = findClosestSameDayOfWeek(actualEndDate, targetYear - 1);
    const actualYoyEndDate = yoyEndDate;
    
    // Calculate 2023 dates - same day of week alignment for day-to-day comparison  
    const year2023StartDate = findClosestSameDayOfWeek(currentStartDate, targetYear - 2);
    const year2023EndDate = findClosestSameDayOfWeek(actualEndDate, targetYear - 2);
    const actualYear2023EndDate = year2023EndDate;
    
    console.log('Current Date Range:', format(currentStartDate, 'yyyy-MM-dd'), 'to', format(actualEndDate, 'yyyy-MM-dd'));
    console.log('YoY Date Range:', format(yoyStartDate, 'yyyy-MM-dd'), 'to', format(actualYoyEndDate, 'yyyy-MM-dd'));
    console.log('2023 Date Range:', format(year2023StartDate, 'yyyy-MM-dd'), 'to', format(actualYear2023EndDate, 'yyyy-MM-dd'));
    
    // Get current DAU data for the calculated range
    const dauResult = await client.getDailyActiveUsersForDateRange(
      format(currentStartDate, 'yyyyMMdd'),
      format(actualEndDate, 'yyyyMMdd')
    );
    
    // Get YoY DAU data for the aligned range
    const dauYoYResult = await client.getDailyActiveUsersForDateRange(
      format(yoyStartDate, 'yyyyMMdd'), 
      format(actualYoyEndDate, 'yyyyMMdd')
    );
    
    // Get 2023 DAU data for the aligned range
    const dau2023Result = await client.getDailyActiveUsersForDateRange(
      format(year2023StartDate, 'yyyyMMdd'), 
      format(actualYear2023EndDate, 'yyyyMMdd')
    );
    

    
    if (!dauResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: dauResult.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const series = dauResult.data?.series?.[0] || [];
    const xValues = dauResult.data?.xValues || [];
    const yoyData = dauYoYResult.success ? (dauYoYResult.data?.series?.[0] || []) : [];
    const year2023Data = dau2023Result.success ? (dau2023Result.data?.series?.[0] || []) : [];
    
    if (series.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No DAU data available'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Current DAU (most recent day)
    const currentDAU = series[series.length - 1] || 0;
    
    // Use the actual aligned dates from the API responses
    const yoyXValues = dauYoYResult.success ? (dauYoYResult.data?.xValues || []) : [];
    const year2023XValues = dau2023Result.success ? (dau2023Result.data?.xValues || []) : [];
    
    // Calculate multi-year data availability
    const hasYoYData = yoyData.length > 0;
    const has2023Data = year2023Data.length > 0;
    
    // Prepare trend data with day-of-week aligned multi-year comparison
    const trendData = series.map((value: number, index: number) => {
      // Parse current date in local timezone to avoid UTC conversion issues
      const currentDate = new Date(xValues[index] + 'T12:00:00');
      
      // Find the corresponding day-of-week aligned dates in previous years
      const alignedYoyDate = findClosestSameDayOfWeek(currentDate, targetYear - 1);
      const alignedYear2023Date = findClosestSameDayOfWeek(currentDate, targetYear - 2);
      
      // Format aligned dates for API lookup
      const alignedYoyDateStr = format(alignedYoyDate, 'yyyy-MM-dd');
      const alignedYear2023DateStr = format(alignedYear2023Date, 'yyyy-MM-dd');
      
      // Find the corresponding data in YoY and 2023 datasets by matching dates
      let yoyUsers = null;
      let year2023Users = null;
      
      if (hasYoYData) {
        const yoyIndex = yoyXValues.findIndex((date: string) => date === alignedYoyDateStr);
        yoyUsers = yoyIndex >= 0 ? yoyData[yoyIndex] : null;
      }
      
      if (has2023Data) {
        const year2023Index = year2023XValues.findIndex((date: string) => date === alignedYear2023DateStr);
        year2023Users = year2023Index >= 0 ? year2023Data[year2023Index] : null;
      }
      
      const trendPoint = {
        date: xValues[index],
        users: value,
        yoyUsers: yoyUsers,
        year2023Users: year2023Users,
        yoyDate: alignedYoyDateStr,
        year2023Date: alignedYear2023DateStr,
        formattedDate: currentDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        yoyFormattedDate: alignedYoyDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        year2023FormattedDate: alignedYear2023Date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      };
      
      return trendPoint;
    });

    // Calculate multi-year stats if available
    
    const yoyStats = hasYoYData ? {
      averageDAU: Math.round(yoyData.reduce((sum: number, val: number) => sum + val, 0) / yoyData.length),
      maxDAU: Math.max(...yoyData),
      minDAU: Math.min(...yoyData),
      note: 'YoY data for same period last year'
    } : null;
    
    const year2023Stats = has2023Data ? {
      averageDAU: Math.round(year2023Data.reduce((sum: number, val: number) => sum + val, 0) / year2023Data.length),
      maxDAU: Math.max(...year2023Data),
      minDAU: Math.min(...year2023Data),
      note: '2023 data for same period'
    } : null;

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        currentDAU,
        trend: trendData,
        hasYoYData,
        has2023Data,
        currentMonth: targetMonth + 1, // Convert back to 1-based
        currentYear: targetYear,
        dateRange: {
          start: format(currentStartDate, 'yyyy-MM-dd'),
          end: format(actualEndDate, 'yyyy-MM-dd')
        },
        summary: {
          totalDays: series.length,
          averageDAU: Math.round(series.reduce((sum: number, val: number) => sum + val, 0) / series.length),
          maxDAU: Math.max(...series),
          minDAU: Math.min(...series)
        },
        yoySummary: yoyStats,
        year2023Summary: year2023Stats
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('DAU Monitor API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 