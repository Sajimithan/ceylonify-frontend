import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parsePlanDays } from '../lib/routePlan';

type LineKind = 'bullet' | 'meta' | 'travel' | 'section' | 'body';

function stripListPrefix(line: string): string {
  return line.trim().replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s+/, '');
}

function classifyPlanLine(line: string): { kind: LineKind; text: string } {
  const trimmed = line.trim();
  const stripped = stripListPrefix(trimmed);

  if (/^(Tip:|Transport:|Travel:|Meals:|Meal:|Eat at:|Note:)/i.test(trimmed)) {
    return { kind: 'meta', text: trimmed };
  }
  if (/^Travel from/i.test(stripped) || /^Travel to/i.test(stripped)) {
    return { kind: 'travel', text: stripped };
  }
  if (/^(Morning|Afternoon|Evening|Night)$/i.test(trimmed)) {
    return { kind: 'section', text: trimmed };
  }
  if (/^[•\-*]\s*/.test(trimmed) || (/^\d+\.\s+/.test(trimmed) && !/^Day\s+\d+/i.test(trimmed))) {
    return { kind: 'bullet', text: stripped };
  }
  return { kind: 'body', text: trimmed };
}

export function RoutePlanRenderer({ plan }: { plan: string }) {
  const days = parsePlanDays(plan);

  return (
    <View style={styles.wrap}>
      {days.map((day, dayIdx) => (
        <View key={dayIdx} style={styles.dayCard}>
          <View style={styles.dayHeaderPill}>
            <Text style={styles.dayHeaderText}>{day.header}</Text>
          </View>
          {day.lines.map((line, lineIdx) => {
            const { kind, text } = classifyPlanLine(line);

            if (kind === 'meta') {
              return (
                <View key={lineIdx} style={styles.metaRow}>
                  <Text style={styles.metaText}>{text}</Text>
                </View>
              );
            }

            if (kind === 'section') {
              return (
                <Text key={lineIdx} style={styles.sectionText}>{text}</Text>
              );
            }

            if (kind === 'travel') {
              return (
                <View key={lineIdx} style={styles.travelRow}>
                  <Text style={styles.travelText}>{text}</Text>
                </View>
              );
            }

            if (kind === 'bullet') {
              return (
                <View key={lineIdx} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{text}</Text>
                </View>
              );
            }

            return <Text key={lineIdx} style={styles.bodyText}>{text}</Text>;
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  dayHeaderPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#0EA5A4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  dayHeaderText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  sectionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0EA5A4',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 2,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0EA5A4',
    marginTop: 6,
  },
  bulletText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },
  travelRow: {
    marginLeft: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#D1FAE5',
  },
  travelText: {
    fontSize: 11,
    color: '#667085',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  metaRow: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  metaText: { fontSize: 11, color: '#92400E', lineHeight: 16 },
  bodyText: { fontSize: 12, color: '#667085', lineHeight: 18 },
});
