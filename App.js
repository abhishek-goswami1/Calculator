import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

const DISPLAY_MAX = 14;

const roundLikeCalculator = (value) => {
  if (!Number.isFinite(value)) return 'Error';
  const abs = Math.abs(value);
  if (abs >= 1e14 || (abs > 0 && abs < 1e-8)) {
    return value.toExponential(8).replace('+', '');
  }
  const rounded = Number.parseFloat(value.toFixed(10));
  return `${rounded}`;
};

const formatDisplay = (raw) => {
  if (raw === 'Error') return raw;
  if (raw.includes('e')) return raw;
  const [intPart, decimalPart] = raw.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const joined = decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
  return joined.length > DISPLAY_MAX ? joined.slice(0, DISPLAY_MAX) : joined;
};

const CalcButton = ({ label, onPress, variant = 'dark', flex = 1 }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={[styles.button, styles[`button_${variant}`], { flex }]}
    onPress={() => onPress(label)}
  >
    <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
  </TouchableOpacity>
);

export default function App() {
  const [display, setDisplay] = useState('0');
  const [current, setCurrent] = useState('0');
  const [operand, setOperand] = useState(null);
  const [operator, setOperator] = useState(null);
  const [memory, setMemory] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const labels = useMemo(
    () => ({
      topLeft: ['GT', 'MU', '+/-', '√', 'CE'],
      numbers: [
        ['7', '8', '9'],
        ['4', '5', '6'],
        ['1', '2', '3'],
        ['0', '00', '.'],
      ],
      ops: ['÷', '×', '+', '='],
      right: ['AC', '%', '-', 'MR', 'M+', 'M-', 'MC'],
    }),
    [],
  );

  const compute = (left, right, op) => {
    switch (op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '×':
        return left * right;
      case '÷':
        return right === 0 ? Number.NaN : left / right;
      default:
        return right;
    }
  };

  const updateDisplay = (text) => {
    setDisplay(formatDisplay(text));
    setCurrent(text);
  };

  const applyEquals = () => {
    if (!operator || operand === null) return;
    const result = compute(operand, Number.parseFloat(current), operator);
    const finalText = roundLikeCalculator(result);
    updateDisplay(finalText);
    if (finalText !== 'Error') {
      setGrandTotal((prev) => prev + Number.parseFloat(finalText));
    }
    setOperand(null);
    setOperator(null);
  };

  const onPress = (label) => {
    if (/^\d+$/.test(label)) {
      if (current === '0' || current === 'Error') {
        updateDisplay(label);
      } else {
        updateDisplay(current + label);
      }
      return;
    }

    if (label === '.') {
      if (!current.includes('.')) {
        updateDisplay(current + '.');
      }
      return;
    }

    if (['+', '-', '×', '÷'].includes(label)) {
      if (operator && operand !== null) {
        const chained = compute(operand, Number.parseFloat(current), operator);
        const chainedText = roundLikeCalculator(chained);
        updateDisplay(chainedText);
        setOperand(chainedText === 'Error' ? null : Number.parseFloat(chainedText));
      } else {
        setOperand(Number.parseFloat(current));
      }
      setOperator(label);
      setCurrent('0');
      return;
    }

    if (label === '=') {
      applyEquals();
      return;
    }

    if (label === 'AC') {
      setDisplay('0');
      setCurrent('0');
      setOperand(null);
      setOperator(null);
      return;
    }

    if (label === 'CE') {
      updateDisplay('0');
      return;
    }

    if (label === '%') {
      const value = Number.parseFloat(current) / 100;
      updateDisplay(roundLikeCalculator(value));
      return;
    }

    if (label === '√') {
      const value = Number.parseFloat(current);
      updateDisplay(value < 0 ? 'Error' : roundLikeCalculator(Math.sqrt(value)));
      return;
    }

    if (label === '+/-') {
      if (current === '0') return;
      updateDisplay(current.startsWith('-') ? current.slice(1) : `-${current}`);
      return;
    }

    if (label === 'MU') {
      const value = Number.parseFloat(current);
      const markup = value * 1.1;
      updateDisplay(roundLikeCalculator(markup));
      return;
    }

    if (label === 'GT') {
      updateDisplay(roundLikeCalculator(grandTotal));
      return;
    }

    if (label === 'MR') {
      updateDisplay(roundLikeCalculator(memory));
      return;
    }

    if (label === 'M+') {
      setMemory((prev) => prev + Number.parseFloat(current));
      return;
    }

    if (label === 'M-') {
      setMemory((prev) => prev - Number.parseFloat(current));
      return;
    }

    if (label === 'MC') {
      setMemory(0);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const validKeys = '0123456789';
    const handler = (event) => {
      if (validKeys.includes(event.key)) onPress(event.key);
      else if (event.key === 'Enter') onPress('=');
      else if (event.key === 'Backspace') onPress('CE');
      else if (event.key === 'Escape') onPress('AC');
      else if (event.key === '+') onPress('+');
      else if (event.key === '-') onPress('-');
      else if (event.key === '*') onPress('×');
      else if (event.key === '/') onPress('÷');
      else if (event.key === '%') onPress('%');
      else if (event.key === '.') onPress('.');
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.calculatorBody}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>CITIZEN CT-512</Text>
          <Text style={styles.featureText}>CHECK & CORRECT • AUTO REPLAY</Text>
        </View>

        <View style={styles.displayWrap}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.displayText}>
            {display}
          </Text>
        </View>

        <View style={styles.panelLabelRow}>
          <View style={styles.labelBlue}><Text style={styles.labelBlueText}>CHECK</Text></View>
          <View style={styles.labelGrey}><Text style={styles.labelGreyText}>CORRECT DELETE</Text></View>
          <View style={styles.solarStrip} />
        </View>

        <View style={styles.keypad}>
          <View style={styles.utilityCol}>
            {labels.topLeft.map((key, idx) => (
              <CalcButton key={key} label={key} onPress={onPress} variant={idx === 4 ? 'teal' : 'light'} />
            ))}
          </View>

          <View style={styles.numberPad}>
            {labels.numbers.map((row, rIdx) => (
              <View style={styles.numRow} key={`row-${rIdx}`}>
                {row.map((key) => (
                  <CalcButton key={key} label={key} onPress={onPress} variant="dark" />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.opCol}>
            {labels.ops.map((key, idx) => (
              <CalcButton key={key} label={key} onPress={onPress} variant={idx === 3 ? 'darkLarge' : 'dark'} flex={1} />
            ))}
          </View>

          <View style={styles.memCol}>
            {labels.right.map((key, idx) => (
              <CalcButton
                key={key}
                label={key}
                onPress={onPress}
                variant={idx === 0 ? 'blue' : idx === 1 ? 'dark' : 'dark'}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1f25',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calculatorBody: {
    width: '100%',
    maxWidth: 520,
    aspectRatio: 0.84,
    backgroundColor: '#1f232a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f1115',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brandText: {
    color: '#f1f5f9',
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 15,
  },
  featureText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
  },
  displayWrap: {
    backgroundColor: '#c7d1cb',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#66706d',
    paddingHorizontal: 10,
    paddingVertical: 14,
    marginBottom: 8,
    minHeight: 84,
    justifyContent: 'center',
  },
  displayText: {
    color: '#101314',
    fontSize: 54,
    letterSpacing: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'right',
  },
  panelLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labelBlue: {
    backgroundColor: '#2a7fc6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  labelBlueText: { color: 'white', fontWeight: '700', fontSize: 10 },
  labelGrey: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  labelGreyText: { color: '#e5e7eb', fontWeight: '700', fontSize: 9 },
  solarStrip: {
    flex: 1,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#281611',
    borderWidth: 1,
    borderColor: '#4a2a20',
  },
  keypad: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  utilityCol: { flex: 0.95, gap: 8 },
  numberPad: { flex: 2.6, gap: 8 },
  numRow: { flex: 1, flexDirection: 'row', gap: 8 },
  opCol: { flex: 1, gap: 8 },
  memCol: { flex: 1, gap: 8 },
  button: {
    minHeight: 48,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.38,
    shadowRadius: 2,
    elevation: 2,
  },
  button_dark: {
    backgroundColor: '#2e3340',
    borderColor: '#151922',
  },
  button_darkLarge: {
    backgroundColor: '#2e3340',
    borderColor: '#151922',
  },
  button_light: {
    backgroundColor: '#ddd6d3',
    borderColor: '#8d8a86',
  },
  button_blue: {
    backgroundColor: '#2f9ccf',
    borderColor: '#1e5f7f',
  },
  button_teal: {
    backgroundColor: '#46c2bf',
    borderColor: '#227b78',
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 28,
  },
  buttonText_dark: { color: '#f3f4f6' },
  buttonText_darkLarge: { color: '#f3f4f6', fontSize: 26 },
  buttonText_light: { color: '#111827', fontSize: 21 },
  buttonText_blue: { color: '#f8fafc', fontSize: 20 },
  buttonText_teal: { color: '#0f172a', fontSize: 26 },
});
