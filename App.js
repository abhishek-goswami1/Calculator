import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  useFonts,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";

const { height } = Dimensions.get("window");
const operators = ["+", "-", "×", "÷", "%"];

export default function App() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [isResult, setIsResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    Inter_400Regular,
    Inter_700Bold,
  });
  if (!fontsLoaded) return null;

  const endsWithOp = (v) => operators.includes(v.slice(-1));

  const press = (value) => {
    if (value === "AC") { clear(); return; }
    if (value === "=") { calculate(); return; }
    if (value === "check") { setHistoryVisible(true); return; }
    if (value === "DEL") {
      if (expression.length <= 1) { setExpression("0"); setDisplay("0"); }
      else { const ne = expression.slice(0, -1); setExpression(ne); setDisplay(ne.slice(-1) || "0"); }
      return;
    }
    if (["gt","mu","mrc","m_plus","m_minus","plusminus","sqrt","gst"].includes(value)) return;
    if (display.length >= 14 && !operators.includes(value)) return;

    if (isResult && !operators.includes(value)) {
      const nv = value === "." ? "0." : value;
      setExpression(nv); setDisplay(nv); setIsResult(false); return;
    }
    if (operators.includes(value)) {
      if (expression === "" && value !== "-") return;
      if (endsWithOp(expression)) setExpression(expression.slice(0, -1) + value);
      else setExpression(expression + value);
      setDisplay(value); return;
    }
    if (value === ".") {
      if (expression === "" || endsWithOp(expression)) { setExpression(expression + "0."); setDisplay("0."); return; }
      const last = expression.split(/[\+\-\×\÷\%]/).pop();
      if (!last.includes(".")) { setExpression(expression + "."); setDisplay(endsWithOp(display) ? "0." : display + "."); }
      return;
    }
    if (value === "00") {
      if (!expression || endsWithOp(expression) || display === "0") { setExpression("0"); setDisplay("0"); }
      else { setExpression(expression + "00"); setDisplay(display + "00"); }
      return;
    }
    const nd = display === "0" || operators.includes(display) ? value : display + value;
    const ne = expression === "0" ? value : expression + value;
    setExpression(ne); setDisplay(nd);
  };

  const calculate = () => {
    if (!expression) return;
    let expr = expression.replace(/×/g, "*").replace(/÷/g, "/");
    if (endsWithOp(expr)) expr = expr.slice(0, -1);
    try {
      const result = eval(expr);
      if (typeof result === "number" && isFinite(result)) {
        const fmt = parseFloat(result.toFixed(10)).toString();
        const exStr = expression.replace(/\*/g, "×").replace(/\//g, "÷");
        const now = new Date();
        setHistory(prev => [...prev, {
          time: `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          equation: `${exStr} = ${fmt}`,
        }]);
        setDisplay(fmt); setExpression(fmt);
      } else { setDisplay("Error"); setExpression(""); }
    } catch { setDisplay("Error"); setExpression(""); }
    setIsResult(true);
  };

  const clear = () => { setDisplay("0"); setExpression(""); setIsResult(false); };

  const downloadReceipt = async () => {
    if (!history.length) { Alert.alert("No History", "No calculations yet."); return; }
    try {
      const content = "CITIZEN CT-512\n=== RECEIPT ===\n\n" + history.map(h => `[${h.time}]\n${h.equation}`).join("\n\n");
      if (Platform.OS === "android") {
        const { StorageAccessFramework } = FileSystem;
        const p = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (p.granted) {
          const uri = await StorageAccessFramework.createFileAsync(p.directoryUri, "citizen-receipt.txt", "text/plain");
          await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
          Alert.alert("✓ Saved", "Receipt saved to your folder."); return;
        }
        Alert.alert("Permission Denied"); return;
      }
      const uri = FileSystem.cacheDirectory + "citizen-receipt.txt";
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/plain" });
    } catch { Alert.alert("Error", "Could not save."); }
  };

  // Simple button wrapper
  const Btn = ({ label, onPress, bg, color, flex = 1, fz = 20 }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[s.btn, { flex, backgroundColor: bg }]}
    >
      <Text style={[s.btnTxt, { color, fontSize: fz }]} adjustsFontSizeToFit numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />

      {/* ── History Modal (slide-up sheet) ── */}
      <Modal visible={historyVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>CITIZEN CT-512</Text>
            <Text style={s.sheetSub}>— RECEIPT —</Text>
            <ScrollView style={{ maxHeight: height * 0.42, marginBottom: 20 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {!history.length
                ? <Text style={s.emptyTxt}>No calculations yet.</Text>
                : [...history].reverse().map((item, i) => (
                  <View key={i} style={s.histRow}>
                    <Text style={s.histTime}>{item.time}</Text>
                    <Text style={s.histEq}>{item.equation}</Text>
                  </View>
                ))}
            </ScrollView>
            <View style={s.sheetFoot}>
              <TouchableOpacity onPress={() => setHistory([])} style={s.fBtnRed} activeOpacity={0.7}><Text style={s.fTxtRed}>CLEAR</Text></TouchableOpacity>
              <TouchableOpacity onPress={downloadReceipt}     style={s.fBtnTeal} activeOpacity={0.7}><Text style={s.fTxtW}>SAVE</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setHistoryVisible(false)} style={s.fBtnGrey} activeOpacity={0.7}><Text style={s.fTxtW}>CLOSE</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Calculator Body ── */}
      <View style={s.body}>

        {/* Brand bar */}
        <View style={s.brandBar}>
          <Text style={s.brandName}>CITIZEN</Text>
          <Text style={s.brandMeta}>CT-512  ·  112 STEPS CHECK</Text>
        </View>

        {/* LCD */}
        <View style={s.lcdBezel}>
          <View style={s.lcdScreen}>
            <Text style={s.lcdStep}>01</Text>
            <Text style={s.lcdNum} numberOfLines={1} adjustsFontSizeToFit>{display}</Text>
          </View>
        </View>

        {/* Sub-panel row: CHECK | CORRECT+DEL | Solar */}
        <View style={s.subRow}>
          <TouchableOpacity style={s.checkBtn} onPress={() => press("check")} activeOpacity={0.75}>
            <Text style={s.checkTxt}>CHECK  ➔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.correctBtn} onPress={() => press("DEL")} activeOpacity={0.75}>
            <Text style={s.correctTxt}>CORRECT / DEL</Text>
          </TouchableOpacity>
          <View style={s.solar}>
            {[0,1,2,3].map(i => <View key={i} style={s.solarCell}/>)}
          </View>
        </View>
        <Text style={s.stepsLbl}>112 STEPS CHECK</Text>

        {/* CE | Settings | ON/AC row */}
        <View style={s.acRow}>
          <Btn label="CE"  onPress={() => press("AC")} bg="#1e1e1e" color="#11bcb0" fz={16} />
          <Btn label="Menu"   onPress={() => {}}           bg="#2a2a2a" color="#aaa"    fz={20} />
          <Btn label="ON / AC" onPress={() => press("AC")} bg="#00b894" color="#fff" fz={15} />
        </View>

        {/* ─── MAIN KEYPAD ───────────────────────────────────────
          Layout matches Citizen CT-512 + reference image 2:

          LEFT COL (narrow, light grey):
            MR | M+ | M- | +/- | √x | GT | MU   (7 buttons)

          RIGHT 4 COLS × 5 rows (with + spanning rows 3+4):
            Col-A:  GST  |  7  |  4  |  1  |  0
            Col-B:   %   |  8  |  5  |  2  |  00
            Col-C:   ÷   |  9  |  6  |  3  |  .
            Col-D:   ×   |  -  | [+tall]   |  =
        ──────────────────────────────────────────────────────── */}
        <View style={s.keypad}>

          {/* Left memory column — 7 light-grey buttons */}
          <View style={s.memCol}>
            <Btn label="MR"  onPress={() => press("mrc")}      bg="#d2cec8" color="#1a1a1a" fz={13}/>
            <Btn label="M+"  onPress={() => press("m_plus")}   bg="#d2cec8" color="#1a1a1a" fz={13}/>
            <Btn label="M−"  onPress={() => press("m_minus")}  bg="#d2cec8" color="#1a1a1a" fz={13}/>
            <Btn label="+/−" onPress={() => press("plusminus")} bg="#d2cec8" color="#1a1a1a" fz={12}/>
            <Btn label="√x"  onPress={() => press("sqrt")}     bg="#d2cec8" color="#1a1a1a" fz={13}/>
            <Btn label="GT"  onPress={() => press("gt")}       bg="#d2cec8" color="#1a1a1a" fz={13}/>
            <Btn label="MU"  onPress={() => press("mu")}       bg="#d2cec8" color="#1a1a1a" fz={13}/>
          </View>

          {/* Col-A: GST 7 4 1 0 */}
          <View style={s.col}>
            <Btn label="GST" onPress={() => press("gst")} bg="#2a2a2a" color="#ccc" fz={13}/>
            <Btn label="7"   onPress={() => press("7")}   bg="#212121" color="#eee"/>
            <Btn label="4"   onPress={() => press("4")}   bg="#212121" color="#eee"/>
            <Btn label="1"   onPress={() => press("1")}   bg="#212121" color="#eee"/>
            <Btn label="0"   onPress={() => press("0")}   bg="#212121" color="#eee"/>
          </View>

          {/* Col-B: % 8 5 2 00 */}
          <View style={s.col}>
            <Btn label="%"   onPress={() => press("%")}  bg="#2a2a2a" color="#ccc"/>
            <Btn label="8"   onPress={() => press("8")}  bg="#212121" color="#eee"/>
            <Btn label="5"   onPress={() => press("5")}  bg="#212121" color="#eee"/>
            <Btn label="2"   onPress={() => press("2")}  bg="#212121" color="#eee"/>
            <Btn label="00"  onPress={() => press("00")} bg="#212121" color="#eee"/>
          </View>

          {/* Col-C: ÷ 9 6 3 . */}
          <View style={s.col}>
            <Btn label="÷"   onPress={() => press("÷")}  bg="#2a2a2a" color="#ddd"/>
            <Btn label="9"   onPress={() => press("9")}  bg="#212121" color="#eee"/>
            <Btn label="6"   onPress={() => press("6")}  bg="#212121" color="#eee"/>
            <Btn label="3"   onPress={() => press("3")}  bg="#212121" color="#eee"/>
            <Btn label="·"   onPress={() => press(".")}  bg="#212121" color="#eee"/>
          </View>

          {/* Col-D: × − [+tall flex:2] = */}
          <View style={s.col}>
            <Btn label="×" onPress={() => press("×")} bg="#2a2a2a" color="#ddd"/>
            <Btn label="−" onPress={() => press("-")} bg="#2a2a2a" color="#ddd"/>
            {/* Tall + button takes flex:2 (same as 2 normal rows) */}
            <Btn label="+" onPress={() => press("+")} bg="#2a2a2a" color="#ddd" flex={2} fz={28}/>
            <Btn label="=" onPress={() => press("=")} bg="#00b894" color="#fff" fz={26}/>
          </View>

        </View>

        {/* Footer */}
        <View style={s.footer}><Text style={s.footerTxt}>MADE BY ABHISHEK</Text></View>

      </View>
    </SafeAreaView>
  );
}

const GAP = 5;

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  body: { flex: 1, backgroundColor: "#161616" },

  // Brand bar
  brandBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 5, backgroundColor: "#0d0d0d",
  },
  brandName: { fontFamily: "SpaceGrotesk_500Medium", fontSize: 17, color: "#11bcb0", letterSpacing: 3 },
  brandMeta: { fontFamily: "Inter_400Regular", fontSize: 8, color: "#3a3a3a", letterSpacing: 1.5 },

  // LCD
  lcdBezel: { backgroundColor: "#090909", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  lcdScreen: {
    backgroundColor: "#c0c9a6",
    borderRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
    height: 200,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    position: "relative",
  },
  lcdStep: { position: "absolute", top: 7, left: 10, fontFamily: "SpaceGrotesk_500Medium", fontSize: 13, color: "#5a6050" },
  lcdNum: { fontFamily: "SpaceGrotesk_500Medium", fontSize: 56, color: "#1b2119", letterSpacing: -1 },

  // Sub row: CHECK | CORRECT/DEL | Solar
  subRow: {
    flexDirection: "row", alignItems: "stretch",
    paddingHorizontal: 10, paddingTop: 6, gap: GAP,
  },
  checkBtn: {
    flex: 1.1, backgroundColor: "#4170c4", borderRadius: 3,
    paddingVertical: 8, justifyContent: "center", alignItems: "center",
  },
  checkTxt: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  correctBtn: {
    flex: 1.3, backgroundColor: "#252525", borderRadius: 3,
    paddingVertical: 8, justifyContent: "center", alignItems: "center",
  },
  correctTxt: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#888" },
  solar: { width: 66, flexDirection: "row", borderRadius: 3, overflow: "hidden", backgroundColor: "#221810" },
  solarCell: { flex: 1, borderRightWidth: 1, borderRightColor: "#3a2416" },

  stepsLbl: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#c9a85c", paddingHorizontal: 10, paddingTop: 4, paddingBottom: 2, letterSpacing: 1 },

  // ON/AC row
  acRow: { flexDirection: "row", paddingHorizontal: 10, paddingBottom: 5, height: 42, gap: GAP },

  // Keypad
  keypad: { flex: 1, flexDirection: "row", paddingHorizontal: 10, paddingBottom: 8, gap: GAP },

  memCol: { width: 54, gap: GAP },
  col:    { flex: 1, gap: GAP },

  // Generic button
  btn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  btnTxt: { fontFamily: "Inter_700Bold", textAlign: "center" },

  // Footer
  footer: { alignItems: "center", paddingVertical: 5, backgroundColor: "#0d0d0d" },
  footerTxt: { fontFamily: "Inter_400Regular", fontSize: 8, color: "#2a2a2a", letterSpacing: 2 },

  // ── History Modal ──
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#181818",
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: height * 0.78,
    padding: 24,
    borderTopWidth: 1, borderTopColor: "#252525",
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#333", alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontFamily: "SpaceGrotesk_500Medium", fontSize: 22, color: "#11bcb0", textAlign: "center", letterSpacing: 3 },
  sheetSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#3a3a3a", textAlign: "center", letterSpacing: 2, marginTop: 3, marginBottom: 18 },
  emptyTxt: { fontFamily: "Inter_400Regular", fontSize: 15, color: "#2e2e2e", textAlign: "center", paddingVertical: 28 },
  histRow: { borderBottomWidth: 1, borderBottomColor: "#222", paddingVertical: 12, alignItems: "flex-end" },
  histTime: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#3a3a3a", letterSpacing: 1, marginBottom: 3 },
  histEq: { fontFamily: "SpaceGrotesk_500Medium", fontSize: 20, color: "#ddd" },
  sheetFoot: { flexDirection: "row", gap: 10 },
  fBtnRed:  { flex: 1, paddingVertical: 13, borderRadius: 8, borderWidth: 1.5, borderColor: "#e11d48", alignItems: "center" },
  fBtnTeal: { flex: 1, paddingVertical: 13, borderRadius: 8, backgroundColor: "#11bcb0", alignItems: "center" },
  fBtnGrey: { flex: 1, paddingVertical: 13, borderRadius: 8, backgroundColor: "#222", alignItems: "center" },
  fTxtRed: { fontFamily: "Inter_700Bold", color: "#e11d48", fontSize: 12 },
  fTxtW:   { fontFamily: "Inter_700Bold", color: "#fff", fontSize: 12 },
});
