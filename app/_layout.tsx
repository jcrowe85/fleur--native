import '../global.css';  
import { Slot, Stack } from 'expo-router';
import { SafeAreaProvider } from "react-native-safe-area-context";
import 'react-native-reanimated';
export default function Root() { return <SafeAreaProvider><Slot /></SafeAreaProvider>}

