import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

interface MonthlyExercisesAreaChartProps {
  chartData: { id: string; name: string; value: number }[];
  onUserPress?: (userId: string) => void;
}

export const MonthlyExercisesAreaChart = ({ chartData, onUserPress }: MonthlyExercisesAreaChartProps) => {
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const axisMax = maxValue + 5;
  const yAxisSteps = 5;
  const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) => 
    Math.round((axisMax / yAxisSteps) * i)
  );

  const chartHeight = 200;
  const padding = { top: 20, right: 10, bottom: 60, left: 35 };
  const [containerWidth, setContainerWidth] = React.useState(0);
  const plotWidth = containerWidth > 0 ? containerWidth - padding.left - padding.right : 300;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (chartData.length <= 1) return plotWidth / 2;
    return (plotWidth / (chartData.length - 1)) * index;
  };
  const getY = (value: number) => plotHeight - (value / axisMax) * plotHeight;

  // Construct path
  let pathD = '';
  let areaD = '';
  chartData.forEach((item, index) => {
    const x = getX(index);
    const y = getY(item.value);
    if (index === 0) {
      pathD += `M ${x} ${y}`;
      areaD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
  });

  // Close area
  if (chartData.length > 0) {
    const lastX = getX(chartData.length - 1);
    const firstX = getX(0);
    areaD += ` L ${lastX} ${plotHeight} L ${firstX} ${plotHeight} Z`;
  }

  return (
    <View 
      style={{ padding: 16, backgroundColor: 'white', marginBottom: 20, borderRadius: 8 }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#000' }}>
        Monthly Exercises by User
      </Text>
      
      <View style={{ height: chartHeight, flexDirection: 'row' }}>
        {/* Y-axis */}
        <View style={{ width: padding.left, height: chartHeight, justifyContent: 'space-between', paddingRight: 8, paddingVertical: padding.top }}>
          {yAxisValues.reverse().map((val, i) => (
            <Text key={i} style={{ fontSize: 10, color: '#888', textAlign: 'right', position: 'absolute', top: padding.top + (plotHeight / yAxisSteps) * i - 6, right: 8, width: 40 }}>
              {val}
            </Text>
          ))}
        </View>

        {/* Chart Area */}
        <View style={{ flex: 1, height: chartHeight }}>
          <Svg height={chartHeight} width={plotWidth} style={{ overflow: 'visible' }}>
            <Defs>
              <LinearGradient id="gradEx" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF6B35" stopOpacity="0.6" />
                <Stop offset="1" stopColor="#FF6B35" stopOpacity="0.1" />
              </LinearGradient>
            </Defs>

            {/* Grid Lines */}
            {yAxisValues.map((_, i) => (
              <Line
                key={`grid-${i}`}
                x1="0"
                y1={padding.top + (plotHeight / yAxisSteps) * i}
                x2={plotWidth}
                y2={padding.top + (plotHeight / yAxisSteps) * i}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            ))}

            {/* Area */}
            <Path
              d={areaD}
              fill="url(#gradEx)"
            />

            {/* Line */}
            <Path
              d={pathD}
              stroke="#FF6B35"
              strokeWidth="3"
              fill="none"
            />

            {/* Dots */}
            {chartData.map((item, index) => {
              const x = getX(index);
              const y = getY(item.value);
              return (
                <Circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#FF6B35"
                  stroke="white"
                  strokeWidth="2"
                  onPress={() => onUserPress && onUserPress(item.id)}
                />
              );
            })}
          </Svg>

          {/* X-axis Labels */}
          <View style={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: plotWidth,
            height: 60,
          }}>
            {chartData.map((item, index) => (
              <View 
                key={index}
                style={{
                  position: 'absolute',
                  left: getX(index),
                  bottom: 25,
                  width: 0,
                  alignItems: 'center',
                  overflow: 'visible'
                }}
              >
                <Text 
                  style={{ 
                    fontSize: 9, 
                    color: '#666', 
                    width: 80, 
                    textAlign: 'right', 
                    transform: [{ rotate: '-45deg' }, { translateX: -20 }],
                    textDecorationLine: onUserPress ? 'underline' : 'none'
                  }}
                  numberOfLines={1}
                  onPress={() => onUserPress && onUserPress(item.id)}
                >
                  {item.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};
