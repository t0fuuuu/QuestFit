import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';

interface LogEntry {
  timestamp: Date;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
}

let logEntries: LogEntry[] = [];
let listeners: Array<() => void> = [];

// Override console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

const addLog = (level: 'log' | 'error' | 'warn' | 'info', args: any[]) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  logEntries.push({
    timestamp: new Date(),
    level,
    message,
  });
  
  // Keep only last 100 logs
  if (logEntries.length > 100) {
    logEntries = logEntries.slice(-100);
  }
  
  // Notify listeners
  listeners.forEach(listener => listener());
};

console.log = (...args: any[]) => {
  originalConsoleLog(...args);
  addLog('log', args);
};

console.error = (...args: any[]) => {
  originalConsoleError(...args);
  addLog('error', args);
};

console.warn = (...args: any[]) => {
  originalConsoleWarn(...args);
  addLog('warn', args);
};

console.info = (...args: any[]) => {
  originalConsoleInfo(...args);
  addLog('info', args);
};

export default function DebugConsole() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const updateLogs = () => {
      setLogs([...logEntries]);
    };
    
    listeners.push(updateLogs);
    
    return () => {
      listeners = listeners.filter(l => l !== updateLogs);
    };
  }, []);

  const clearLogs = () => {
    logEntries = [];
    setLogs([]);
  };

  if (!visible) {
    return (
      <Pressable 
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.buttonText}>📋</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Console ({logs.length})</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.clearButton} onPress={clearLogs}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
          <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <View 
            key={index} 
            style={[
              styles.logEntry,
              log.level === 'error' && styles.logError,
              log.level === 'warn' && styles.logWarn,
            ]}
          >
            <Text style={styles.logTime}>
              {log.timestamp.toLocaleTimeString()}
            </Text>
            <Text style={[
              styles.logMessage,
              log.level === 'error' && styles.logMessageError,
              log.level === 'warn' && styles.logMessageWarn,
            ]}>
              {log.message}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  buttonText: {
    fontSize: 24,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    padding: 8,
  },
  logEntry: {
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  logError: {
    backgroundColor: '#7F1D1D',
  },
  logWarn: {
    backgroundColor: '#78350F',
  },
  logTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 12,
    color: '#F9FAFB',
    fontFamily: 'monospace',
  },
  logMessageError: {
    color: '#FCA5A5',
  },
  logMessageWarn: {
    color: '#FCD34D',
  },
});
