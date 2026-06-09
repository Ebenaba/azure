import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * StatusTimeline
 * @param {Array} steps - [{icon, label, completed, active, timestamp}]
 */
const StatusTimeline = ({ steps = [] }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const nodeColor = step.completed
          ? colors.primary
          : step.active
          ? colors.accent
          : colors.border;

        const lineColor = step.completed ? colors.primary : colors.border;

        return (
          <View key={step.status || step.label || index} style={styles.step}>
            {/* Line + Node column */}
            <View style={styles.nodeColumn}>
              {/* Top line */}
              {index > 0 && (
                <View
                  style={[
                    styles.lineSegment,
                    { backgroundColor: steps[index - 1].completed ? colors.primary : colors.border },
                  ]}
                />
              )}

              {/* Node */}
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: step.active ? colors.accent : step.completed ? colors.primary : colors.surface,
                    borderColor: nodeColor,
                  },
                ]}
              >
                {step.completed ? (
                  <Text style={styles.nodeCheck}>✓</Text>
                ) : step.active ? (
                  <Text style={styles.nodeIcon}>{step.icon}</Text>
                ) : (
                  <View style={[styles.nodeEmpty, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Bottom line */}
              {!isLast && (
                <View style={[styles.lineSegmentBottom, { backgroundColor: lineColor }]} />
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  {
                    color: step.active
                      ? colors.textPrimary
                      : step.completed
                      ? colors.textPrimary
                      : colors.textHint,
                    fontWeight: step.active ? '800' : step.completed ? '600' : '400',
                  },
                ]}
              >
                {step.icon && !step.completed && !step.active ? `${step.icon} ` : ''}{step.label}
              </Text>
              {step.timestamp && (
                <Text style={[styles.timestamp, { color: colors.textHint }]}>
                  {formatTimestamp(step.timestamp)}
                </Text>
              )}
              {step.active && (
                <View style={[styles.activePill, { backgroundColor: colors.accentFaded }]}>
                  <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.activeText, { color: colors.accentDark }]}>In Progress</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const formatTimestamp = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate?.() || (ts instanceof Date ? ts : new Date(ts));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: 'numeric',
    month: 'short',
  });
};

const NODE_SIZE = 36;
const LINE_WIDTH = 2;

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  step: {
    flexDirection: 'row',
    gap: 16,
    minHeight: 60,
  },
  nodeColumn: {
    width: NODE_SIZE,
    alignItems: 'center',
  },
  lineSegment: {
    width: LINE_WIDTH,
    flex: 0,
    height: 16,
    marginBottom: 0,
  },
  lineSegmentBottom: {
    width: LINE_WIDTH,
    flex: 1,
    minHeight: 20,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  nodeIcon: { fontSize: 18 },
  nodeEmpty: { width: 10, height: 10, borderRadius: 5 },
  content: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 16,
  },
  label: { fontSize: 15 },
  timestamp: { fontSize: 12, marginTop: 2 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 5,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 12, fontWeight: '700' },
});

export default StatusTimeline;
