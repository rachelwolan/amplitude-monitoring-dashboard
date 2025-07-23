import type { APIRoute } from 'astro';
import { AmplitudeClient } from '../../lib/amplitude-client';
import { subDays, addDays, format } from 'date-fns';

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

    // Calculate how many months to fetch to ensure we get 12 complete months
    const now = new Date();
    const isCurrentMonthComplete = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // If current month is incomplete, fetch extra month to ensure 12 complete months
    const monthsToFetch = isCurrentMonthComplete ? 12 : 13;
    
    // Get last months of MAU data
    const mauResult = await client.getMonthlyActiveUsers(monthsToFetch);
    
    // Get same period from last year
    const mauYoYResult = await client.getMonthlyActiveUsersYoY(monthsToFetch);
    
    // Get same period from 2023
    const mau2023Result = await client.getMonthlyActiveUsers2023(monthsToFetch);
    

    
    if (!mauResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: mauResult.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let series = mauResult.data?.series?.[0] || [];
    let xValues = mauResult.data?.xValues || [];
    let yoyData = mauYoYResult.success ? (mauYoYResult.data?.series?.[0] || []) : [];
    let year2023Data = mau2023Result.success ? (mau2023Result.data?.series?.[0] || []) : [];
    

    
    // Filter to only include complete months (exclude current month if incomplete)
    if (!isCurrentMonthComplete && series.length > 12) {
      // Remove the last incomplete month, then take the last 12 complete months
      series = series.slice(0, -1).slice(-12);
      xValues = xValues.slice(0, -1).slice(-12);
      yoyData = yoyData.slice(0, -1).slice(-12);
      year2023Data = year2023Data.slice(0, -1).slice(-12);
      
    } else {
      // Keep only 12 months even if we fetched more
      series = series.slice(-12);
      xValues = xValues.slice(-12);
      yoyData = yoyData.slice(-12);
      year2023Data = year2023Data.slice(-12);
      
    }
    
    if (series.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No MAU data available'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Current MAU (most recent month)
    const currentMAU = series[series.length - 1] || 0;
    
    // Historical MAU (previous months for comparison)
    const historicalMAU = series.slice(-4, -1); // Previous 3 months for comparison
    
    // Use the actual aligned dates from the API responses
    const yoyXValues = mauYoYResult.success ? (mauYoYResult.data?.xValues || []) : [];
    const year2023XValues = mau2023Result.success ? (mau2023Result.data?.xValues || []) : [];
    
    // Apply the same filtering to the YoY and 2023 xValues
    let filteredYoyXValues = yoyXValues;
    let filteredYear2023XValues = year2023XValues;
    
    if (!isCurrentMonthComplete && yoyXValues.length > 12) {
      filteredYoyXValues = yoyXValues.slice(0, -1).slice(-12);
      filteredYear2023XValues = year2023XValues.slice(0, -1).slice(-12);
    } else {
      filteredYoyXValues = yoyXValues.slice(-12);
      filteredYear2023XValues = year2023XValues.slice(-12);
    }
    

    
    // Calculate multi-year data availability
    const hasYoYData = yoyData.length > 0;
    const has2023Data = year2023Data.length > 0;
    
    // Prepare trend data with same-month multi-year comparison
    const trendData = series.map((value: number, index: number) => {
      // Parse current month date in local timezone
      const currentDate = new Date(xValues[index] + 'T12:00:00');
      
      // For MAU, we want to compare the same calendar months across years
      // e.g., Feb 2025 vs Feb 2024 vs Feb 2023
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Create aligned dates for the same month in previous years
      const alignedYoyDate = new Date(currentYear - 1, currentMonth, 1);
      const alignedYear2023Date = new Date(currentYear - 2, currentMonth, 1);
      
      // Format aligned dates for API lookup (YYYY-MM-01 format)
      const alignedYoyDateStr = `${alignedYoyDate.getFullYear()}-${String(alignedYoyDate.getMonth() + 1).padStart(2, '0')}-01`;
      const alignedYear2023DateStr = `${alignedYear2023Date.getFullYear()}-${String(alignedYear2023Date.getMonth() + 1).padStart(2, '0')}-01`;
      
      // Find corresponding data in YoY and 2023 datasets by matching same months
      let yoyUsers = null;
      let year2023Users = null;
      
      if (hasYoYData) {
        const yoyIndex = filteredYoyXValues.findIndex((date: string) => date === alignedYoyDateStr);
        yoyUsers = yoyIndex >= 0 ? yoyData[yoyIndex] : null;
      }
      
      if (has2023Data) {
        const year2023Index = filteredYear2023XValues.findIndex((date: string) => date === alignedYear2023DateStr);
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
          month: 'short', 
          year: 'numeric'
        }),
        yoyFormattedDate: alignedYoyDate.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric'
        }),
        year2023FormattedDate: alignedYear2023Date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric'
        })
      };
      
      return trendPoint;
    });

    // Calculate multi-year stats if available
    
    const yoyStats = hasYoYData ? {
      averageMAU: Math.round((yoyData as number[]).reduce((sum: number, val: number) => sum + val, 0) / yoyData.length),
      maxMAU: Math.max(...(yoyData as number[])),
      minMAU: Math.min(...(yoyData as number[])),
      note: 'YoY data for same period last year'
    } : null;
    
    const year2023Stats = has2023Data ? {
      averageMAU: Math.round((year2023Data as number[]).reduce((sum: number, val: number) => sum + val, 0) / year2023Data.length),
      maxMAU: Math.max(...(year2023Data as number[])),
      minMAU: Math.min(...(year2023Data as number[])),
      note: '2023 data for same period'
    } : null;

    // Calculate percentage change and year-over-year comparisons
    const avgHistorical = historicalMAU.length > 0 ? 
      (historicalMAU as number[]).reduce((sum: number, val: number) => sum + val, 0) / historicalMAU.length : 0;
    const percentageChange = avgHistorical > 0 ? 
      ((currentMAU - avgHistorical) / avgHistorical) * 100 : 0;

    // Calculate additional stats for snapshot
    const avgUsers = Math.round((series as number[]).reduce((sum: number, val: number) => sum + val, 0) / series.length);
    const avgYoYUsers = hasYoYData ? Math.round((yoyData as number[]).reduce((sum: number, val: number) => sum + val, 0) / yoyData.length) : 0;
    const avgYoYChangePercent = avgYoYUsers ? ((avgUsers - avgYoYUsers) / avgYoYUsers) * 100 : 0;
    
    const peakUsers = Math.max(...(series as number[]));
    const lowUsers = Math.min(...(series as number[]));

    // Current month comparison with same month last year
    const latestYoYUsers = hasYoYData ? (yoyData[yoyData.length - 1] || 0) : 0;
    const yoyChangePercent = latestYoYUsers ? ((currentMAU - latestYoYUsers) / latestYoYUsers) * 100 : 0;

    // Build response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        currentMAU,
        trend: trendData,
        anomaly: {
          isAnomaly: Math.abs(percentageChange) > 20, // 20% threshold for monthly data
          severity: Math.abs(percentageChange) > 40 ? 'high' : Math.abs(percentageChange) > 20 ? 'medium' : 'low',
          percentageChange,
          message: percentageChange > 20 ? 
            `📈 GOOD: MAU increased by ${percentageChange.toFixed(1)}% (${currentMAU.toLocaleString()} vs avg ${Math.round(avgHistorical).toLocaleString()})` :
            percentageChange < -20 ?
            `📉 ALERT: MAU dropped by ${Math.abs(percentageChange).toFixed(1)}% (${currentMAU.toLocaleString()} vs avg ${Math.round(avgHistorical).toLocaleString()})` :
            `✅ STABLE: MAU within normal range (${percentageChange.toFixed(1)}% change)`
        },
        hasYoYData,
        has2023Data,
        summary: {
          totalMonths: series.length,
          averageMAU: avgUsers,
          maxMAU: peakUsers,
          minMAU: lowUsers
        },
        // New snapshot stats for component
        currentUsers: currentMAU,
        yoyChangePercent: parseFloat(yoyChangePercent.toFixed(1)),
        avgUsers,
        avgYoYChangePercent: parseFloat(avgYoYChangePercent.toFixed(1)),
        peakUsers,
        lowUsers,
        yoySummary: yoyStats,
        year2023Summary: year2023Stats
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('MAU Monitor API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 