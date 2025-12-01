import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';

interface MonthlyExercisesBarChartProps {
  chartData: { name: string; value: number }[];
}

export const MonthlyExercisesBarChart = ({ chartData }: MonthlyExercisesBarChartProps) => {
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const axisMax = maxValue + 5;
  
  return (
    <View style={{ padding: 16, backgroundColor: 'white', marginBottom: 20, borderRadius: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#000' }}>
        Monthly Exercises by User
      </Text>
      <View style={{ paddingLeft: 8 }}>
        {chartData.map((item, index) => {
          const barWidth = (item.value / axisMax) * 100;
          return (
            <View key={index} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* User name */}
                <Text 
                  style={{ 
                    fontSize: 12, 
                    color: '#000',
                    width: 100,
                    fontWeight: '500'
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                
                {/* Bar container */}
                <View style={{ flex: 1, height: 30, justifyContent: 'center', position: 'relative' }}>
                  {/* Background grid lines */}
                  <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', height: '100%' }}>
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <View 
                        key={percent}
                        style={{ 
                          position: 'absolute', 
                          left: `${percent}%`, 
                          height: '100%', 
                          width: 1, 
                          backgroundColor: '#E0E0E0' 
                        }} 
                      />
                    ))}
                  </View>
                  
                  {/* Actual bar */}
                  <View 
                    style={{ 
                      width: `${Math.max(barWidth, 2)}%`,
                      height: 24,
                      backgroundColor: '#FF6B35',
                      borderRadius: 4,
                      justifyContent: 'center',
                      paddingRight: 8,
                      zIndex: 1
                    }} 
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', textAlign: 'right' }}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        
        {/* X-axis scale */}
        <View style={{ flexDirection: 'row', marginTop: 8, marginLeft: 100 }}>
          {[0, Math.round(axisMax * 0.25), Math.round(axisMax * 0.5), Math.round(axisMax * 0.75), axisMax].map((value, index) => (
            <Text 
              key={index}
              style={{ 
                fontSize: 10, 
                color: '#666',
                flex: 1,
                textAlign: index === 0 ? 'left' : index === 4 ? 'right' : 'center'
              }}
            >
              {value}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};
