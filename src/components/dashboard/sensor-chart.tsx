"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts" // Ensure ResponsiveContainer is imported

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip as ShadcnChartTooltip, // Renamed import
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card imports for context

// Define the structure of the data points expected by the chart
interface SensorChartDataPoint {
  time: string; // Expecting time string e.g., "HH:MM"
  temperature?: number | null;
  humidity?: number | null;
}

interface SensorChartProps {
  data: SensorChartDataPoint[];
}

const chartConfig = {
  temperature: {
    label: "Temp (°C)", // Shortened label
    color: "hsl(var(--chart-1))", // Green
  },
  humidity: {
    label: "Humidity (%)",
    color: "hsl(var(--chart-2))", // Blue
  },
} satisfies ChartConfig

export default function SensorChart({ data }: SensorChartProps) {

   // Handle potential empty data gracefully
   if (!data || data.length === 0) {
     return (
       <div className="flex items-center justify-center h-[250px] text-muted-foreground">
         No sensor data available for this period.
       </div>
     );
   }

  // Find min/max values for dynamic Y-axis scaling, handle potential nulls
  const temps = data.map(d => d.temperature).filter(t => t !== null && t !== undefined) as number[];
  const hums = data.map(d => d.humidity).filter(h => h !== null && h !== undefined) as number[];

  const tempDomain: [number | 'auto', number | 'auto'] = temps.length > 0
    ? [Math.min(...temps) - 2, Math.max(...temps) + 2] // Add padding
    : ['auto', 'auto'];
  const humDomain: [number | 'auto', number | 'auto'] = hums.length > 0
    ? [Math.min(...hums) - 5, Math.max(...hums) + 5] // Add padding
    : ['auto', 'auto'];


  return (
     // Use ChartContainer for proper styling and context
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full h-full">
       {/* ResponsiveContainer is crucial for sizing */}
       <ResponsiveContainer width="100%" height={250}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: -5, // Adjust margins for better label visibility
              right: 15,
              top: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
             <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value} // Assuming time is already formatted as HH:MM
              // Consider adding interval for fewer labels if data is dense: interval="preserveStartEnd" or a number
            />
            <YAxis
              yAxisId="left" // ID for Temperature axis
              orientation="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}°C`}
              domain={tempDomain} // Use calculated domain
               width={45} // Allocate space for labels
            />
             <YAxis
              yAxisId="right" // ID for Humidity axis
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}%`}
              domain={humDomain} // Use calculated domain
               width={40} // Allocate space for labels
            />
             {/* Use the ShadCN ChartTooltip component */}
            <ShadcnChartTooltip
              cursor={true} // Enable cursor line
               content={({ active, payload, label }) => // Custom tooltip content
                  active && payload && payload.length ? (
                  <ChartTooltipContent
                    indicator="dot"
                    label={label} // Use the time label
                    payload={payload} // Pass payload to the content renderer
                     // You can customize the formatter here if needed in ChartTooltipContent props
                  />
                  ) : null
               }
            />
            <defs>
              <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-temperature)" // Use CSS variable from config
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-temperature)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillHumidity" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-humidity)" // Use CSS variable from config
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-humidity)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="temperature"
              type="monotone" // Smoother curve
              fill="url(#fillTemperature)"
              fillOpacity={0.4}
              stroke="var(--color-temperature)"
              strokeWidth={2} // Slightly thicker line
              yAxisId="left" // Associate with the left Y-axis
              stackId="a" // Keep stackId if needed, otherwise remove
              dot={false} // Hide dots for cleaner look, enable if needed
            />
            <Area
              dataKey="humidity"
              type="monotone" // Smoother curve
              fill="url(#fillHumidity)"
              fillOpacity={0.4}
              stroke="var(--color-humidity)"
              strokeWidth={2} // Slightly thicker line
              yAxisId="right" // Associate with the right Y-axis
              stackId="b" // Keep stackId if needed, otherwise remove
               dot={false} // Hide dots for cleaner look
            />
          </AreaChart>
       </ResponsiveContainer>
    </ChartContainer>
  )
}
