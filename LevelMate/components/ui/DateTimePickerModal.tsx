import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const C = {
  overlay: 'rgba(13,13,20,0.55)',
  card: '#FFFFFF',
  bg: '#F8F9FC',
  text: '#0D0D14',
  sub: '#6B7280',
  dim: '#D1D5DB',
  border: '#E5E7EB',
  primary: '#6C47FF',
  primaryBg: '#EDE9FF',
  todayBorder: '#6C47FF',
};

const ITEM_H = 52;
const VISIBLE = 5;
const PAD = 2; // Math.floor(VISIBLE / 2)

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function gridCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function roundMin(minutes: number) {
  return Math.round(minutes / 5) * 5 % 60;
}

function WheelPicker({
  items,
  selected,
  onSelect,
  label,
  scrollKey,
}: {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
  label: string;
  scrollKey: number;
}) {
  const ref = useRef<ScrollView>(null);
  const paddedItems = [...Array(PAD).fill(-1), ...items, ...Array(PAD).fill(-1)];

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) setTimeout(() => ref.current?.scrollTo({ y: idx * ITEM_H, animated: false }), 80);
  }, [scrollKey]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIdx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const idx = Math.max(0, Math.min(items.length - 1, rawIdx));
    onSelect(items[idx]);
  };

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ height: VISIBLE * ITEM_H, overflow: 'hidden', width: '100%' }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PAD * ITEM_H,
            height: ITEM_H,
            left: 8,
            right: 8,
            backgroundColor: C.primaryBg,
            borderRadius: 12,
          }}
        />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          onMomentumScrollEnd={onMomentumEnd}
        >
          {paddedItems.map((item, i) => {
            const real = item !== -1;
            const isSel = real && item === selected;
            return (
              <View key={i} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
                {real && (
                  <Text
                    style={{
                      color: isSel ? C.primary : C.sub,
                      fontSize: isSel ? 24 : 18,
                      fontWeight: isSel ? '700' : '400',
                    }}
                  >
                    {String(item).padStart(2, '0')}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
      <Text
        style={{
          color: C.sub,
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  value: Date | null;
  minimumDate?: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}

export default function DateTimePickerModal({ visible, value, minimumDate, onChange, onClose }: Props) {
  const [step, setStep] = useState<'date' | 'time'>('date');
  const [workDate, setWorkDate] = useState<Date>(() => value ?? new Date(Date.now() + 3600000));
  const [viewYear, setViewYear] = useState(() => workDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => workDate.getMonth());
  const [scrollKey, setScrollKey] = useState(0);

  useEffect(() => {
    if (visible) {
      const d = value ?? new Date(Date.now() + 3600000);
      const rounded = new Date(d);
      rounded.setMinutes(roundMin(d.getMinutes()), 0, 0);
      setWorkDate(rounded);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setStep('date');
      setScrollKey(k => k + 1);
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const today = new Date();

  const isDayDisabled = (day: number) => {
    if (!minimumDate) return false;
    const d = new Date(viewYear, viewMonth, day);
    const min = new Date(minimumDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  };

  const isDaySelected = (day: number) =>
    workDate.getFullYear() === viewYear &&
    workDate.getMonth() === viewMonth &&
    workDate.getDate() === day;

  const isDayToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const handleDayPress = (day: number) => {
    if (isDayDisabled(day)) return;
    setWorkDate(prev => {
      const d = new Date(prev);
      d.setFullYear(viewYear, viewMonth, day);
      return d;
    });
  };

  const handleNextStep = () => {
    setScrollKey(k => k + 1);
    setStep('time');
  };

  const handleHourChange = (h: number) => {
    setWorkDate(prev => {
      const d = new Date(prev);
      d.setHours(h);
      return d;
    });
  };

  const handleMinuteChange = (m: number) => {
    setWorkDate(prev => {
      const d = new Date(prev);
      d.setMinutes(m, 0, 0);
      return d;
    });
  };

  const handleConfirm = () => {
    onChange(workDate);
    onClose();
  };

  const cells = gridCells(viewYear, viewMonth);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View
          style={{
            backgroundColor: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 36,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, marginBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.dim }} />
          </View>

          {/* Header bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            {step === 'time' ? (
              <Pressable onPress={() => setStep('date')}>
                <Text style={{ color: C.primary, fontSize: 16 }}>‹ Back</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onClose}>
                <Text style={{ color: C.sub, fontSize: 16 }}>Cancel</Text>
              </Pressable>
            )}

            <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>
              {step === 'date' ? 'Select Date' : 'Select Time'}
            </Text>

            {step === 'date' ? (
              <Pressable onPress={handleNextStep}>
                <Text style={{ color: C.primary, fontSize: 16, fontWeight: '600' }}>Next</Text>
              </Pressable>
            ) : (
              <Pressable onPress={handleConfirm}>
                <Text style={{ color: C.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
              </Pressable>
            )}
          </View>

          {step === 'date' ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {/* Month navigation */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingHorizontal: 4,
                }}
              >
                <Pressable
                  onPress={prevMonth}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: C.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 20, lineHeight: 22 }}>‹</Text>
                </Pressable>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </Text>
                <Pressable
                  onPress={nextMonth}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: C.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 20, lineHeight: 22 }}>›</Text>
                </Pressable>
              </View>

              {/* Day-of-week headers */}
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                {DOW.map(d => (
                  <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={{ color: C.sub, fontSize: 12, fontWeight: '600' }}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={{ marginBottom: 8 }}>
                {Array.from({ length: cells.length / 7 }, (_, row) => (
                  <View key={row} style={{ flexDirection: 'row' }}>
                    {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                      if (day === null) {
                        return <View key={col} style={{ flex: 1, height: 44 }} />;
                      }
                      const disabled = isDayDisabled(day);
                      const selected = isDaySelected(day);
                      const isT = isDayToday(day);
                      return (
                        <Pressable
                          key={col}
                          onPress={() => !disabled && handleDayPress(day)}
                          style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: selected ? C.primary : 'transparent',
                              borderWidth: isT && !selected ? 1.5 : 0,
                              borderColor: C.todayBorder,
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? '#FFFFFF' : disabled ? C.dim : C.text,
                                fontSize: 15,
                                fontWeight: selected ? '600' : '400',
                              }}
                            >
                              {day}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 8 }}>
              {/* Large time preview */}
              <Text
                style={{
                  textAlign: 'center',
                  color: C.text,
                  fontSize: 48,
                  fontWeight: '700',
                  letterSpacing: 3,
                  marginBottom: 20,
                }}
              >
                {String(workDate.getHours()).padStart(2, '0')}
                <Text style={{ color: C.dim }}>:</Text>
                {String(workDate.getMinutes()).padStart(2, '0')}
              </Text>

              {/* Wheel pickers */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <WheelPicker
                  items={HOURS}
                  selected={workDate.getHours()}
                  onSelect={handleHourChange}
                  label="Hour"
                  scrollKey={scrollKey}
                />
                <Text
                  style={{
                    color: C.dim,
                    fontSize: 36,
                    fontWeight: '200',
                    marginHorizontal: 4,
                    marginBottom: 28,
                  }}
                >
                  :
                </Text>
                <WheelPicker
                  items={MINUTES}
                  selected={workDate.getMinutes()}
                  onSelect={handleMinuteChange}
                  label="Minute"
                  scrollKey={scrollKey}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
