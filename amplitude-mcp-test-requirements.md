# Amplitude MCP Test Requirements

## Objective
Verify that the Amplitude MCP (Model Context Protocol) integration is working correctly with the simplest possible test.

## Prerequisites
- Amplitude account with API access
- Amplitude project with some existing data
- API credentials configured

## Minimal Test Requirements

### 1. Basic Connection Test
**Goal**: Verify we can connect to Amplitude API
**Test**: Retrieve basic project information
**Expected Result**: Successful API response with project details

```typescript
// Test: Get project info
const response = await amplitude.getProject(projectId);
// Should return: project name, id, created_date, etc.
```

### 2. Simple Data Query Test  
**Goal**: Verify we can fetch actual analytics data
**Test**: Get event count for the last 24 hours
**Expected Result**: Numeric count of events

```typescript
// Test: Get simple event count
const eventCount = await amplitude.getEventCount({
  startDate: '2024-01-01',
  endDate: '2024-01-02',
  event: 'any_event' // or specific event name
});
// Should return: { count: 1234 }
```

### 3. Event List Test
**Goal**: Verify we can enumerate available events
**Test**: Fetch list of tracked events in the project
**Expected Result**: Array of event names

```typescript
// Test: List events
const events = await amplitude.getEvents();
// Should return: ['login', 'signup', 'purchase', ...]
```

## Success Criteria

✅ **Connection Test Passes**: API responds without authentication errors
✅ **Data Query Returns Results**: Can fetch actual event data
✅ **Event Enumeration Works**: Can list available events for monitoring

## Failure Scenarios to Handle

❌ **Authentication Failed**: Invalid API key or credentials
❌ **Rate Limiting**: Too many requests
❌ **No Data Found**: Project has no events
❌ **Network Issues**: Timeout or connection errors

## Test Implementation

### Minimal Test Script Structure
```typescript
// amplitude-test.ts
export async function testAmplitudeMCP() {
  try {
    // Test 1: Connection
    console.log('Testing Amplitude connection...');
    const project = await amplitude.getProject();
    console.log('✅ Connection successful:', project.name);
    
    // Test 2: Data query
    console.log('Testing data query...');
    const count = await amplitude.getEventCount({
      startDate: yesterday(),
      endDate: today()
    });
    console.log('✅ Event count retrieved:', count);
    
    // Test 3: Event list
    console.log('Testing event enumeration...');
    const events = await amplitude.getEvents();
    console.log('✅ Events found:', events.length);
    
    return { success: true, tests: 3 };
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

### Expected Output
```
Testing Amplitude connection...
✅ Connection successful: My App Project
Testing data query...
✅ Event count retrieved: 15,432
Testing event enumeration...
✅ Events found: 23
```

## Configuration Needed

### Environment Variables
```env
AMPLITUDE_API_KEY=your_api_key_here
AMPLITUDE_SECRET_KEY=your_secret_key_here
AMPLITUDE_PROJECT_ID=12345
```

### Minimal Dependencies
```json
{
  "dependencies": {
    "@amplitude/analytics-node": "^1.0.0"
  }
}
```

## Next Steps After Test Passes
1. Identify 2-3 key events/metrics to monitor
2. Implement anomaly detection for those metrics
3. Set up alerting mechanism
4. Build simple dashboard in Astro

## Time Estimate
- **Setup**: 15 minutes
- **Test Implementation**: 30 minutes  
- **Debugging**: 15-45 minutes
- **Total**: 1-1.5 hours

## Definition of Done
- All three tests pass without errors
- Test output shows actual data from Amplitude
- Configuration is documented and reproducible
- Ready to proceed with monitoring agent development 