import { useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import DurationInput from './DurationInput';
import { inputFocusedStyle } from '../../lib/theme';
import type { SportMetricDefinition } from '../../types';

const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];
const FONT_GRADES = ['5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+'];
const FRENCH_SPORT_GRADES = ['5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a', '9a+', '9b', '9b+', '9c'];

interface Props {
  metric: SportMetricDefinition;
  value: string;
  onChange: (value: string) => void;
  gradeScale?: 'v' | 'font';
  onGradeScaleChange?: (scale: 'v' | 'font') => void;
  maxLevel?: number;
  inputAccessoryViewID?: string;
}

function LevelDotPicker({ value, onChange, max = 10 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const selected = parseInt(value) || 0;
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const disabled = n > max;
        return (
          <Pressable
            key={n}
            onPress={() => !disabled && onChange(String(n))}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: selected === n ? '#6C47FF' : disabled ? '#F9FAFB' : '#F2F3F7',
              borderWidth: selected === n ? 0 : 1,
              borderColor: disabled ? '#F2F3F7' : '#E5E7EB',
              alignItems: 'center', justifyContent: 'center',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            <Text style={{ color: selected === n ? '#FFFFFF' : disabled ? '#C4C4D0' : '#6B7280', fontSize: 14, fontWeight: '600' }}>
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GradeChipRow({ grades, value, onChange }: { grades: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {grades.map((g) => (
        <Pressable
          key={g}
          onPress={() => onChange(value === g ? '' : g)}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            backgroundColor: value === g ? '#6C47FF' : '#F2F3F7',
            borderWidth: value === g ? 0 : 1,
            borderColor: '#E5E7EB',
          }}
        >
          <Text style={{ color: value === g ? '#FFFFFF' : '#6B7280', fontSize: 14, fontWeight: '600' }}>
            {g}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function SportMetricInput({ metric, value, onChange, gradeScale = 'v', onGradeScaleChange, maxLevel = 10, inputAccessoryViewID }: Props) {
  const [focused, setFocused] = useState(false);

  if (metric.inputType === 'number' && metric.unit === '1-10') {
    return <LevelDotPicker value={value} onChange={onChange} max={maxLevel} />;
  }

  if (metric.inputType === 'number') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          style={[
            {
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
              fontSize: 15, color: '#0D0D14', borderWidth: 1, borderColor: '#E5E7EB',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
            },
            focused && inputFocusedStyle,
          ]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
          placeholder={metric.unit ? `e.g. 100` : 'Enter value'}
          placeholderTextColor="#9CA3AF"
        />
        {metric.unit && (
          <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', minWidth: 32 }}>{metric.unit}</Text>
        )}
      </View>
    );
  }

  if (metric.inputType === 'duration') {
    return <DurationInput unit={metric.unit} value={value} onChange={onChange} inputAccessoryViewID={inputAccessoryViewID} />;
  }

  if (metric.inputType === 'grade_v') {
    const activeGrades = gradeScale === 'v' ? V_GRADES : FONT_GRADES;
    return (
      <View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['v', 'font'] as const).map((scale) => (
            <Pressable
              key={scale}
              onPress={() => onGradeScaleChange?.(scale)}
              style={{
                paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
                backgroundColor: gradeScale === scale ? '#6C47FF' : '#F2F3F7',
                borderWidth: gradeScale === scale ? 0 : 1, borderColor: '#E5E7EB',
              }}
            >
              <Text style={{ color: gradeScale === scale ? '#FFFFFF' : '#6B7280', fontSize: 13, fontWeight: '600' }}>
                {scale === 'v' ? 'V-Scale' : 'Font'}
              </Text>
            </Pressable>
          ))}
        </View>
        <GradeChipRow grades={activeGrades} value={value} onChange={onChange} />
      </View>
    );
  }

  if (metric.inputType === 'grade_french_sport') {
    return <GradeChipRow grades={FRENCH_SPORT_GRADES} value={value} onChange={onChange} />;
  }

  return (
    <TextInput
      style={[
        {
          backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
          fontSize: 15, color: '#0D0D14', borderWidth: 1, borderColor: '#E5E7EB',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
        },
        focused && inputFocusedStyle,
      ]}
      value={value}
      onChangeText={onChange}
      returnKeyType="done"
      onSubmitEditing={() => Keyboard.dismiss()}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
      placeholder={`Enter ${metric.label.toLowerCase()}`}
      placeholderTextColor="#9CA3AF"
    />
  );
}
