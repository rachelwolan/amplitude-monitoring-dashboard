import type { APIRoute } from 'astro';
import { AmplitudeClient } from '../../lib/amplitude-client';

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

    // Calculate how many weeks to fetch to ensure we get 12 complete weeks
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // If it's not Sunday (end of week), we need to exclude the current incomplete week
    const weeksToFetch = currentDayOfWeek === 0 ? 12 : 13; // Fetch extra if current week is incomplete
    
    // Get last complete weeks of WAU data
    const wauResult = await client.getWeeklyActiveUsers(weeksToFetch);
    
    // Get same period from last year
    const wauYoYResult = await client.getWeeklyActiveUsersYoY(weeksToFetch);
    
    // Get same period from 2023
    const wau2023Result = await client.getWeeklyActiveUsers2023(weeksToFetch);
    
    if (!wauResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: wauResult.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let series = wauResult.data?.series?.[0] || [];
    let xValues = wauResult.data?.xValues || [];
    let yoyData = wauYoYResult.success ? (wauYoYResult.data?.series?.[0] || []) : [];
    let year2023Data = wau2023Result.success ? (wau2023Result.data?.series?.[0] || []) : [];
    
    // Filter to only include complete weeks (exclude current week if incomplete)
    if (currentDayOfWeek !== 0 && series.length > 12) {
      // Remove the last incomplete week, then take the last 12 complete weeks
      series = series.slice(0, -1).slice(-12);
      xValues = xValues.slice(0, -1).slice(-12);
      yoyData = yoyData.slice(0, -1).slice(-12);
      year2023Data = year2023Data.slice(0, -1).slice(-12);
    } else {
      // Keep only 12 weeks even if we fetched more
      series = series.slice(-12);
      xValues = xValues.slice(-12);
      yoyData = yoyData.slice(-12);
      year2023Data = year2023Data.slice(-12);
    }
    
    if (series.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No WAU data available'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate trend data for visualization - show all 12 weeks
    const trendData = xValues.map((date: string, index: number) => ({
      date,
      formattedDate: new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      users: series[index] || 0,
      yoyUsers: yoyData[index] || 0,
      year2023Users: year2023Data[index] || 0,
      yoyChange: yoyData[index] ? ((series[index] - yoyData[index]) / yoyData[index] * 100).toFixed(1) : null,
      year2023Change: year2023Data[index] ? ((series[index] - year2023Data[index]) / year2023Data[index] * 100).toFixed(1) : null
    }));

    // Calculate summary statistics
    const latestUsers = series[series.length - 1] || 0;
    const previousUsers = series[series.length - 2] || 0;
    const weekOverWeekChange = previousUsers ? ((latestUsers - previousUsers) / previousUsers * 100) : 0;

    // Calculate statistics over 12 weeks
    const avgUsers = Math.round(series.reduce((sum: number, val: number) => sum + val, 0) / series.length);
    const avgYoYUsers = Math.round(yoyData.reduce((sum: number, val: number) => sum + val, 0) / yoyData.length);
    const avgYoYChangePercent = avgYoYUsers ? ((avgUsers - avgYoYUsers) / avgYoYUsers) * 100 : 0;
    
    const peakUsers = Math.max(...series);
    const lowUsers = Math.min(...series);

    // Calculate comparisons with other years - use latest week
    const latestIndex = series.length - 1;
    const latestYoYUsers = yoyData[latestIndex] || 0;
    const latest2023Users = year2023Data[latestIndex] || 0;
    const yoyChangePercent = latestYoYUsers ? ((latestUsers - latestYoYUsers) / latestYoYUsers) * 100 : 0;
    const year2023ChangePercent = latest2023Users ? ((latestUsers - latest2023Users) / latest2023Users) * 100 : 0;
    let status = 'NORMAL';
    let statusMessage = `STABLE: WAU within normal range (${yoyChangePercent.toFixed(1)}% vs last year)`;
    
    if (Math.abs(yoyChangePercent) > 20) {
      status = yoyChangePercent > 0 ? 'HIGH' : 'LOW';
      statusMessage = yoyChangePercent > 0 
        ? `HIGH: WAU significantly above last year (+${yoyChangePercent.toFixed(1)}%)`
        : `LOW: WAU significantly below last year (${yoyChangePercent.toFixed(1)}%)`;
    } else if (Math.abs(yoyChangePercent) > 10) {
      status = 'ALERT';
      statusMessage = yoyChangePercent > 0
        ? `ELEVATED: WAU above last year (+${yoyChangePercent.toFixed(1)}%)`
        : `DECREASED: WAU below last year (${yoyChangePercent.toFixed(1)}%)`;
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        currentUsers: latestUsers,
        weekOverWeekChange: parseFloat(weekOverWeekChange.toFixed(1)),
        yoyUsers: latestYoYUsers,
        yoyChangePercent: parseFloat(yoyChangePercent.toFixed(1)),
        year2023Users: latest2023Users,
        year2023ChangePercent: parseFloat(year2023ChangePercent.toFixed(1)),
        avgUsers,
        avgYoYChangePercent: parseFloat(avgYoYChangePercent.toFixed(1)),
        peakUsers,
        lowUsers,
        status,
        statusMessage,
        trendData,
        xValues
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in WAU monitor:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 