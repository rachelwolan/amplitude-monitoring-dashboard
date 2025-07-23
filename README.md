# Amplitude Monitoring Dashboard

A real-time monitoring dashboard for Amplitude analytics that tracks Daily Active Users (DAU), Weekly Active Users (WAU), and Monthly Active Users (MAU) with year-over-year comparisons and anomaly detection.

## Features

🚀 **Real-time Monitoring**
- Live DAU, WAU, and MAU metrics
- Auto-refresh every 5 minutes
- Interactive charts with hover tooltips

📊 **Year-over-Year Analysis**
- Compare current metrics with same periods from last year and 2023
- Day-of-week aligned comparisons for accurate trending
- Percentage change calculations

⚠️ **Anomaly Detection**
- Automatic detection of significant metric drops
- Configurable thresholds for different severity levels
- Color-coded alerts (low/medium/high severity)

🎨 **Modern UI**
- Beautiful, responsive design
- Canvas-based charts with smooth animations
- Real-time status indicators

## Technology Stack

- **Frontend**: [Astro](https://astro.build/) with TypeScript
- **Charting**: HTML5 Canvas for high-performance rendering
- **API**: RESTful endpoints built with Astro API routes
- **Analytics**: [Amplitude Analytics API](https://www.docs.developers.amplitude.com/analytics/apis/dashboard-rest-api/)
- **Styling**: Tailwind CSS
- **Date handling**: date-fns library

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Amplitude account with API access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentic-cos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   AMPLITUDE_API_KEY=your_amplitude_api_key
   AMPLITUDE_SECRET_KEY=your_amplitude_secret_key
   AMPLITUDE_PROJECT_ID=your_amplitude_project_id
   ```

   To get these credentials:
   - Log into your [Amplitude dashboard](https://analytics.amplitude.com/)
   - Go to Settings → Project Settings
   - Copy your API Key, Secret Key, and Project ID

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000` to view the dashboard.

## API Endpoints

### Core Monitoring APIs

- `GET /api/dau-monitor` - Daily Active Users with YoY comparison
- `GET /api/wau-monitor` - Weekly Active Users with YoY comparison  
- `GET /api/mau-monitor` - Monthly Active Users with YoY comparison
- `GET /api/test-amplitude` - Health check and connection test

### Response Format

All monitoring APIs return data in this format:

```json
{
  "success": true,
  "data": {
    "current": 123456,
    "yoyComparison": {
      "value": 118234,
      "percentageChange": 4.42,
      "isHigher": true
    },
    "year2023Comparison": {
      "value": 109876,
      "percentageChange": 12.36,
      "isHigher": true
    },
    "trend": [
      {
        "date": "2025-01-15",
        "users": 123456,
        "yoyUsers": 118234,
        "year2023Users": 109876,
        "formattedDate": "Jan 15"
      }
    ],
    "anomaly": {
      "isAnomaly": false,
      "severity": "low",
      "message": "✅ STABLE: DAU within normal range"
    },
    "hasYoYData": true,
    "has2023Data": true
  }
}
```

## Key Features Explained

### Day-of-Week Alignment

The dashboard uses sophisticated date alignment to ensure accurate year-over-year comparisons:

- **DAU**: Compares the same weekdays (e.g., Monday 2025 vs Monday 2024)
- **WAU**: Aligns weekly periods by matching start days of the week
- **MAU**: Compares the same calendar months across years

This prevents skewed comparisons due to different day-of-week distributions.

### Anomaly Detection

The system automatically detects significant drops in user metrics:

- **DAU**: 10%/20%/30% drop thresholds
- **WAU**: 15%/25%/35% drop thresholds  
- **MAU**: Uses monthly historical averages

### Chart Improvements

Recent enhancements include:
- Fixed overlapping bottom labels with proper rotation (-30°)
- Removed redundant "(weekday aligned)" text from legends
- Proper canvas transformation handling with save/restore

## Development

### Project Structure

```
src/
├── components/          # Astro components
│   ├── DAUMonitor.astro # Daily active users chart
│   ├── WAUMonitor.astro # Weekly active users chart
│   └── MAUMonitor.astro # Monthly active users chart
├── lib/
│   └── amplitude-client.ts # Amplitude API client
├── pages/
│   ├── index.astro      # Main dashboard page
│   └── api/             # API endpoints
│       ├── dau-monitor.ts
│       ├── wau-monitor.ts
│       ├── mau-monitor.ts
│       └── test-amplitude.ts
└── env.d.ts            # TypeScript environment types
```

### Key Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run astro        # Run Astro CLI commands
```

### API Client Methods

The `AmplitudeClient` class provides these key methods:

- `getDailyActiveUsers(days)` - Fetch DAU data
- `getDailyActiveUsersYoY(days)` - Fetch YoY DAU data
- `getWeeklyActiveUsers(weeks)` - Fetch WAU data
- `getMonthlyActiveUsers(months)` - Fetch MAU data
- `detectDAUAnomaly()` - Anomaly detection logic

## Deployment

### Production Build

```bash
npm run build
```

### Environment Variables

Make sure to set these in your production environment:

```env
AMPLITUDE_API_KEY=your_production_api_key
AMPLITUDE_SECRET_KEY=your_production_secret_key  
AMPLITUDE_PROJECT_ID=your_production_project_id
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing required environment variables
   ```
   Solution: Ensure all Amplitude credentials are set in `.env`

2. **API Rate Limits**
   ```
   Error: 429 Too Many Requests
   ```
   Solution: The dashboard has built-in 5-minute auto-refresh. Avoid manual rapid refreshes.

3. **Date Range Issues**
   ```
   Error: No data available for date range
   ```
   Solution: Ensure your Amplitude project has data for the requested time periods.

### Debug Mode

To enable debug logging, check the browser console for detailed API request/response information.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Recent Fixes

- ✅ Fixed DAU chart bottom labels overlapping issue
- ✅ Removed "(weekday aligned)" text from DAU legend
- ✅ Fixed missing June 2024/2023 data in MAU comparisons
- ✅ Improved canvas text rendering with proper save/restore

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
1. Check the [Issues](../../issues) section
2. Review the [API Documentation](https://www.docs.developers.amplitude.com/analytics/apis/dashboard-rest-api/)
3. Contact the development team 